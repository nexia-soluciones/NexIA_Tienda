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

  const chip = (sel: boolean) =>
    `text-xs px-3.5 py-2 rounded-full border font-medium transition-all ${
      sel
        ? "text-white border-transparent shadow-sm scale-105"
        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    }`;

  return (
    <div>
      {/* Filtro por categoría */}
      {categorias.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiva(null)}
            className={chip(activa === null)}
            style={activa === null ? { backgroundColor: "var(--brand-primary,#16a34a)" } : undefined}
          >
            ✦ Todos ({products.length})
          </button>
          {categorias.map((cat) => {
            const n = products.filter((p) => p.category === cat).length;
            const sel = activa === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiva(sel ? null : cat)}
                className={chip(sel)}
                style={sel ? { backgroundColor: "var(--brand-primary,#16a34a)" } : undefined}
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibles.map((product) => (
            <Link
              key={product.id}
              href={`/tienda/${slug}/producto/${product.id}`}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
                    📦
                  </div>
                )}
                {product.category && (
                  <span
                    className="absolute top-2.5 left-2.5 text-[10px] font-medium text-white px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: "color-mix(in srgb, var(--brand-primary,#16a34a) 88%, transparent)" }}
                  >
                    {product.category}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[var(--brand-primary,#16a34a)] transition-colors">
                  {product.name}
                </h2>
                {product.benefits_description ? (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{product.benefits_description}</p>
                ) : product.description ? (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{product.description}</p>
                ) : null}
                <div className="flex items-center justify-between mt-3">
                  <p
                    className="text-xl font-extrabold"
                    style={{ color: "var(--brand-primary,#16a34a)" }}
                  >
                    ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                  <span
                    className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--brand-accent,#0ea5e9)" }}
                  >
                    Ver →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
