import { getDevContext } from "@/lib/supabase/devClient";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  recibido:        { label: "Recibido",          color: "bg-amber-100 text-amber-700"   },
  en_preparacion:  { label: "En proceso",        color: "bg-blue-100 text-blue-700"     },
  listo_entrega:   { label: "Listo para entrega", color: "bg-purple-100 text-purple-700" },
  entregado:       { label: "Entregado",         color: "bg-green-100 text-green-700"   },
  cancelado:       { label: "Cancelado",         color: "bg-red-100 text-red-700"       },
};

export default async function PedidosPage() {
  const { supabase, tenantId } = await getDevContext();

  const { data: orders, error } = await supabase
    .schema("nexia_tienda")
    .from("orders")
    .select(
      `
      id,
      status,
      total,
      created_at,
      order_items ( id, quantity, unit_price, product_id )
    `
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos</h2>
        <p className="text-gray-500 mt-1">Historial y estado de pedidos</p>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm mb-6">
          Error al cargar pedidos: {error.message}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">ID</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Artículos</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                  No hay pedidos aún.
                </td>
              </tr>
            )}
            {orders?.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS["recibido"];
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {order.order_items?.length ?? 0} artículo(s)
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    ${Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
