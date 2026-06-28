import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/pgrest";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "./AddToCartButton";

export const revalidate = 60;

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = createAdminClient();

  const { data: product } = await supabase
    .schema("nexia_tienda")
    .from("products")
    .select(
      `id, name, description, benefits_description, price, image_url,
       category, search_tags, metadata,
       inventory ( stock )`
    )
    .eq("id", id)
    .single();

  if (!product) notFound();

  const stock = embedOne(product.inventory)?.stock ?? 0;
  const sinStock = stock === 0;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/tienda/${slug}`}
        className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block transition-colors"
      >
        ← Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl text-gray-200">
              📦
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full w-fit">
              {product.category}
            </span>
          )}

          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

          {/* Beneficios — destacados */}
          {product.benefits_description && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                Beneficios
              </p>
              <p className="text-sm text-blue-800 leading-relaxed">
                {product.benefits_description}
              </p>
            </div>
          )}

          {/* Descripción general */}
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Tags */}
          {product.search_tags && product.search_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.search_tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          {product.metadata && typeof product.metadata === "object" && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(product.metadata as Record<string, string>).map(
                ([key, value]) => (
                  <span
                    key={key}
                    className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {key}: {value}
                  </span>
                )
              )}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-bold text-gray-900">
                ${Number(product.price).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${
                  sinStock
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {sinStock ? "Sin stock" : `${stock} disponibles`}
              </span>
            </div>
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                price: Number(product.price),
              }}
              disabled={sinStock}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
