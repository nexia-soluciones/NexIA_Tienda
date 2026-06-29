import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

interface TenantBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  color_primary: string | null;
  color_accent: string | null;
  tagline: string | null;
}

const DEFAULT_PRIMARY = "#16a34a";
const DEFAULT_ACCENT = "#0ea5e9";

export default async function TenantStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let tenant: TenantBrand | null = null;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .schema("nexia_tienda")
      .from("tenants")
      .select("id, name, slug, logo_url, color_primary, color_accent, tagline")
      .eq("slug", slug)
      .single();
    tenant = data;
  } catch {
    // Error de conexión — se muestra la pantalla de error abajo
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-5xl mb-4">🏪</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tienda no encontrada
          </h1>
          <p className="text-gray-500 text-sm mb-1">
            No existe ninguna tienda con el identificador{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              {slug}
            </code>
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Verifica que el slug sea correcto o que el tenant esté dado de alta en la base de datos.
          </p>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const primary = tenant.color_primary || DEFAULT_PRIMARY;
  const accent = tenant.color_accent || DEFAULT_ACCENT;

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          "--brand-primary": primary,
          "--brand-accent": accent,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 bg-white z-10 border-b border-gray-200">
        {/* Franja de acento con el color primario de la marca */}
        <div className="h-1.5" style={{ backgroundColor: primary }} />
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={`/tienda/${slug}`}
            className="flex items-center gap-3 min-w-0"
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: tenant.logo_url ? "transparent" : primary }}
            >
              {tenant.logo_url ? (
                // Logo externo (Supabase Storage). Se usa <img> para evitar
                // restricciones de tamaño/optimización con SVG y dominios.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {tenant.name.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold text-gray-900 leading-tight truncate">
                {tenant.name}
              </span>
              {tenant.tagline && (
                <span className="block text-xs text-gray-500 leading-tight truncate">
                  {tenant.tagline}
                </span>
              )}
            </span>
          </Link>
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href={`/tienda/${slug}/buscar`}
              className="text-sm text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              Buscar por malestar
            </Link>
            <Link
              href="/tienda/carrito"
              className="text-sm text-white px-4 py-1.5 rounded-full font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Carrito
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-xs text-gray-400">
        {tenant.name} · Powered by NexIA Tienda
      </footer>
    </div>
  );
}
