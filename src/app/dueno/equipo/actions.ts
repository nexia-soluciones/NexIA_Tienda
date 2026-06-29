"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Server Actions del panel de equipo.
// Traefik en EasyPanel bloquea POST a /api/ con 405, por eso la lógica
// de invitar / procesar baja vive en Server Actions (corren en server).

export interface InvitarResult {
  ok: boolean;
  error?: string;
  link?: string | null;
}

// Genera un link de invitación sin necesitar SMTP configurado.
// El dueño puede compartir el link manualmente (WhatsApp, etc.)
export async function invitarUsuario(input: {
  email: string;
  role: string;
}): Promise<InvitarResult> {
  try {
    const { email, role } = input;

    if (!email || !role) {
      return { ok: false, error: "Email y rol son requeridos." };
    }

    if (!["cliente", "vendedor", "empleado"].includes(role)) {
      return { ok: false, error: "Rol inválido. Solo se permite: cliente, vendedor, empleado." };
    }

    const admin = createAdminClient();
    let tenantId: string;
    let invitedBy: string | null = null;

    if (process.env.NODE_ENV === "development") {
      tenantId = process.env.DEV_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { ok: false, error: "No autenticado." };
      }

      const { data: ut } = await supabase
        .schema("nexia_tienda")
        .from("user_tenants")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .in("role", ["dueno", "administrador"])
        .limit(1)
        .single();

      if (!ut) {
        return { ok: false, error: "No tienes permiso para invitar usuarios." };
      }

      tenantId = ut.tenant_id;
      invitedBy = user.id;
    }

    // Verificar que no exista ya una invitación pendiente
    const { data: existing } = await admin
      .schema("nexia_tienda")
      .from("invitations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .eq("status", "pendiente")
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "Ya existe una invitación pendiente para este correo." };
    }

    // Generar el link de invitación (no requiere SMTP)
    const h = await headers();
    const origin = h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : "");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
    const redirectTo = `${appUrl}/auth/callback?next=/auth/aceptar-invitacion`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: email.toLowerCase(),
      options: { redirectTo },
    });

    if (linkError) {
      return { ok: false, error: "No se pudo generar el link de invitación: " + linkError.message };
    }

    // Guardar la invitación en la base de datos
    const { error: inviteDbError } = await admin
      .schema("nexia_tienda")
      .from("invitations")
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        role,
        ...(invitedBy ? { invited_by: invitedBy } : {}),
      });

    if (inviteDbError) {
      return { ok: false, error: "Error al guardar la invitación: " + inviteDbError.message };
    }

    return { ok: true, link: linkData.properties?.action_link ?? null };
  } catch (e) {
    console.error("[invitarUsuario]", e);
    return { ok: false, error: "Error inesperado al generar la invitación." };
  }
}

export interface ProcesarBajaResult {
  ok: boolean;
  error?: string;
}

// El dueño/admin aprueba o rechaza una solicitud de baja.
export async function procesarBaja(input: {
  requestId: string;
  action: "aprobar" | "rechazar";
}): Promise<ProcesarBajaResult> {
  try {
    const { requestId, action } = input;

    if (!requestId || !["aprobar", "rechazar"].includes(action)) {
      return { ok: false, error: "requestId y action (aprobar|rechazar) son requeridos." };
    }

    const admin = createAdminClient();
    let processedBy: string;
    let tenantId: string;

    if (process.env.NODE_ENV === "development") {
      tenantId = process.env.DEV_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
      processedBy = "00000000-0000-0000-0000-000000000001";
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { ok: false, error: "No autenticado." };
      }

      const { data: ut } = await supabase
        .schema("nexia_tienda")
        .from("user_tenants")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .in("role", ["dueno", "administrador"])
        .limit(1)
        .single();

      if (!ut) {
        return { ok: false, error: "No tienes permiso para procesar solicitudes de baja." };
      }

      tenantId = ut.tenant_id;
      processedBy = user.id;
    }

    // Obtener la solicitud
    const { data: request } = await admin
      .schema("nexia_tienda")
      .from("removal_requests")
      .select("id, target_email, status, invitation_id")
      .eq("id", requestId)
      .eq("tenant_id", tenantId)
      .single();

    if (!request) {
      return { ok: false, error: "Solicitud no encontrada." };
    }

    if (request.status !== "pendiente") {
      return { ok: false, error: "Esta solicitud ya fue procesada." };
    }

    // Actualizar el estado de la solicitud
    const newStatus = action === "aprobar" ? "aprobada" : "rechazada";

    const { error: updateError } = await admin
      .schema("nexia_tienda")
      .from("removal_requests")
      .update({ status: newStatus, processed_by: processedBy })
      .eq("id", requestId);

    if (updateError) {
      return { ok: false, error: "Error al procesar la solicitud: " + updateError.message };
    }

    // Si se aprueba, eliminar al usuario del tenant
    if (action === "aprobar") {
      // Buscar el user_id por email
      const { data: { users } } = await admin.auth.admin.listUsers();
      const targetUser = users.find((u) => u.email === request.target_email);

      if (targetUser) {
        // Eliminar de user_tenants
        await admin
          .schema("nexia_tienda")
          .from("user_tenants")
          .delete()
          .eq("user_id", targetUser.id)
          .eq("tenant_id", tenantId);
      }

      // Marcar la invitación como expirada
      if (request.invitation_id) {
        await admin
          .schema("nexia_tienda")
          .from("invitations")
          .update({ status: "expirada" })
          .eq("id", request.invitation_id);
      }
    }

    return { ok: true };
  } catch (e) {
    console.error("[procesarBaja]", e);
    return { ok: false, error: "Error inesperado al procesar la solicitud." };
  }
}
