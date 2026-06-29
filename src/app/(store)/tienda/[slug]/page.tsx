import { createAdminClient } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/pgrest";
import { notFound } from "next/navigation";
import Catalogo from "./Catalogo";

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

  const available =
    products?.filter((p) => (embedOne(p.inventory)?.stock ?? 0) > 0) ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-gray-500 mt-1">
          {available.length} producto{available.length !== 1 ? "s" : ""} disponible{available.length !== 1 ? "s" : ""}
        </p>
      </div>

      {available.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>No hay productos disponibles en este momento.</p>
        </div>
      ) : (
        <Catalogo products={available} slug={slug} />
      )}
    </div>
  );
}
