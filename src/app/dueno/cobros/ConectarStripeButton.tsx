"use client";

import { useState } from "react";
import { conectarStripe } from "./actions";

export default function ConectarStripeButton({ chargesEnabled }: { chargesEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    const res = await conectarStripe();
    if (res.url) {
      window.location.href = res.url; // a la pantalla hospedada de Stripe
    } else {
      setError(res.error ?? "No se pudo iniciar la conexión.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handle}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#635bff] text-white font-semibold rounded-xl hover:bg-[#5249e0] active:scale-[0.99] transition-all text-sm disabled:opacity-50"
      >
        {loading
          ? "Abriendo Stripe…"
          : chargesEnabled
          ? "Actualizar mis datos de cobro"
          : "Conectar mi cuenta para cobrar"}
      </button>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
