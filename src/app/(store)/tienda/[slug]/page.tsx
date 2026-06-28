import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/pgrest";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 60;

export default async function TiendaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .schema("nexia_tienda")
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) notFound();

  const { data: products } = await supabase
    .schema("nexia_tienda")
    .from("products")
    .select(
      `id, name, description, benefits_description, price, image_url, category, slug,
       inventory ( stock )`
    )
    .eq("tenant_id", tenant.id)
    .order("name");

  const available = products?.filter(
    (p) => (embedOne(p.inventory)?.stock ?? 0) > 0
  ) ?? [];

  const categories = [...new Set(available.map((p) => p.category).filter(Boolean))];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-gray-500 mt-1">
          {available.length} producto{available.length !== 1 ? "s" : ""} disponible{available.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtro por categoría */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {available.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>No hay productos disponibles en este momento.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {available.map((product) => (
          <Link
            key={product.id}
            href={`/tienda/${slug}/producto/${product.id}`}
            className="group border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-400 hover:shadow-md transition-all"
          >
            {/* Imagen */}
            <div className="aspect-square bg-gray-100 relative">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
                  📦
                </div>
              )}
              {product.category && (
                <span className="absolute top-2 left-2 text-xs bg-white/90 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                  {product.category}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {product.name}
              </h2>
              {product.benefits_description ? (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.benefits_description}
                </p>
              ) : product.description ? (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>
              ) : null}
              <p className="text-xl font-bold text-gray-900 mt-3">
                ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
