"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { procesarBaja } from "./actions";

interface Props {
  requestId: string;
  targetEmail: string;
}

export default function ProcesarBajaButton({ requestId, targetEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: "aprobar" | "rechazar") {
    setLoading(action);
    setError(null);

    try {
      const data = await procesarBaja({ requestId, action });

      if (!data.ok) {
        setError(data.error ?? "Error al procesar la solicitud.");
        setLoading(null);
      } else {
        router.refresh();
      }
    } catch {
      setError("Error al procesar la solicitud.");
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      <button
        onClick={() => handle("rechazar")}
        disabled={!!loading}
        className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {loading === "rechazar" ? "..." : "Rechazar"}
      </button>
      <button
        onClick={() => handle("aprobar")}
        disabled={!!loading}
        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading === "aprobar" ? "..." : "Aprobar baja"}
      </button>
    </div>
  );
}
