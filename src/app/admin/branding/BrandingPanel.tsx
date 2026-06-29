"use client";

import { useState } from "react";
import { generateBranding } from "./actions";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface BrandKit {
  nombre: string;
  slogan: string;
  colores: { nombre: string; hex: string; uso: string }[];
  tipografias: { nombre: string; uso: string }[];
  tono: string;
  valores: string[];
  descripcion: string;
}

export default function BrandingPanel({ tenants }: { tenants: Tenant[] }) {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [giro, setGiro] = useState("");
  const [publico, setPublico] = useState("");
  const [generating, setGenerating] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!selectedTenant || !giro.trim()) return;
    setGenerating(true);
    setError(null);
    setBrandKit(null);

    try {
      const data = await generateBranding({
        tenantName: selectedTenant.name,
        giro,
        publico,
      });

      if (!data.ok || !data.brandKit) throw new Error(data.error ?? "Error al generar branding");

      setBrandKit(data.brandKit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulario */}
      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Tenant
            </label>
            <select
              value={selectedTenant?.id ?? ""}
              onChange={(e) => {
                const t = tenants.find((t) => t.id === e.target.value);
                setSelectedTenant(t ?? null);
                setBrandKit(null);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecciona un tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Giro del negocio *
            </label>
            <input
              type="text"
              value={giro}
              onChange={(e) => setGiro(e.target.value)}
              placeholder="Ej: salud natural, suplementos deportivos, tés medicinales..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Público objetivo
            </label>
            <input
              type="text"
              value={publico}
              onChange={(e) => setPublico(e.target.value)}
              placeholder="Ej: adultos 30-50 años, mujeres interesadas en bienestar..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedTenant || !giro.trim()}
            className="w-full bg-emerald-600 text-white text-sm py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generando brand kit..." : "Generar Brand Kit con IA"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Brand Kit generado */}
      {brandKit ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">{brandKit.nombre}</h3>
            <p className="text-sm text-gray-400 italic mt-0.5">&ldquo;{brandKit.slogan}&rdquo;</p>
          </div>

          <p className="text-sm text-gray-300">{brandKit.descripcion}</p>

          {/* Paleta de colores */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Paleta de colores
            </h4>
            <div className="space-y-2">
              {brandKit.colores.map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-gray-700 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div>
                    <p className="text-sm text-gray-200 font-medium">{color.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {color.hex} · {color.uso}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipografías */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Tipografías
            </h4>
            <div className="space-y-1.5">
              {brandKit.tipografias.map((font) => (
                <div key={font.nombre} className="flex items-center justify-between">
                  <span className="text-sm text-gray-200 font-medium">{font.nombre}</span>
                  <span className="text-xs text-gray-500">{font.uso}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tono y valores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Tono de voz
              </h4>
              <p className="text-sm text-gray-300">{brandKit.tono}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Valores
              </h4>
              <div className="flex flex-wrap gap-1">
                {brandKit.valores.map((v) => (
                  <span
                    key={v}
                    className="text-xs bg-emerald-900/50 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const content = JSON.stringify(brandKit, null, 2);
              const blob = new Blob([content], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `brandkit-${selectedTenant?.slug ?? "tenant"}.json`;
              a.click();
            }}
            className="w-full border border-gray-700 text-gray-400 text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ⬇️ Exportar Brand Kit (JSON)
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-600">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-sm">
            Completa el formulario y genera un brand kit personalizado para el tenant.
          </p>
        </div>
      )}
    </div>
  );
}
