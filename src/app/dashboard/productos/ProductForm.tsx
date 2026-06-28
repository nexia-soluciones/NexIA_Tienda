"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { embedOne } from "@/lib/pgrest";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  metadata: Record<string, unknown> | null;
  updated_at: string;
  inventory: { stock: number; low_stock_threshold: number }[] | null;
}

export default function ProductForm({ product }: { product: Product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? "");
  const [metadataRaw, setMetadataRaw] = useState(
    product.metadata ? JSON.stringify(product.metadata, null, 2) : ""
  );

  const inv = embedOne(product.inventory);
  const isLowStock = inv && inv.stock < inv.low_stock_threshold;

  async function handleSave() {
    setSaving(true);
    setError(null);

    let metadata: Record<string, unknown> | null = null;
    if (metadataRaw.trim()) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        setError("El JSON de metadatos no es válido.");
        setSaving(false);
        return;
      }
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .schema("nexia_tienda")
      .from("products")
      .update({
        price: parseFloat(price),
        description: description || null,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded shrink-0">
            {product.sku}
          </span>
          <span className="font-medium text-gray-900 truncate">
            {product.name}
          </span>
          {!product.description && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
              Sin descripción
            </span>
          )}
          {isLowStock && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full shrink-0">
              Stock bajo ({inv?.stock})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className="font-semibold text-gray-700">
            ${Number(price).toFixed(2)}
          </span>
          <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Editable panel */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Precio (MXN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Stock actual
              </label>
              <input
                type="text"
                value={inv ? `${inv.stock} unidades (umbral: ${inv.low_stock_threshold})` : "Sin inventario"}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descripción del producto..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Metadatos (JSON)
            </label>
            <textarea
              value={metadataRaw}
              onChange={(e) => setMetadataRaw(e.target.value)}
              rows={4}
              placeholder='{"marca": "...", "categoria": "..."}'
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
