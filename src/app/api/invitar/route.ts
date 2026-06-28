import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// POST /api/invitar
// Genera un link de invitación sin necesitar SMTP configurado.
// El dueño puede compartir el link manualmente (WhatsApp, etc.)
export async function POST(req: NextRequest) {
  const { email, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email y rol son requeridos." },
      { status: 400 }
    );
  }

  if (!["cliente", "vendedor", "empleado"].includes(role)) {
    return NextResponse.json(
      { error: "Rol inválido. Solo se permite: cliente, vendedor, empleado." },
      { status: 400 }
    );
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
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
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
      return NextResponse.json(
        { error: "No tienes permiso para invitar usuarios." },
        { status: 403 }
      );
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
    return NextResponse.json(
      { error: "Ya existe una invitación pendiente para este correo." },
      { status: 409 }
    );
  }

  // Generar el link de invitación (no requiere SMTP)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectTo = `${appUrl}/auth/callback?next=/auth/aceptar-invitacion`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.toLowerCase(),
    options: { redirectTo },
  });

  if (linkError) {
    return NextResponse.json(
      { error: "No se pudo generar el link de invitación: " + linkError.message },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Error al guardar la invitación: " + inviteDbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    link: linkData.properties?.action_link ?? null,
  });
}
