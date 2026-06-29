"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { generateImage } from "./actions";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  benefits_description: string | null;
  category: string | null;
  image_url: string | null;
  tenants: { name: string; slug: string } | null;
}

type GenerationStatus = "idle" | "generating" | "done" | "error";

export default function ImagenGeneratorPanel({
  products,
}: {
  products: Product[];
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function selectProduct(p: Product) {
    setSelected(p);
    setSaved(false);
    setGeneratedUrl(null);
    setStatus("idle");
    setError(null);
    // Auto-generar prompt basado en el producto
    const parts = [
      `Fotografía profesional de producto: "${p.name}"`,
      p.category ? `categoría: ${p.category}` : "",
      p.description ? p.description.slice(0, 80) : "",
      "fondo blanco limpio, iluminación de estudio, alta resolución",
    ].filter(Boolean);
    setPrompt(parts.join(", "));
  }

  async function handleGenerate() {
    if (!prompt.trim() || !selected) return;
    setStatus("generating");
    setError(null);
    setGeneratedUrl(null);

    try {
      const data = await generateImage({ prompt, productId: selected.id });

      if (!data.ok || !data.imageUrl) {
        throw new Error(data.error ?? "Error al generar imagen");
      }

      setGeneratedUrl(data.imageUrl);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setStatus("error");
    }
  }

  async function handleSave() {
    if (!generatedUrl || !selected) return;
    const supabase = createClient();
    await supabase
      .schema("nexia_tienda")
      .from("products")
      .update({ image_url: generatedUrl, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    setSaved(true);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel izquierdo: productos sin imagen */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">
            Productos sin imagen ({products.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
          {products.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Todos los productos tienen imagen. ¡Excelente!
            </p>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors ${
                  selected?.id === p.id ? "bg-gray-800 border-l-2 border-purple-500" : ""
                }`}
              >
                <p className="text-sm font-medium text-gray-200">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.tenants?.name ?? "?"} · {p.sku}
                  {p.category ? ` · ${p.category}` : ""}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panel derecho: generador */}
      <div className="space-y-4">
        {!selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            <p className="text-4xl mb-3">🎨</p>
            <p className="text-sm">Selecciona un producto de la lista para generar su imagen.</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Producto seleccionado</p>
              <p className="font-semibold text-white">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.tenants?.name} · SKU: {selected.sku}</p>
            </div>

            {/* Editor de prompt */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-medium text-gray-400">
                Descripción para la IA (prompt)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe la imagen que quieres generar..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={status === "generating" || !prompt.trim()}
                className="w-full bg-purple-600 text-white text-sm py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {status === "generating" ? "Generando imagen..." : "Generar imagen con IA"}
              </button>
              <p className="text-xs text-gray-600 text-center">
                Se usará la API de generación de imágenes configurada en el servidor.
              </p>
            </div>

            {/* Error */}
            {status === "error" && error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Imagen generada */}
            {status === "done" && generatedUrl && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-gray-400">Imagen generada</p>
                <div className="aspect-square rounded-xl overflow-hidden relative">
                  <Image
                    src={generatedUrl}
                    alt={selected.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setStatus("idle"); setGeneratedUrl(null); setSaved(false); }}
                    className="flex-shrink-0 border border-gray-700 text-gray-400 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Regenerar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      saved
                        ? "bg-green-700 text-green-200"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {saved ? "✓ Guardada en el producto" : "Guardar como foto del producto"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
