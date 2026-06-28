"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ProductData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  benefits_description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  search_tags: string[];
  inventory: { id: string; stock: number; low_stock_threshold: number }[] | null;
}

export default function ProductEditor({
  product,
  tenantId,
  isNew,
}: {
  product: ProductData | null;
  tenantId: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    benefits_description: product?.benefits_description ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? "",
    search_tags: product?.search_tags?.join(", ") ?? "",
    stock: product?.inventory?.[0]?.stock?.toString() ?? "0",
    low_stock_threshold: product?.inventory?.[0]?.low_stock_threshold?.toString() ?? "5",
    image_url: product?.image_url ?? "",
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Error al subir imagen: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;
    setForm((prev) => ({ ...prev, image_url: publicUrl }));
    setPreviewUrl(publicUrl);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const tags = form.search_tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      sku: form.sku,
      name: form.name,
      description: form.description || null,
      benefits_description: form.benefits_description || null,
      price: parseFloat(form.price),
      category: form.category || null,
      search_tags: tags,
      image_url: form.image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { data: newProd, error: insertError } = await supabase
        .schema("nexia_tienda")
        .from("products")
        .insert({ ...payload, tenant_id: tenantId })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      // Crear registro de inventario
      await supabase
        .schema("nexia_tienda")
        .from("inventory")
        .insert({
          product_id: newProd!.id,
          tenant_id: tenantId,
          stock: parseInt(form.stock),
          low_stock_threshold: parseInt(form.low_stock_threshold),
        });
    } else {
      const { error: updateError } = await supabase
        .schema("nexia_tienda")
        .from("products")
        .update(payload)
        .eq("id", product!.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Upsert inventario: inserta si no existe, actualiza si ya existe
      await supabase
        .schema("nexia_tienda")
        .from("inventory")
        .upsert(
          {
            product_id: product!.id,
            tenant_id: tenantId,
            stock: parseInt(form.stock),
            low_stock_threshold: parseInt(form.low_stock_threshold),
          },
          { onConflict: "product_id" }
        );
    }

    router.push("/dueno/productos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Imagen */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foto del producto
        </label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-xl bg-gray-100 relative overflow-hidden flex-shrink-0">
            {previewUrl ? (
              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                📦
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Subiendo..." : "Seleccionar imagen"}
            </button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP · máx. 5 MB</p>
            {form.image_url && (
              <p className="text-xs text-green-600 mt-1 truncate">✓ Imagen cargada</p>
            )}
          </div>
        </div>
      </div>

      {/* Campos principales */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
          <input
            name="sku"
            value={form.sku}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Ej: suplementos, tés, cremas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del producto *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Beneficios{" "}
          <span className="text-gray-400 font-normal">(se muestra destacado al cliente)</span>
        </label>
        <textarea
          name="benefits_description"
          value={form.benefits_description}
          onChange={handleChange}
          rows={3}
          placeholder="Ej: Alivia el dolor de cabeza, reduce el estrés, mejora la concentración..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción general</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Tags de búsqueda{" "}
          <span className="text-gray-400 font-normal">(separados por coma)</span>
        </label>
        <input
          name="search_tags"
          value={form.search_tags}
          onChange={handleChange}
          placeholder="dolor de cabeza, estrés, insomnio, cansancio"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Los clientes encuentran este producto al buscar estos términos.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Precio (MXN) *</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Umbral mínimo</label>
          <input
            name="low_stock_threshold"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dueno/productos")}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : isNew ? "Crear producto" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
