"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Logout del lado del cliente: evita el POST a /auth/logout que Traefik bloquea (405) en EasyPanel.
export default function LogoutButton({
  className,
  label = "Cerrar sesión",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // aunque falle el signOut remoto, limpiamos y mandamos al login
    }
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className={className}>
      {loading ? "Saliendo…" : label}
    </button>
  );
}
