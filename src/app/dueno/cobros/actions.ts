"use server";

import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDevContext } from "@/lib/supabase/devClient";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export interface EstadoStripe {
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

// Lee el estado de la cuenta conectada y sincroniza a la BD.
export async function estadoStripe(): Promise<EstadoStripe> {
  const { tenantId } = await getDevContext();
  const admin = createAdminClient();

  const { data: tenant } = await admin
    .schema("nexia_tienda")
    .from("tenants")
    .select("stripe_account_id")
    .eq("id", tenantId)
    .single();

  const acctId = tenant?.stripe_account_id;
  if (!acctId) return { connected: false, chargesEnabled: false, detailsSubmitted: false };

  try {
    const acct = await getStripe().accounts.retrieve(acctId);
    const chargesEnabled = !!acct.charges_enabled;
    const detailsSubmitted = !!acct.details_submitted;

    await admin
      .schema("nexia_tienda")
      .from("tenants")
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_onboarded_at: detailsSubmitted ? new Date().toISOString() : null,
      })
      .eq("id", tenantId);

    return { connected: true, chargesEnabled, detailsSubmitted };
  } catch {
    return { connected: false, chargesEnabled: false, detailsSubmitted: false };
  }
}

// Crea (si no existe) la cuenta Express del dueño y devuelve el link de onboarding hospedado por Stripe.
export async function conectarStripe(): Promise<{ url?: string; error?: string }> {
  try {
    const { tenantId } = await getDevContext();
    const admin = createAdminClient();
    const stripe = getStripe();

    const { data: tenant } = await admin
      .schema("nexia_tienda")
      .from("tenants")
      .select("stripe_account_id, name")
      .eq("id", tenantId)
      .single();
    if (!tenant) return { error: "No se encontró la tienda." };

    let accountId = tenant.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "MX",
        business_profile: { name: tenant.name ?? undefined },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await admin
        .schema("nexia_tienda")
        .from("tenants")
        .update({ stripe_account_id: accountId })
        .eq("id", tenantId);
    }

    const base = await baseUrl();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dueno/cobros?refresh=1`,
      return_url: `${base}/dueno/cobros?done=1`,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (e) {
    console.error("[conectarStripe]", e);
    return { error: e instanceof Error ? e.message : "Error al conectar con Stripe." };
  }
}
