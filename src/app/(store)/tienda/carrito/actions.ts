"use server";

import { headers } from "next/headers";
import { getStripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Mismo Google Form que usa el bot de Telegram → cae en el MISMO Google Sheet.
const GOOGLE_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdenR5i_5RZ_2wVlG0DGffbDzCqdEVQfjG1RJYeru8ar0X6BA/formResponse";

interface CartLine {
  id: string;
  quantity: number;
}
interface Cliente {
  nombre: string;
  telefono: string;
  direccion: string;
}
interface Linea {
  product_id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
}
export interface CrearPedidoResult {
  ok: boolean;
  orderId?: string;
  error?: string;
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function validarCliente(c: Cliente): string | null {
  const nombre = (c?.nombre || "").trim();
  const telefono = (c?.telefono || "").trim();
  const direccion = (c?.direccion || "").trim();
  if (!nombre || !telefono || !direccion) return "Faltan datos: nombre, WhatsApp y dirección.";
  if (telefono.replace(/\D/g, "").length < 10) return "El WhatsApp debe tener al menos 10 dígitos.";
  return null;
}

// Re-cotiza SIEMPRE desde la BD — nunca confiar en el precio del localStorage.
async function cotizar(
  items: CartLine[]
): Promise<{ tenant_id: string; lines: Linea[]; total: number } | null> {
  if (!Array.isArray(items) || items.length === 0) return null;
  const supabase = createAdminClient();
  const ids = [...new Set(items.map((i) => i.id))];
  const { data: products, error } = await supabase
    .schema("nexia_tienda")
    .from("products")
    .select("id, name, sku, price, tenant_id")
    .in("id", ids);
  if (error || !products || products.length === 0) return null;

  const tenantIds = [...new Set(products.map((p) => p.tenant_id))];
  if (tenantIds.length !== 1) return null;

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items
    .map((i) => {
      const p = byId.get(i.id);
      if (!p) return null;
      const quantity = Math.max(1, Math.floor(Number(i.quantity) || 1));
      return { product_id: p.id, name: p.name, sku: p.sku ?? null, quantity, unit_price: Number(p.price) };
    })
    .filter((l): l is Linea => l !== null);
  if (lines.length === 0) return null;

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  return { tenant_id: tenantIds[0], lines, total };
}

// Inserta orden + items + registra en el Google Sheet. Devuelve el order_id.
async function crearOrdenYSheet(
  cliente: Cliente,
  cot: { tenant_id: string; lines: Linea[]; total: number },
  metadata: Record<string, string>,
  paymentStatus: "unpaid" | "pending" | "paid" | "refunded" = "unpaid"
): Promise<string | null> {
  const supabase = createAdminClient();
  const notes = `Tel: ${cliente.telefono.trim()} / Dir: ${cliente.direccion.trim()}`;

  const { data: order, error: oErr } = await supabase
    .schema("nexia_tienda")
    .from("orders")
    .insert({
      tenant_id: cot.tenant_id,
      status: "recibido",
      payment_status: paymentStatus,
      total: cot.total,
      customer_name: cliente.nombre.trim(),
      customer_phone: cliente.telefono.trim(),
      customer_address: cliente.direccion.trim(),
      notes,
      metadata,
    })
    .select("id")
    .single();
  if (oErr || !order) return null;

  await supabase
    .schema("nexia_tienda")
    .from("order_items")
    .insert(
      cot.lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_name: l.name, // snapshot: nombre congelado al comprar
        sku: l.sku, // snapshot: SKU congelado al comprar
        quantity: l.quantity,
        unit_price: l.unit_price,
      }))
    );

  try {
    await registrarEnSheet({ orderId: order.id, cliente, lines: cot.lines, total: cot.total });
  } catch (e) {
    console.error("[sheet]", e instanceof Error ? e.message : e);
  }
  return order.id;
}

// ── Flujo SIN pago en línea (pedido recibido + contacto por WhatsApp) ──
export async function crearPedidoWeb(items: CartLine[], cliente: Cliente): Promise<CrearPedidoResult> {
  try {
    const err = validarCliente(cliente);
    if (err) return { ok: false, error: err };
    const cot = await cotizar(items);
    if (!cot) return { ok: false, error: "No se pudieron validar los productos del carrito." };
    const orderId = await crearOrdenYSheet(cliente, cot, { source: "web" }, "unpaid");
    if (!orderId) return { ok: false, error: "No se pudo crear el pedido. Intenta de nuevo." };
    return { ok: true, orderId };
  } catch (e) {
    console.error("[crearPedidoWeb]", e);
    return { ok: false, error: "Error inesperado al procesar el pedido." };
  }
}

// ── ¿La tienda de este carrito acepta tarjeta? (tiene Stripe conectado) ──
export async function tiendaAceptaTarjeta(items: CartLine[]): Promise<{ enabled: boolean }> {
  try {
    const cot = await cotizar(items);
    if (!cot) return { enabled: false };
    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .schema("nexia_tienda")
      .from("tenants")
      .select("stripe_charges_enabled")
      .eq("id", cot.tenant_id)
      .single();
    return { enabled: !!tenant?.stripe_charges_enabled };
  } catch {
    return { enabled: false };
  }
}

// ── Flujo CON tarjeta: crea pedido + Checkout Session en la cuenta del dueño ──
export async function crearCheckoutStripe(
  items: CartLine[],
  cliente: Cliente
): Promise<{ url?: string; error?: string }> {
  try {
    const err = validarCliente(cliente);
    if (err) return { error: err };
    const cot = await cotizar(items);
    if (!cot) return { error: "No se pudieron validar los productos del carrito." };

    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .schema("nexia_tienda")
      .from("tenants")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("id", cot.tenant_id)
      .single();
    if (!tenant?.stripe_account_id || !tenant?.stripe_charges_enabled) {
      return { error: "Esta tienda aún no tiene pagos con tarjeta habilitados." };
    }

    const orderId = await crearOrdenYSheet(cliente, cot, { source: "web", payment_status: "pending" }, "pending");
    if (!orderId) return { error: "No se pudo crear el pedido." };

    const totalCentavos = Math.round(cot.total * 100);
    const feeCentavos = Math.round((totalCentavos * PLATFORM_FEE_PERCENT) / 100);
    const base = await baseUrl();

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: cot.lines.map((l) => ({
          price_data: {
            currency: "mxn",
            unit_amount: Math.round(l.unit_price * 100),
            product_data: { name: l.name },
          },
          quantity: l.quantity,
        })),
        payment_intent_data: {
          application_fee_amount: feeCentavos,
          metadata: { order_id: orderId, tenant_id: cot.tenant_id },
        },
        metadata: { order_id: orderId, tenant_id: cot.tenant_id, source: "web" },
        success_url: `${base}/tienda/carrito?pago=ok&order=${orderId}`,
        cancel_url: `${base}/tienda/carrito?pago=cancel`,
      },
      { stripeAccount: tenant.stripe_account_id } // cargo directo en la cuenta del dueño
    );

    if (!session.url) return { error: "No se pudo iniciar el pago." };
    return { url: session.url };
  } catch (e) {
    console.error("[crearCheckoutStripe]", e);
    return { error: e instanceof Error ? e.message : "Error al iniciar el pago." };
  }
}

async function registrarEnSheet(args: {
  orderId: string;
  cliente: Cliente;
  lines: { name: string; quantity: number }[];
  total: number;
}) {
  const productos = args.lines.map((l) => `${l.name} x${l.quantity}`).join("; ");
  const cantidad = args.lines.reduce((s, l) => s + l.quantity, 0);
  const body = new URLSearchParams({
    "entry.2049811377": "web",
    "entry.2079790119": String(args.orderId),
    "entry.1942425521": args.cliente.nombre.trim(),
    "entry.1653790148": args.cliente.telefono.trim(),
    "entry.1588836309": productos,
    "entry.1976439785": String(cantidad),
    "entry.2087472238": String(args.total),
    "entry.181997826": String(args.total),
    "entry.1096979497": "recibido",
  });
  await fetch(GOOGLE_FORM, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}
