import { getDevContext } from "@/lib/supabase/devClient";
import EmpleadoOrderCard, { type EmpleadoOrder } from "./EmpleadoOrderCard";

export default async function EmpleadoPage() {
  const { supabase, tenantId } = await getDevContext();

  const { data: orders } = await supabase
    .schema("nexia_tienda")
    .from("orders")
    .select(
      `
      id,
      status,
      payment_status,
      total,
      customer_name,
      notes,
      created_at,
      order_items (
        quantity,
        unit_price,
        product_name,
        sku
      )
    `
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const lista = (orders ?? []) as unknown as EmpleadoOrder[];

  // "Por preparar" = lo que el preparador tiene en cola (no entregado ni cancelado).
  const porPreparar = lista.filter(
    (o) => o.status !== "entregado" && o.status !== "cancelado"
  ).length;

  const resumen = {
    total: lista.length,
    porPreparar,
    hoy: lista.filter(
      (o) => new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length,
    ingresos: lista
      .filter((o) => o.status !== "cancelado")
      .reduce((s, o) => s + Number(o.total), 0),
  };

  return (
    <div className="space-y-8">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pedidos hoy",   value: resumen.hoy,        alert: false },
          { label: "Por preparar",  value: resumen.porPreparar, alert: resumen.porPreparar > 0 },
          { label: "Total pedidos", value: resumen.total,       alert: false },
          { label: "Ingresos",      value: `$${resumen.ingresos.toFixed(2)}`, alert: false },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${
              card.alert ? "border-red-200 bg-red-50" : "bg-white border-gray-200"
            }`}
          >
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.alert ? "text-red-600" : "text-gray-900"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Lista de pedidos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Pedidos</h2>
        <div className="space-y-3">
          {lista.map((order) => (
            <EmpleadoOrderCard key={order.id} order={order} />
          ))}

          {!lista.length && (
            <p className="text-center text-gray-400 py-16">No hay pedidos aún.</p>
          )}
        </div>
      </div>
    </div>
  );
}
