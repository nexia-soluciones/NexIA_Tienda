"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";

interface Summary {
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_month: number;
}

interface HourData {
  hour: number;
  order_count: number;
  revenue: number;
}

interface TopProduct {
  product_id: string;
  name: string;
  sku: string;
  units_sold: number;
  revenue: number;
  category: string | null;
}

interface InventorySuggestion {
  product_id: string;
  name: string;
  category: string | null;
  stock: number;
  low_stock_threshold: number;
  units_sold: number;
  sugerencia: "SIN_STOCK" | "REABASTECER" | "BAJO" | "OK";
}

interface OrderItem {
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  customer_name: string | null;
  created_at: string;
  order_items: OrderItem[];
}

interface CategoryData {
  category: string;
  units_sold: number;
  revenue: number;
  orders: number;
}

interface ChannelData {
  channel: string;
  orders: number;
  revenue: number;
}

const STATUS_COLOR: Record<string, string> = {
  recibido:       "bg-amber-100 text-amber-700",
  en_preparacion: "bg-blue-100 text-blue-700",
  listo_entrega:  "bg-purple-100 text-purple-700",
  entregado:      "bg-green-100 text-green-700",
  cancelado:      "bg-red-100 text-red-700",
};

const SUGERENCIA_COLOR: Record<string, string> = {
  SIN_STOCK:   "bg-red-100 text-red-700 border-red-200",
  REABASTECER: "bg-orange-100 text-orange-700 border-orange-200",
  BAJO:        "bg-amber-100 text-amber-700 border-amber-200",
  OK:          "bg-green-100 text-green-700 border-green-200",
};

// Paleta de 10 colores agradables para la dona de categorías
const PIE_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  telegram_bot: { label: "🤖 Bot",       color: "#0ea5e9" },
  web:          { label: "💻 Web",       color: "#6366f1" },
  pos:          { label: "🛒 Mostrador", color: "#10b981" },
  otro:         { label: "Otro",         color: "#94a3b8" },
};

const SUGERENCIA_META: Record<
  InventorySuggestion["sugerencia"],
  { label: string; color: string }
> = {
  SIN_STOCK:   { label: "Sin stock",   color: "#ef4444" },
  REABASTECER: { label: "Reabastecer", color: "#f97316" },
  BAJO:        { label: "Stock bajo",  color: "#f59e0b" },
  OK:          { label: "OK",          color: "#10b981" },
};

export default function AnalyticsCharts({
  summary,
  byHour,
  topProducts,
  inventorySuggestions,
  recentOrders,
  byCategory,
  byChannel,
}: {
  summary: Summary | null;
  byHour: HourData[];
  topProducts: TopProduct[];
  inventorySuggestions: InventorySuggestion[];
  recentOrders: RecentOrder[];
  byCategory: CategoryData[];
  byChannel: ChannelData[];
}) {
  const [drillOrder, setDrillOrder] = useState<RecentOrder | null>(null);
  const [showInventoryDetail, setShowInventoryDetail] = useState(false);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

  const fmtShort = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k`
      : `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

  const criticalInventory = inventorySuggestions.filter(
    (s) => s.sugerencia === "SIN_STOCK" || s.sugerencia === "REABASTECER"
  );

  // --- Ventas por categoría (dona) ---
  const categoryData = byCategory
    .map((c) => ({
      name: c.category || "Sin categoría",
      value: Number(c.revenue),
      units: Number(c.units_sold),
      orders: Number(c.orders),
    }))
    .filter((c) => c.value > 0);
  const categoryTotal = categoryData.reduce((acc, c) => acc + c.value, 0);

  // --- Ventas por canal (dona) ---
  const channelData = byChannel
    .map((c) => ({
      key: c.channel,
      name: CHANNEL_META[c.channel]?.label ?? c.channel,
      color: CHANNEL_META[c.channel]?.color ?? "#94a3b8",
      value: Number(c.revenue),
      orders: Number(c.orders),
    }))
    .filter((c) => c.value > 0 || c.orders > 0);
  const channelTotal = channelData.reduce((acc, c) => acc + c.value, 0);

  // --- Ventas por hora (barras 0-23) ---
  const hourData = Array.from({ length: 24 }, (_, h) => {
    const d = byHour.find((x) => x.hour === h);
    return {
      hour: h,
      label: `${h}h`,
      revenue: Number(d?.revenue ?? 0),
      orders: Number(d?.order_count ?? 0),
    };
  });
  const hasHourData = hourData.some((h) => h.revenue > 0);

  // --- Top productos (barras horizontales) ---
  const productData = topProducts
    .filter((p) => p.units_sold > 0)
    .map((p) => ({
      name: p.name,
      revenue: Number(p.revenue),
      units: Number(p.units_sold),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .reverse(); // reverse para que el mayor quede arriba en barras horizontales

  // --- Resumen de inventario por estado ---
  const inventoryCounts = (["SIN_STOCK", "REABASTECER", "BAJO", "OK"] as const).map(
    (key) => ({
      key,
      label: SUGERENCIA_META[key].label,
      color: SUGERENCIA_META[key].color,
      count: inventorySuggestions.filter((s) => s.sugerencia === key).length,
    })
  );
  const inventoryDonut = inventoryCounts.filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Ingresos hoy",      value: fmt(Number(summary?.revenue_today ?? 0)),       sub: "pedidos del día",     accent: "text-indigo-600" },
          { label: "Ingresos del mes",  value: fmt(Number(summary?.revenue_this_month ?? 0)),  sub: "mes en curso",        accent: "text-blue-600" },
          { label: "Total histórico",   value: fmt(Number(summary?.total_revenue ?? 0)),       sub: "todos los tiempos",   accent: "text-emerald-600" },
          { label: "Total pedidos",     value: summary?.total_orders ?? 0,                     sub: "histórico",           accent: "text-gray-900" },
          { label: "Entregados",        value: summary?.delivered_orders ?? 0,                 sub: `${summary?.total_orders ? Math.round((summary.delivered_orders / summary.total_orders) * 100) : 0}% del total`, accent: "text-green-600" },
          { label: "Cancelados",        value: summary?.cancelled_orders ?? 0,                 sub: "pedidos cancelados",  accent: "text-red-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.accent}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerta inventario crítico */}
      {criticalInventory.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-2">
            ⚠️ {criticalInventory.length} producto{criticalInventory.length !== 1 ? "s" : ""} requieren atención inmediata
          </p>
          <div className="flex flex-wrap gap-2">
            {criticalInventory.map((item) => (
              <span
                key={item.product_id}
                className={`text-xs px-2 py-1 rounded-full border ${SUGERENCIA_COLOR[item.sugerencia]}`}
              >
                {item.name} · stock: {item.stock}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Categoría (estrella) + Canal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por categoría — dona estrella */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-1">Ventas por categoría</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución de ingresos por categoría</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Sin datos aún</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const p = item.payload as (typeof categoryData)[number];
                        return [`${fmt(Number(value))} · ${p.units} uds`, p.name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Leyenda con % y monto */}
              <div className="w-full sm:w-1/2 space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {categoryData.map((c, idx) => {
                  const pct = categoryTotal > 0 ? (c.value / categoryTotal) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="font-medium text-gray-700 truncate flex-1">{c.name}</span>
                      <span className="text-gray-500 flex-shrink-0">{pct.toFixed(1)}%</span>
                      <span className="text-gray-800 font-medium flex-shrink-0 w-20 text-right">
                        {fmt(c.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ventas por canal — dona */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Ventas por canal</h2>
          <p className="text-xs text-gray-400 mb-4">¿Por dónde te compran?</p>
          {channelData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Sin datos aún</p>
          ) : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {channelData.map((c, idx) => (
                        <Cell key={idx} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const p = item.payload as (typeof channelData)[number];
                        return [`${fmt(Number(value))} · ${p.orders} pedidos`, p.name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {channelData.map((c) => {
                  const pct = channelTotal > 0 ? (c.value / channelTotal) * 100 : 0;
                  return (
                    <div key={c.key} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-medium text-gray-700 flex-1">{c.name}</span>
                      <span className="text-gray-500">{pct.toFixed(0)}%</span>
                      <span className="text-gray-800 font-medium w-20 text-right">{fmt(c.value)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por hora del día — BarChart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Ventas por hora</h2>
          <p className="text-xs text-gray-400 mb-4">¿A qué hora vendes más?</p>
          {!hasHourData ? (
            <p className="text-sm text-gray-400 text-center py-16">Sin datos aún</p>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    interval={1}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => fmtShort(v)}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value, _n, item) => {
                      const p = item.payload as (typeof hourData)[number];
                      return [`${fmt(Number(value))} · ${p.orders} pedidos`, `${p.hour}:00`];
                    }}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                    {hourData.map((h) => (
                      <Cell
                        key={h.hour}
                        fill={h.hour >= 8 && h.hour <= 20 ? "#60a5fa" : "#c7d2fe"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top productos — BarChart horizontal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Top productos</h2>
          <p className="text-xs text-gray-400 mb-4">Top 8 por ingresos generados</p>
          {productData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Sin ventas aún</p>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productData}
                  layout="vertical"
                  margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => fmtShort(v)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
                  />
                  <Tooltip
                    formatter={(value, _n, item) => {
                      const p = item.payload as (typeof productData)[number];
                      return [`${fmt(Number(value))} · ${p.units} uds`, p.name];
                    }}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="revenue"
                      position="right"
                      formatter={(v) => fmtShort(Number(v))}
                      style={{ fontSize: 10, fill: "#64748b" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Inventario: resumen gráfico + tabla colapsable */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Sugerencias de inventario</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Basado en ventas históricas y stock actual
          </p>
        </div>

        {inventorySuggestions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin datos de inventario</p>
        ) : (
          <>
            {/* Resumen gráfico */}
            <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
              <div style={{ width: 160, height: 160 }} className="flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryDonut}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {inventoryDonut.map((c) => (
                        <Cell key={c.key} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${Number(value)} productos`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {inventoryCounts.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-xs text-gray-600">{c.label}</span>
                    <span className="text-sm font-bold text-gray-900">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle ver detalle */}
            <div className="px-5 pb-4">
              <button
                onClick={() => setShowInventoryDetail((v) => !v)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {showInventoryDetail ? "Ocultar detalle ▲" : "Ver detalle ▼"}
              </button>
            </div>

            {/* Tabla completa colapsable */}
            {showInventoryDetail && (
              <table className="w-full text-sm border-t border-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Producto</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Stock</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Vendidos</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventorySuggestions.map((item) => (
                    <tr key={item.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-gray-400">{item.category}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-gray-700">{item.stock}</span>
                        <span className="text-gray-400 text-xs"> / mín {item.low_stock_threshold}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                        {item.units_sold}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${SUGERENCIA_COLOR[item.sugerencia]}`}
                        >
                          {item.sugerencia === "SIN_STOCK"   ? "Sin stock" :
                           item.sugerencia === "REABASTECER" ? "Reabastecer" :
                           item.sugerencia === "BAJO"        ? "Stock bajo" : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Pedidos recientes con drill-down */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Pedidos recientes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Haz clic en un pedido para ver el desglose</p>
        </div>
        <div className="divide-y divide-gray-100">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin pedidos aún</p>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id}>
                <button
                  onClick={() =>
                    setDrillOrder(drillOrder?.id === order.id ? null : order)
                  }
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {order.customer_name ?? `#${order.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleString("es-MX", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{fmt(Number(order.total))}</span>
                    <span className="text-gray-400 text-xs">
                      {drillOrder?.id === order.id ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Drill-down */}
                {drillOrder?.id === order.id && (
                  <div className="px-5 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left py-1 font-medium">Producto</th>
                          <th className="text-right py-1 font-medium">Cant.</th>
                          <th className="text-right py-1 font-medium">P. unitario</th>
                          <th className="text-right py-1 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.order_items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-1 text-gray-700">
                              {item.products?.name ?? "Producto"}
                            </td>
                            <td className="py-1 text-right text-gray-600">{item.quantity}</td>
                            <td className="py-1 text-right text-gray-600">
                              {fmt(Number(item.unit_price))}
                            </td>
                            <td className="py-1 text-right font-medium text-gray-800">
                              {fmt(Number(item.unit_price) * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-300">
                          <td colSpan={3} className="py-1.5 text-right font-semibold text-gray-700">
                            Total:
                          </td>
                          <td className="py-1.5 text-right font-bold text-gray-900">
                            {fmt(Number(order.total))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
