import { getDevContext } from "@/lib/supabase/devClient";
import { embedOne } from "@/lib/pgrest";
import PosCalculator from "./PosCalculator";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const { supabase, tenantId } = await getDevContext();

  const { data: products } = await supabase
    .schema("nexia_tienda")
    .from("products")
    .select(
      `id, name, sku, price, image_url, category,
       inventory ( stock )`
    )
    .eq("tenant_id", tenantId)
    .order("name");

  const disponibles = products?.filter(
    (p) => (embedOne(p.inventory)?.stock ?? 0) > 0
  ) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Calculadora de Venta Rápida</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Selecciona productos para armar el ticket y registrar la venta.
        </p>
      </div>
      <PosCalculator products={disponibles as never} tenantId={tenantId} />
    </div>
  );
}
