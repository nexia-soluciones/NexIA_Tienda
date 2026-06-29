import { getDevContext } from "@/lib/supabase/devClient";
import MarcaForm from "./MarcaForm";

export const dynamic = "force-dynamic";

interface TenantMarca {
  name: string;
  logo_url: string | null;
  color_primary: string | null;
  color_accent: string | null;
  tagline: string | null;
}

export default async function DuenoConfiguracionPage() {
  const { supabase, tenantId } = await getDevContext();

  const { data: tenant } = await supabase
    .schema("nexia_tienda")
    .from("tenants")
    .select("name, logo_url, color_primary, color_accent, tagline")
    .eq("id", tenantId)
    .single();

  const marca: TenantMarca = {
    name: tenant?.name ?? "Mi tienda",
    logo_url: tenant?.logo_url ?? null,
    color_primary: tenant?.color_primary ?? null,
    color_accent: tenant?.color_accent ?? null,
    tagline: tenant?.tagline ?? null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración de marca</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Personaliza el logo, los colores y el lema de tu tienda pública.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <MarcaForm tenant={marca} tenantId={tenantId} />
      </div>
    </div>
  );
}
