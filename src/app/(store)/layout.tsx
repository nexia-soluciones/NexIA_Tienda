import Link from "next/link";

// Layout de la tienda pública. Cada sub-ruta define su propio header
// (tienda/[slug]/layout.tsx → header del tenant; carrito → header inline).
// Aquí agregamos el footer "Powered by NexIA" en TODAS las páginas de tienda.
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col items-center gap-2.5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/powered-by-nexia.png" alt="Powered by NexIA" className="h-5 opacity-90" />
          <Link
            href="/registro"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ¿Tienes un negocio?{" "}
            <span className="font-semibold text-violet-600">Genera tu tienda gratis →</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
