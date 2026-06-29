import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDevContext } from "@/lib/supabase/devClient";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;

  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    userEmail = user.email ?? null;
  }

  // Marca de la tienda (logo + color) para el POS de mostrador
  const { supabase: db, tenantId } = await getDevContext();
  const { data: tenant } = await db
    .schema("nexia_tienda")
    .from("tenants")
    .select("name, logo_url, color_primary")
    .eq("id", tenantId)
    .single();
  const primary = tenant?.color_primary ?? "#16a34a";

  return (
    <div
      className="min-h-screen bg-gray-50 flex"
      style={{ ["--brand-primary" as string]: primary } as React.CSSProperties}
    >
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name ?? "Logo"}
              className="w-11 h-11 rounded-lg object-contain bg-white flex-shrink-0"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: primary }}
            >
              {(tenant?.name ?? "T").charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 text-sm truncate">
              {tenant?.name ?? "Panel Vendedor"}
            </h1>
            <p className="text-xs text-gray-400 truncate">
              {userEmail ?? "Punto de venta"}
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/vendedor" icon="🛒">Pedidos</NavLink>
          <NavLink href="/vendedor/calculadora" icon="🧮">Calculadora POS</NavLink>
          <NavLink href="/vendedor/mis-clientes" icon="👥">Mis clientes</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-200">
          <LogoutButton className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <span>{icon}</span>
      {children}
    </Link>
  );
}
