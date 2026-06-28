"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registrarTienda } from "./actions";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "short";

export default function RegistroPage() {
  const router = useRouter();
  const slugCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  const [form, setForm] = useState({
    storeName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Auto-generar slug desde el nombre de la tienda
  useEffect(() => {
    if (form.storeName) {
      setForm((prev) => ({ ...prev, slug: slugify(form.storeName) }));
    }
  }, [form.storeName]);

  // Verificar disponibilidad con debounce
  useEffect(() => {
    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);

    const slug = form.slug.trim();
    if (!slug) { setSlugStatus("idle"); return; }
    if (slug.length < 3) { setSlugStatus("short"); return; }

    setSlugStatus("checking");
    slugCheckRef.current = setTimeout(async () => {
      const res = await fetch(`/api/registro?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    }, 500);

    return () => { if (slugCheckRef.current) clearTimeout(slugCheckRef.current); };
  }, [form.slug]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (slugStatus === "taken") {
      setError("El identificador ya está en uso. Elige otro.");
      return;
    }
    if (slugStatus === "short" || !form.slug) {
      setError("El identificador debe tener al menos 3 caracteres.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // Paso 1: Crear usuario con signUp (no requiere service role)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.ownerName || form.storeName },
      },
    });

    if (signUpError) {
      const msg = signUpError.message;
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setError("Este email ya tiene una cuenta. Inicia sesión.");
      } else {
        setError(msg);
      }
      setSubmitting(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setError("Error al crear la cuenta. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    // Paso 2: Crear tenant + asignar rol — Server Action (evita el 405 de Traefik en POST /api/)
    const data = await registrarTienda({
      storeName: form.storeName,
      slug: form.slug,
      userId,
    });

    if (!data.ok) {
      // Si falla el tenant, cerrar la sesión recién creada
      await supabase.auth.signOut();
      setError(data.error ?? "Error al crear la tienda. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    // Paso 3: Si Supabase requiere confirmación de email, la sesión puede ser null
    if (!signUpData.session) {
      // Usuario creado pero pendiente de confirmar email
      // El tenant ya está creado, mostrar mensaje
      router.push(`/registro/confirmar?email=${encodeURIComponent(form.email)}`);
      return;
    }

    // Sesión activa → ir directo al onboarding
    router.push("/dueno/onboarding");
  }

  const slugIndicator = {
    idle:      { text: "",                    color: "text-gray-400" },
    short:     { text: "Mínimo 3 caracteres", color: "text-gray-400" },
    checking:  { text: "Verificando...",       color: "text-gray-400" },
    available: { text: "✓ Disponible",         color: "text-green-600" },
    taken:     { text: "✗ Ya está en uso",     color: "text-red-600"   },
  }[slugStatus];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Crea tu tienda</h1>
          <p className="text-gray-500 mt-2 text-sm">
            En menos de 2 minutos tu catálogo estará en línea.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5"
        >
          {/* Nombre de la tienda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre de tu tienda *
            </label>
            <input
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
              required
              placeholder="Ej: Naturalmente Salud, Tienda Verde..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Slug / URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Identificador de tu tienda (URL)
            </label>
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-300 whitespace-nowrap">
                /tienda/
              </span>
              <input
                name="slug"
                value={form.slug}
                onChange={handleSlugChange}
                required
                placeholder="mi-tienda"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
              />
            </div>
            <p className={`text-xs mt-1 ${slugIndicator.color}`}>
              {slugIndicator.text}
            </p>
          </div>

          {/* Nombre del dueño */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tu nombre
            </label>
            <input
              name="ownerName"
              value={form.ownerName}
              onChange={handleChange}
              placeholder="Ej: María García"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <hr className="border-gray-100" />

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email *
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contraseñas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña *
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Mín. 8 caracteres"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar
              </label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repite la contraseña"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || slugStatus === "taken" || slugStatus === "checking"}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creando tu tienda..." : "Crear tienda gratis"}
          </button>

          <p className="text-center text-xs text-gray-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
