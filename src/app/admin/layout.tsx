import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
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

  return (
    <div className="min-h-screen bg-gray-950 flex text-gray-100">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="font-bold text-white">Panel Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">NexIA Infraestructura</p>
          {userEmail && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{userEmail}</p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/admin" icon="🖥️">Dashboard</NavLink>
          <NavLink href="/admin/tenants" icon="🏪">Tenants</NavLink>
          <NavLink href="/admin/imagenes" icon="🎨">Generación de imágenes</NavLink>
          <NavLink href="/admin/branding" icon="✨">Branding de marca</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <LogoutButton className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800" />
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
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
    >
      <span>{icon}</span>
      {children}
    </Link>
  );
}
