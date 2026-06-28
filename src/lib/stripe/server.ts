import "server-only";
import Stripe from "stripe";

// Cliente de Stripe — SOLO servidor. La secret key nunca llega al cliente.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada en .env.local");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Comisión de Nexia por venta (application fee). Configurable por env.
export const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? "5");
