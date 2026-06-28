"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/useCart";
import Link from "next/link";
import { crearPedidoWeb, crearCheckoutStripe, tiendaAceptaTarjeta } from "./actions";

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  const [checkout, setCheckout] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [loading, setLoading] = useState<null | "pedido" | "tarjeta">(null);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);
  const [aceptaTarjeta, setAceptaTarjeta] = useState(false);
  const [pagoCancelado, setPagoCancelado] = useState(false);

  // Regreso desde Stripe (success_url / cancel_url)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pago") === "ok") {
      setFolio(params.get("order") ?? "—");
      clearCart();
      window.history.replaceState({}, "", "/tienda/carrito");
    } else if (params.get("pago") === "cancel") {
      setPagoCancelado(true);
      window.history.replaceState({}, "", "/tienda/carrito");
    }
  }, [clearCart]);

  async function abrirCheckout() {
    setCheckout(true);
    setError(null);
    const res = await tiendaAceptaTarjeta(items.map((i) => ({ id: i.id, quantity: i.quantity })));
    setAceptaTarjeta(res.enabled);
  }

  const datosCliente = () => ({ nombre, telefono, direccion });
  const lineas = () => items.map((i) => ({ id: i.id, quantity: i.quantity }));

  async function handleConfirmarSinPago(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("pedido");
    const res = await crearPedidoWeb(lineas(), datosCliente());
    setLoading(null);
    if (res.ok && res.orderId) {
      setFolio(res.orderId);
      clearCart();
    } else {
      setError(res.error ?? "No se pudo procesar el pedido.");
    }
  }

  async function handlePagarTarjeta() {
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      setError("Completa nombre, WhatsApp y dirección antes de pagar.");
      return;
    }
    setError(null);
    setLoading("tarjeta");
    const res = await crearCheckoutStripe(lineas(), datosCliente());
    if (res.url) {
      window.location.href = res.url; // a la página de pago de Stripe
    } else {
      setError(res.error ?? "No se pudo iniciar el pago.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/tienda" className="text-lg font-bold text-gray-900">
            NexIA Tienda
          </Link>
          <Link href="/tienda" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Ver catálogo
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Carrito</h1>

        {folio ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Pedido recibido!</h2>
            <p className="text-gray-600 mb-1">
              Folio <span className="font-mono font-semibold">#{folio.slice(0, 8)}</span>
            </p>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              En breve te contactaremos por WhatsApp para confirmar la entrega. ¡Gracias por tu compra! 🌿
            </p>
            <Link href="/tienda" className="text-blue-600 hover:underline text-sm font-medium">
              Seguir comprando
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-500 mb-6">Tu carrito está vacío.</p>
            <Link href="/tienda" className="text-blue-600 hover:underline text-sm font-medium">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            {pagoCancelado && (
              <p className="mb-5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Pago cancelado. Tu carrito sigue aquí cuando quieras retomarlo.
              </p>
            )}

            <div className="space-y-3 mb-8">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border border-gray-200 rounded-xl p-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      ${item.price.toLocaleString("es-MX", { minimumFractionDigits: 2 })} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={checkout}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={checkout}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900 w-20 text-right">
                    ${(item.price * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                  {!checkout && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {!checkout ? (
                <>
                  <button
                    onClick={abrirCheckout}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all text-sm"
                  >
                    Continuar con la compra
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Vaciar carrito
                  </button>
                </>
              ) : (
                <form onSubmit={handleConfirmarSinPago} className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Tus datos para la entrega</p>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="WhatsApp (10 dígitos)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    required
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección de entrega"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {aceptaTarjeta && (
                    <button
                      type="button"
                      onClick={handlePagarTarjeta}
                      disabled={loading !== null}
                      className="w-full py-3 bg-[#635bff] text-white font-semibold rounded-xl hover:bg-[#5249e0] active:scale-[0.99] transition-all text-sm disabled:opacity-50"
                    >
                      {loading === "tarjeta"
                        ? "Abriendo pago seguro…"
                        : `💳 Pagar con tarjeta · $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={loading !== null}
                    className={`w-full py-3 font-semibold rounded-xl active:scale-[0.99] transition-all text-sm disabled:opacity-50 ${
                      aceptaTarjeta
                        ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {loading === "pedido"
                      ? "Procesando…"
                      : aceptaTarjeta
                      ? "Pedir y pagar por WhatsApp"
                      : `Confirmar pedido · $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckout(false)}
                    disabled={loading !== null}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ← Volver al carrito
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    {aceptaTarjeta
                      ? "Paga seguro con Stripe, o pide ahora y coordinamos el cobro por WhatsApp."
                      : "Te contactamos por WhatsApp para el cobro y la entrega."}
                  </p>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
