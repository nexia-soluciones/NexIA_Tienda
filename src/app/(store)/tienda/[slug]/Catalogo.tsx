"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

interface Producto {
  id: string;
  name: string;
  description: string | null;
  benefits_description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
}

export default function Catalogo({
  products,
  slug,
}: {
  products: Producto[];
  slug: string;
}) {
  const categorias = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[],
    [products]
  );
  const [activa, setActiva] = useState<string | null>(null);

  const visibles = activa ? products.filter((p) => p.category === activa) : products;

  return (
    <div>
      {/* Filtro por categoría (clickable) */}
      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiva(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activa === null
                ? "bg-[var(--brand-primary,#16a34a)] text-white border-transparent"
                : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
            }`}
          >
            Todos ({products.length})
          </button>
          {categorias.map((cat) => {
            const n = products.filter((p) => p.category === cat).length;
            const sel = activa === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiva(sel ? null : cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  sel
                    ? "bg-[var(--brand-primary,#16a34a)] text-white border-transparent"
                    : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                }`}
              >
                {cat} ({n})
              </button>
            );
          })}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>No hay productos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibles.map((product) => (
            <Link
              key={product.id}
              href={`/tienda/${slug}/producto/${product.id}`}
              className="group border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div className="aspect-square bg-gray-100 relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
                    📦
                  </div>
                )}
                {product.category && (
                  <span className="absolute top-2 left-2 text-xs bg-white/90 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                    {product.category}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900 group-hover:text-[var(--brand-primary,#2563eb)] transition-colors">
                  {product.name}
                </h2>
                {product.benefits_description ? (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.benefits_description}</p>
                ) : product.description ? (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                ) : null}
                <p className="text-xl font-bold text-gray-900 mt-3">
                  ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
