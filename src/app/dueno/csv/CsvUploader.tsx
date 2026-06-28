"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface CsvRow {
  sku: string;
  name: string;
  price: string;
  category?: string;
  description?: string;
  benefits_description?: string;
  search_tags?: string;
  stock?: string;
  low_stock_threshold?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; sku: string; message: string }[];
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n").map((l) => l.replace(/\r$/, ""));
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // Manejo básico de comas dentro de comillas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row as unknown as CsvRow);
  }
  return rows;
}

export default function CsvUploader({ tenantId }: { tenantId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvRow[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setResult(null);

    // Excel en Windows suele exportar CSV en Windows-1252, no UTF-8.
    // file.text() asume UTF-8 y convierte los acentos en U+FFFD (mojibake).
    // Leemos los bytes y, si no son UTF-8 válido, decodificamos como Windows-1252.
    const buffer = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder("windows-1252").decode(buffer);
    }
    const rows = parseCsv(text);
    setPreview(rows);
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return;
    setImporting(true);

    const supabase = createClient();
    const res: ImportResult = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i];
      const rowNum = i + 2; // +2 porque row 1 es encabezado

      if (!row.sku || !row.name || !row.price) {
        res.errors.push({ row: rowNum, sku: row.sku ?? "?", message: "sku, name y price son requeridos" });
        continue;
      }

      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        res.errors.push({ row: rowNum, sku: row.sku, message: "precio inválido" });
        continue;
      }

      const tags = row.search_tags
        ? row.search_tags.split("|").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const productPayload = {
        tenant_id: tenantId,
        sku: row.sku,
        name: row.name,
        price,
        category: row.category || null,
        description: row.description || null,
        benefits_description: row.benefits_description || null,
        search_tags: tags,
        updated_at: new Date().toISOString(),
      };

      // Verificar si ya existe
      const { data: existing } = await supabase
        .schema("nexia_tienda")
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("sku", row.sku)
        .single();

      if (existing) {
        // Actualizar
        const { error } = await supabase
          .schema("nexia_tienda")
          .from("products")
          .update(productPayload)
          .eq("id", existing.id);

        if (error) {
          res.errors.push({ row: rowNum, sku: row.sku, message: error.message });
          continue;
        }

        // Upsert inventario si se especificó stock
        if (row.stock !== undefined) {
          await supabase
            .schema("nexia_tienda")
            .from("inventory")
            .upsert(
              {
                product_id: existing.id,
                tenant_id: tenantId,
                stock: parseInt(row.stock ?? "0"),
                low_stock_threshold: parseInt(row.low_stock_threshold ?? "5"),
              },
              { onConflict: "product_id" }
            );
        }
        res.updated++;
      } else {
        // Crear nuevo
        const { data: newProd, error } = await supabase
          .schema("nexia_tienda")
          .from("products")
          .insert(productPayload)
          .select("id")
          .single();

        if (error || !newProd) {
          res.errors.push({ row: rowNum, sku: row.sku, message: error?.message ?? "error desconocido" });
          continue;
        }

        await supabase
          .schema("nexia_tienda")
          .from("inventory")
          .insert({
            product_id: newProd.id,
            tenant_id: tenantId,
            stock: parseInt(row.stock ?? "0"),
            low_stock_threshold: parseInt(row.low_stock_threshold ?? "5"),
          });

        res.created++;
      }
    }

    setResult(res);
    setPreview(null);
    setFilename(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImporting(false);
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
      >
        <p className="text-4xl mb-2">📁</p>
        <p className="text-sm font-medium text-gray-700">
          {filename ? filename : "Haz clic para seleccionar un archivo CSV"}
        </p>
        <p className="text-xs text-gray-400 mt-1">Solo archivos .csv</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Vista previa */}
      {preview && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Vista previa · {preview.length} fila{preview.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setFilename(null); }}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importing ? "Importando..." : `Importar ${preview.length} productos`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["SKU", "Nombre", "Precio", "Categoría", "Stock"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-gray-700">{row.sku}</td>
                    <td className="px-3 py-2 text-gray-800">{row.name}</td>
                    <td className="px-3 py-2 text-gray-700">${row.price}</td>
                    <td className="px-3 py-2 text-gray-500">{row.category || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{row.stock || "0"}</td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-400">
                      … y {preview.length - 10} fila{preview.length - 10 !== 1 ? "s" : ""} más
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado de importación */}
      {result && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-800">Resultado de la importación</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600">Creados</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-blue-600">Actualizados</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errores</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-700">Filas con errores:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                  Fila {e.row} · SKU {e.sku}: {e.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
