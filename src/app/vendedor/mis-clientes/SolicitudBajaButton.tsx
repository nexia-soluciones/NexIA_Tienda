"use client";

import { useState } from "react";
import { solicitarBaja } from "./actions";

interface Props {
  invitationId: string;
  targetEmail: string;
}

export default function SolicitudBajaButton({ invitationId, targetEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await solicitarBaja({ invitationId, reason });

      if (!data.ok) {
        setError(data.error ?? "Error al enviar la solicitud.");
      } else {
        setDone(true);
        setOpen(false);
      }
    } catch {
      setError("Error al enviar la solicitud.");
    }

    setLoading(false);
  }

  if (done) {
    return (
      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        Solicitud enviada
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded px-2 py-1 transition-colors"
      >
        Solicitar baja
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Solicitar baja de usuario</h3>
              <p className="text-sm text-gray-500 mt-1">
                Se enviará una solicitud al administrador para dar de baja a{" "}
                <span className="font-medium text-gray-800">{targetEmail}</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explica brevemente el motivo..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
