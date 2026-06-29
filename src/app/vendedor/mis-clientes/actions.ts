"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Server Action: el vendedor solicita al dueño dar de baja a un usuario que él invitó.
// Traefik en EasyPanel bloquea POST a /api/ con 405, por eso la lógica vive aquí.

export interface SolicitarBajaResult {
  ok: boolean;
  error?: string;
}

export async function solicitarBaja(input: {
  invitationId: string;
  reason?: string;
}): Promise<SolicitarBajaResult> {
  try {
    const { invitationId, reason } = input;

    if (!invitationId) {
      return { ok: false, error: "invitationId es requerido." };
    }

    const admin = createAdminClient();
    let requestedBy: string;
    let tenantId: string;

    if (process.env.NODE_ENV === "development") {
      tenantId = process.env.DEV_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
      // En dev usamos un UUID fijo como vendedor
      requestedBy = "00000000-0000-0000-0000-000000000099";
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
        .limit(1)
        .single();

      if (!ut) {
        return { ok: false, error: "Usuario sin tenant." };
      }

      tenantId = ut.tenant_id;
      requestedBy = user.id;
    }

    // Verificar que la invitación exista, pertenezca al tenant y fue enviada por este vendedor
    const { data: invitation } = await admin
      .schema("nexia_tienda")
      .from("invitations")
      .select("id, email, invited_by, status")
      .eq("id", invitationId)
      .eq("tenant_id", tenantId)
      .single();

    if (!invitation) {
      return { ok: false, error: "Invitación no encontrada." };
    }

    // En producción verificar que la invitación fue enviada por este vendedor
    if (process.env.NODE_ENV !== "development" && invitation.invited_by !== requestedBy) {
      return { ok: false, error: "No tienes permiso para solicitar la baja de este usuario." };
    }

    if (invitation.status !== "aceptada") {
      return { ok: false, error: "Solo se puede solicitar baja de usuarios que ya aceptaron la invitación." };
    }

    // Verificar que no haya ya una solicitud pendiente para esta invitación
    const { data: existingRequest } = await admin
      .schema("nexia_tienda")
      .from("removal_requests")
      .select("id")
      .eq("invitation_id", invitationId)
      .eq("status", "pendiente")
      .maybeSingle();

    if (existingRequest) {
      return { ok: false, error: "Ya existe una solicitud de baja pendiente para este usuario." };
    }

    // Crear la solicitud de baja
    const { error: insertError } = await admin
      .schema("nexia_tienda")
      .from("removal_requests")
      .insert({
        tenant_id: tenantId,
        requested_by: requestedBy,
        invitation_id: invitationId,
        target_email: invitation.email,
        reason: reason || null,
      });

    if (insertError) {
      return { ok: false, error: "Error al crear la solicitud: " + insertError.message };
    }

    return { ok: true };
  } catch (e) {
    console.error("[solicitarBaja]", e);
    return { ok: false, error: "Error inesperado al enviar la solicitud." };
  }
}
