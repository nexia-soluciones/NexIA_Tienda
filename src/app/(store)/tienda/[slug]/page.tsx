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
    .select("id, name, logo_url, color_primary, color_accent, tagline")
    .eq("slug", slug)
    .single();

  if (!tenant) notFound();

  const primary = tenant.color_primary || "#16a34a";
  const accent = tenant.color_accent || "#0ea5e9";

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
      {/* Hero — muestra el logo en grande con la paleta de la marca */}
      <section
        className="relative overflow-hidden rounded-3xl mb-10 px-6 py-12 sm:py-14 text-center"
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, ${accent}22 0%, ${primary}14 45%, #ffffff 100%)`,
        }}
      >
        {/* halo decorativo detrás del logo */}
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 w-44 h-44 rounded-full blur-3xl opacity-30"
          style={{ background: primary }}
          aria-hidden
        />
        {tenant.logo_url && (
          <div className="relative inline-flex items-center justify-center mb-5">
            <span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 10px 40px -8px ${primary}66` }}
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full object-contain bg-white ring-4"
              style={{ ["--tw-ring-color" as string]: `${primary}33` }}
            />
          </div>
        )}
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          style={{ color: primary }}
        >
          {tenant.name}
        </h1>
        {tenant.tagline && (
          <p
            className="mt-2 text-base sm:text-lg italic font-medium"
            style={{ color: accent }}
          >
            ✨ {tenant.tagline}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-500 max-w-md mx-auto">
          {available.length} producto{available.length !== 1 ? "s" : ""} natural{available.length !== 1 ? "es" : ""} para tu bienestar.
          Encuentra lo que necesitas por categoría 👇
        </p>
      </section>

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
