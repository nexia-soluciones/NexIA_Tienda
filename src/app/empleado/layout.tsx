import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    // Verificar que el usuario tiene acceso (cualquier rol del tenant)
    const { data: ut } = await supabase
      .schema("nexia_tienda")
      .from("user_tenants")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!ut) redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Panel Empleado</h1>
          <p className="text-xs text-gray-400">Control de ventas</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dueno/analytics"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            ← Panel
          </Link>
          {process.env.NODE_ENV !== "development" && (
            <LogoutButton className="text-sm text-gray-500 hover:text-gray-900 transition-colors" label="Salir" />
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
