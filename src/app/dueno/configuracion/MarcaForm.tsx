"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { guardarMarca } from "./actions";

interface MarcaData {
  name: string;
  logo_url: string | null;
  color_primary: string | null;
  color_accent: string | null;
  tagline: string | null;
}

const DEFAULT_PRIMARY = "#16a34a";
const DEFAULT_ACCENT = "#0ea5e9";

export default function MarcaForm({
  tenant,
  tenantId,
}: {
  tenant: MarcaData;
  tenantId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logo_url ?? null);
  const [colorPrimary, setColorPrimary] = useState(tenant.color_primary ?? DEFAULT_PRIMARY);
  const [colorAccent, setColorAccent] = useState(tenant.color_accent ?? DEFAULT_ACCENT);
  const [tagline, setTagline] = useState(tenant.tagline ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Error al subir el logo: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await guardarMarca({
      logoUrl,
      colorPrimary,
      colorAccent,
      tagline: tagline || null,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Error al guardar.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7 max-w-2xl">
      {/* Logo */}
      <section>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo de la tienda</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-xl bg-gray-100 relative overflow-hidden flex-shrink-0 border border-gray-200">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1.5" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                🏪
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                  Quitar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP o SVG · se muestra en tu tienda pública.</p>
          </div>
        </div>
      </section>

      {/* Colores */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color primario</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorPrimary}
              onChange={(e) => {
                setColorPrimary(e.target.value);
                setSaved(false);
              }}
              className="h-11 w-14 rounded-lg border border-gray-300 cursor-pointer bg-white p-1"
            />
            <input
              type="text"
              value={colorPrimary}
              onChange={(e) => {
                setColorPrimary(e.target.value);
                setSaved(false);
              }}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Color principal de tu marca (header, filtros, acentos).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color de acento</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorAccent}
              onChange={(e) => {
                setColorAccent(e.target.value);
                setSaved(false);
              }}
              className="h-11 w-14 rounded-lg border border-gray-300 cursor-pointer bg-white p-1"
            />
            <input
              type="text"
              value={colorAccent}
              onChange={(e) => {
                setColorAccent(e.target.value);
                setSaved(false);
              }}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Color secundario para detalles y resaltados.</p>
        </div>
      </section>

      {/* Tagline */}
      <section>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tagline / lema</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => {
            setTagline(e.target.value);
            setSaved(false);
          }}
          maxLength={120}
          placeholder="Ej. Suplementos naturales para tu bienestar"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Una frase corta que aparece debajo del nombre en tu tienda.</p>
      </section>

      {/* Vista previa */}
      <section>
        <label className="block text-sm font-medium text-gray-700 mb-2">Vista previa</label>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: colorPrimary }} />
          <div className="flex items-center gap-3 p-4 bg-white">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
              style={{ backgroundColor: logoUrl ? "transparent" : colorPrimary }}
            >
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-contain" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {(tenant.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900">{tenant.name}</p>
              {tagline && <p className="text-sm text-gray-500">{tagline}</p>}
            </div>
            <span
              className="ml-auto text-xs px-3 py-1.5 rounded-full text-white font-medium"
              style={{ backgroundColor: colorAccent }}
            >
              Acento
            </span>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-blue-600 text-white text-sm px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Guardado ✓</span>}
      </div>
    </form>
  );
}
