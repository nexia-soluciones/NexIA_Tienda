import { estadoStripe } from "./actions";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe/server";
import ConectarStripeButton from "./ConectarStripeButton";

export const dynamic = "force-dynamic";

export default async function CobrosPage() {
  const estado = await estadoStripe();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Cobros con tarjeta</h1>
      <p className="text-sm text-gray-500 mb-6">
        Conecta tu cuenta de Stripe para recibir pagos con tarjeta directo en tu banco.
      </p>

      {/* Estado de la conexión */}
      <div className="border border-gray-200 rounded-2xl p-6 bg-white">
        {estado.chargesEnabled ? (
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-gray-900">Tu cuenta está conectada y lista para cobrar</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Los clientes ya pueden pagar con tarjeta en tu tienda. El dinero llega a tu cuenta de Stripe.
              </p>
            </div>
          </div>
        ) : estado.connected ? (
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-gray-900">Falta completar tus datos en Stripe</p>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">
                Ya empezaste la conexión, pero Stripe necesita más información (datos bancarios o de
                identidad) para habilitar los cobros.
              </p>
              <ConectarStripeButton chargesEnabled={false} />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="font-semibold text-gray-900">Aún no has conectado tu cuenta</p>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">
                Conecta tu cuenta de Stripe en unos minutos. Stripe te guía paso a paso para registrar
                tus datos y tu banco — nosotros no manejamos tus tarjetas ni tus datos financieros.
              </p>
              <ConectarStripeButton chargesEnabled={false} />
            </div>
          </div>
        )}
      </div>

      {/* Nota de comisión */}
      <div className="mt-4 text-xs text-gray-400 leading-relaxed">
        <p>
          Por cada venta pagada con tarjeta, Nexia retiene una comisión del{" "}
          <span className="font-medium text-gray-500">{PLATFORM_FEE_PERCENT}%</span> (más las
          comisiones de Stripe). El resto llega directo a tu cuenta.
        </p>
        {estado.chargesEnabled && (
          <p className="mt-1">
            ¿Necesitas actualizar tu banco o datos? Vuelve a abrir Stripe con el botón.
            {" "}
            <span className="inline-block mt-2">
              <ConectarStripeButton chargesEnabled />
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
