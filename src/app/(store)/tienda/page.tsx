import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Redirige al usuario a su tienda real si está autenticado,
// o a la tienda demo si no tiene sesión.
export default async function TiendaRootPage() {
  if (process.env.NODE_ENV === "development") {
    const devTenantId = process.env.DEV_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
    const supabase = await createClient();
    const { data: tenant } = await supabase
      .schema("nexia_tienda")
      .from("tenants")
      .select("slug")
      .eq("id", devTenantId)
      .single();
    redirect(tenant?.slug ? `/tienda/${tenant.slug}` : "/tienda/demo");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Buscar el tenant del usuario y redirigir a su tienda
    const { data: ut } = await supabase
      .schema("nexia_tienda")
      .from("user_tenants")
      .select("tenant_id, tenants ( slug )")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const slug = (ut?.tenants as unknown as { slug: string } | null)?.slug;
    if (slug) redirect(`/tienda/${slug}`);
  }

  // Sin sesión o sin tenant: tienda demo
  redirect("/tienda/demo");
}
