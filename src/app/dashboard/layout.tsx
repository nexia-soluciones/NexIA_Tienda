import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">NexIA Tienda</h1>
          {userEmail && (
            <p className="text-xs text-gray-500 mt-1 truncate">{userEmail}</p>
          )}
          {!userEmail && (
            <p className="text-xs text-gray-400 mt-1">Modo desarrollo</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>📊</span>
            Alertas y Macros
          </Link>
          <Link
            href="/dashboard/productos"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>📦</span>
            Productos
          </Link>
          <Link
            href="/dashboard/pedidos"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>🛒</span>
            Pedidos
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <LogoutButton className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
