import { getDevContext } from "@/lib/supabase/devClient";
import Link from "next/link";
import Image from "next/image";
import ProductDeleteButton from "./ProductDeleteButton";

export const dynamic = "force-dynamic";

export default async function DuenoProductosPage() {
  const { supabase, tenantId } = await getDevContext();

  const [{ data: products }, { data: inventoryList }] = await Promise.all([
    supabase
      .schema("nexia_tienda")
      .from("products")
      .select("id, sku, name, price, image_url, category, description, benefits_description, search_tags")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase
      .schema("nexia_tienda")
      .from("inventory")
      .select("product_id, stock, low_stock_threshold")
      .eq("tenant_id", tenantId),
  ]);

  const inventoryMap = new Map(
    (inventoryList ?? []).map((i) => [i.product_id, i])
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products?.length ?? 0} producto{(products?.length ?? 0) !== 1 ? "s" : ""} en el catálogo
          </p>
        </div>
        <Link
          href="/dueno/productos/nuevo"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {!products?.length ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📦</p>
            <p>No hay productos. Crea el primero o sube un CSV.</p>
            <Link
              href="/dueno/csv"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Subir CSV masivo →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => {
                const inv = inventoryMap.get(product.id);
                const stock = inv?.stock ?? 0;
                const umbral = inv?.low_stock_threshold ?? 5;
                const stockAlert = stock <= umbral;
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 relative overflow-hidden">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-gray-300">
                              📦
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {product.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          stock === 0
                            ? "bg-red-100 text-red-600"
                            : stockAlert
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dueno/productos/${product.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </Link>
                        <ProductDeleteButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
