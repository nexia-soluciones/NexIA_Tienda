"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type OrderStatus =
  | "recibido"
  | "en_preparacion"
  | "listo_entrega"
  | "entregado"
  | "cancelado";

type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

interface OrderItem {
  quantity: number;
  unit_price: number;
  product_name: string | null;
  sku: string | null;
}

export interface EmpleadoOrder {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus | null;
  total: number;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

// Eje de ENTREGA (status). Secuencia guiada — no permite saltos ni retrocesos.
const PIPELINE: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  recibido:       { label: "Recibido",           color: "bg-amber-100 text-amber-700",   icon: "📥" },
  en_preparacion: { label: "En preparación",     color: "bg-blue-100 text-blue-700",     icon: "🛠️" },
  listo_entrega:  { label: "Listo para entrega", color: "bg-purple-100 text-purple-700", icon: "📦" },
  entregado:      { label: "Entregado",          color: "bg-green-100 text-green-700",   icon: "✅" },
  cancelado:      { label: "Cancelado",          color: "bg-red-100 text-red-700",       icon: "✖️" },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  recibido:       "en_preparacion",
  en_preparacion: "listo_entrega",
  listo_entrega:  "entregado",
  entregado:      null,
  cancelado:      null,
};

// Color del botón según la etapa a la que LLEVA (para que cada paso se vea distinto).
const NEXT_BTN: Record<string, string> = {
  en_preparacion: "bg-blue-600 hover:bg-blue-700",
  listo_entrega:  "bg-purple-600 hover:bg-purple-700",
  entregado:      "bg-green-600 hover:bg-green-700",
};

// Eje de PAGO (payment_status) — separado del de entrega (patrón Medusa, Ola 1).
const PAY: Record<PaymentStatus, { label: string; color: string }> = {
  paid:     { label: "Pagado",         color: "bg-green-100 text-green-700" },
  pending:  { label: "Pago en curso",  color: "bg-amber-100 text-amber-700" },
  unpaid:   { label: "Sin pagar",      color: "bg-gray-100 text-gray-500"   },
  refunded: { label: "Reembolsado",    color: "bg-red-100 text-red-700"     },
};

export default function EmpleadoOrderCard({ order }: { order: EmpleadoOrder }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = PIPELINE[status] ?? PIPELINE.recibido;
  const nextStatus = NEXT_STATUS[status];
  const nextStep = nextStatus ? PIPELINE[nextStatus] : null;
  const pay = order.payment_status ? PAY[order.payment_status] : null;
  const cerrada = status === "entregado" || status === "cancelado";

  async function cambiarA(nuevo: OrderStatus) {
    if (saving) return;
    const previo = status;
    setSaving(true);
    setError(null);
    setStatus(nuevo); // optimista
    try {
      const supabase = createClient();
      const { error: upErr } = await supabase
        .schema("nexia_tienda")
        .from("orders")
        .update({ status: nuevo, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (upErr) throw upErr;
      router.refresh(); // re-sincroniza los contadores del resumen
    } catch (e) {
      setStatus(previo); // revertir si falla
      setError(e instanceof Error ? e.message : "No se pudo actualizar. Reintenta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</p>
          {order.customer_name && (
            <p className="text-sm font-medium text-gray-800 mt-0.5">{order.customer_name}</p>
          )}
          <p className="text-xs text-gray-400">
            {new Date(order.created_at).toLocaleString("es-MX", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="font-bold text-gray-900 text-lg">
            ${Number(order.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex flex-wrap justify-end gap-1">
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${current.color}`}>
              {current.icon} {current.label}
            </span>
            {pay && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${pay.color}`}>
                {pay.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items — usa el snapshot (product_name/sku), sobrevive aunque borren el producto */}
      {order.order_items?.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {order.order_items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-600">
              <span>
                {item.product_name ?? "Producto"}{" "}
                <span className="text-gray-400">×{item.quantity}</span>
              </span>
              <span>
                ${(item.unit_price * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">📝 {order.notes}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠️ {error}</p>
      )}

      {/* Acciones — avance guiado, sin saltos ni retrocesos */}
      {!cerrada && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {nextStep && (
            <button
              onClick={() => nextStatus && cambiarA(nextStatus)}
              disabled={saving}
              className={`flex-1 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors ${
                nextStatus ? NEXT_BTN[nextStatus] : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "..." : `${nextStep.icon} Marcar ${nextStep.label.toLowerCase()}`}
            </button>
          )}
          <button
            onClick={() => cambiarA("cancelado")}
            disabled={saving}
            className="text-xs text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
