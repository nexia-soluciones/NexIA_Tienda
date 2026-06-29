import { getDevContext } from "@/lib/supabase/devClient";
import AnalyticsCharts from "./AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { supabase, tenantId } = await getDevContext();

  // Resumen general
  const { data: summary } = await supabase
    .schema("nexia_tienda")
    .from("v_sales_summary")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  // Ventas por hora
  const { data: byHour } = await supabase
    .schema("nexia_tienda")
    .from("v_sales_by_hour")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("hour");

  // Top productos
  const { data: topProducts } = await supabase
    .schema("nexia_tienda")
    .from("v_top_products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("units_sold", { ascending: false })
    .limit(10);

  // Sugerencias de inventario
  const { data: inventorySuggestions } = await supabase
    .schema("nexia_tienda")
    .from("v_inventory_suggestions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sugerencia");

  // Ventas por categoría
  const { data: byCategory } = await supabase
    .schema("nexia_tienda")
    .from("v_sales_by_category")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("revenue", { ascending: false });

  // Ventas por canal
  const { data: byChannel } = await supabase
    .schema("nexia_tienda")
    .from("v_sales_by_channel")
    .select("*")
    .eq("tenant_id", tenantId);

  // Pedidos recientes con desglose
  const { data: recentOrders } = await supabase
    .schema("nexia_tienda")
    .from("orders")
    .select(
      `id, status, total, customer_name, created_at,
       order_items ( quantity, unit_price, products ( name ) )`
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics & Dataismo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Visión completa del desempeño de tu tienda.
        </p>
      </div>

      <AnalyticsCharts
        summary={summary ?? null}
        byHour={byHour ?? []}
        topProducts={topProducts ?? []}
        inventorySuggestions={inventorySuggestions ?? []}
        recentOrders={recentOrders as never ?? []}
        byCategory={byCategory ?? []}
        byChannel={byChannel ?? []}
      />
    </div>
  );
}
