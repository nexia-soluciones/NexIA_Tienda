"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Server Action de configuración de marca.
// Traefik en EasyPanel bloquea POST a /api/ con 405, por eso la escritura
// (con SERVICE_ROLE) vive en una Server Action que corre en el server.

export interface GuardarMarcaInput {
  logoUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  tagline: string | null;
}

export interface GuardarMarcaResult {
  ok: boolean;
  error?: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Resuelve el tenant del dueño autenticado (o el de desarrollo).
async function resolverTenantId(): Promise<
  { ok: true; tenantId: string; slug: string | null } | { ok: false; error: string }
> {
  if (process.env.NODE_ENV === "development") {
    const tenantId = process.env.DEV_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
    const admin = createAdminClient();
    const { data: tenant } = await admin
      .schema("nexia_tienda")
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .single();
    return { ok: true, tenantId, slug: tenant?.slug ?? null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { data: ut } = await supabase
    .schema("nexia_tienda")
    .from("user_tenants")
    .select("tenant_id, role, tenants ( slug )")
    .eq("user_id", user.id)
    .in("role", ["dueno", "administrador"])
    .limit(1)
    .single();

  if (!ut) return { ok: false, error: "No tienes permiso para configurar la marca." };

  const slug = (ut.tenants as unknown as { slug: string } | null)?.slug ?? null;
  return { ok: true, tenantId: ut.tenant_id, slug };
}

export async function guardarMarca(
  input: GuardarMarcaInput
): Promise<GuardarMarcaResult> {
  try {
    const colorPrimary = (input.colorPrimary || "").trim();
    const colorAccent = (input.colorAccent || "").trim();

    if (!HEX_RE.test(colorPrimary)) {
      return { ok: false, error: "El color primario no es un hex válido (ej. #16a34a)." };
    }
    if (!HEX_RE.test(colorAccent)) {
      return { ok: false, error: "El color de acento no es un hex válido (ej. #0ea5e9)." };
    }

    const tenant = await resolverTenantId();
    if (!tenant.ok) return { ok: false, error: tenant.error };

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .schema("nexia_tienda")
      .from("tenants")
      .update({
        logo_url: input.logoUrl?.trim() || null,
        color_primary: colorPrimary,
        color_accent: colorAccent,
        tagline: input.tagline?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenant.tenantId);

    if (updateError) {
      return { ok: false, error: "Error al guardar: " + updateError.message };
    }

    revalidatePath("/dueno/configuracion");
    if (tenant.slug) revalidatePath(`/tienda/${tenant.slug}`);

    return { ok: true };
  } catch (e) {
    console.error("[guardarMarca]", e);
    return { ok: false, error: "Error inesperado al guardar la marca." };
  }
}
