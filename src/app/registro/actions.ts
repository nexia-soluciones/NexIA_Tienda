"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export interface RegistroResult {
  ok: boolean;
  slug?: string;
  tenantId?: string;
  error?: string;
}

// Crea el tenant y asigna el rol de dueño al usuario recién registrado.
// Server Action (no API route): Traefik en EasyPanel bloquea POST a /api/ con 405.
export async function registrarTienda(input: {
  storeName: string;
  slug?: string;
  userId: string;
}): Promise<RegistroResult> {
  try {
    const { storeName, slug: rawSlug, userId } = input;
    if (!storeName || !userId) return { ok: false, error: "storeName y userId son requeridos." };

    const slug = slugify(rawSlug || storeName);
    if (!slug || slug.length < 3) {
      return { ok: false, error: "El identificador de tienda debe tener al menos 3 caracteres." };
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .schema("nexia_tienda")
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();
    if (existing) {
      return { ok: false, error: `El identificador "${slug}" ya está en uso. Elige otro nombre.` };
    }

    const { data: tenant, error: tenantError } = await admin
      .schema("nexia_tienda")
      .from("tenants")
      .insert({ name: storeName, slug })
      .select("id, slug")
      .single();
    if (tenantError || !tenant) {
      return { ok: false, error: "Error al crear la tienda. Intenta de nuevo." };
    }

    const { error: roleError } = await admin
      .schema("nexia_tienda")
      .from("user_tenants")
      .insert({ user_id: userId, tenant_id: tenant.id, role: "dueno" });
    if (roleError) {
      await admin.schema("nexia_tienda").from("tenants").delete().eq("id", tenant.id);
      return { ok: false, error: "Error al asignar permisos. Intenta de nuevo." };
    }

    return { ok: true, slug: tenant.slug, tenantId: tenant.id };
  } catch (e) {
    console.error("[registrarTienda]", e);
    return { ok: false, error: "Error inesperado al crear la tienda." };
  }
}
