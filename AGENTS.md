# NexIA Tienda — Guía para Agentes

> Documento para cualquier humano o agente de IA que retome este proyecto.
> Última actualización: 2026-06-11.
> Owner: Juan García (juan.garces79@icloud.com).

---

## 0. Bitácora — sesión 2026-06-29 (build-out: bot asesor, onboarding, branding, analytics, seguimiento)

Sesión grande. Todo en `main` (*deploy pendiente en EasyPanel salvo lo marcado "BD/n8n en vivo"*).

**Catálogo / categorías**
- ✅ 244 productos reclasificados de "suplementos" a **13 categorías por necesidad** (Para sentirte joven, Malestares comunes, Digestión y detox, etc.) vía Claude. (BD en vivo)
- ✅ Acentos corruptos (`�`) reparados en beneficios/tags (U+FFFD no se re-decodifica → regenerado con LLM + validación por posición). (BD en vivo)
- ✅ Filtro de categorías de la tienda pública: ahora **clickable** (`Catalogo.tsx`, antes eran `<span>` muertos).

**Bot Telegram (kpA4Qv6eXEcQ9vEe) — todo en vivo**
- ✅ **Fotos**: búsqueda por síntoma y categorías responden con `sendPhoto` por producto.
- ✅ **Conversacional**: Claude detecta saludo/charla vs necesidad (modo Bambule).
- ✅ **Modo admin** (gateado por tabla `bot_admins`): `/admin` (ventas del día), `/precio <prod> <valor>` (con confirmación), y NL admin-consciente ("qué stock bajo" → lista; "ventas" → /admin). Cliente nunca ve gestión.
- ✅ **Onboarding del dueño** `/configurar` (todo botones): guarda `intencion`+`meta` en `tenant_profile`.
- ✅ **Enlace web→bot**: `/start ped_<folio>` (del QR del checkout) vincula el pedido web al chat del cliente.

**Cron / notificaciones (n8n + BD, en vivo)**
- ✅ **Cierre del día 9pm** (workflow `yQK7uklY7NsgNREy`, scheduleTrigger 21:00 MX): manda ventas+insights a los `bot_admins`.
- ✅ Trigger `notify_customer_status`: al marcar pedido **"listo para entrega"**, avisa por Telegram al cliente (del bot o web enlazado).

**Panel / tienda web**
- ✅ **Analytics** con Recharts (donas categoría/canal, vistas `v_sales_by_category`/`v_sales_by_channel`, tablas colapsables).
- ✅ **Configuración de marca** (`/dueno/configuracion`): logo + color primario/acento + tagline → se aplican a la tienda pública (var CSS `--brand-primary`). Naturaleza Mística ya con logo real + verde/morado.
- ✅ Accesos en panel del dueño: **Pedidos** (→/empleado) y **Mostrador POS** (→/vendedor/calculadora); el admin hace esas tareas (no hay usuarios "empleado").
- ✅ Pedido (`/empleado`): botón de avance **coloreado por etapa** (azul→morado→verde); links "← Panel" para no quedar atrapado.
- ✅ Checkout web: textos a **Telegram** (no WhatsApp), **QR de seguimiento** al bot, columnas `customer_phone/customer_address`.
- ✅ Logout cliente + 5 botones POST→Server Actions (evitan 405 de Traefik).
- ✅ **Footer "Powered by NexIA"** + "Genera tu tienda gratis" → /registro, en toda la tienda pública.

**`bot_admins` (chat_id):** Mario Padilla `6065549978` (dueño) · Blanca Becerril `5965579916` (co-dueña) · Juan `5367409334` (consultor).

**Pendiente / radar:** deploy EasyPanel; activar webhook Stripe; **detector "momento de local"**; integración Mercado Libre/paquetería; columna `products.cost` para estrategia por margen.

**⚠️ Gotcha dev:** NUNCA `npm run build` con `npm run dev` corriendo (corrompe `.next` → Turbopack panic → "no deja de refrescar"). Usar `tsc --noEmit` para verificar con el dev vivo.

---

## 0.bis Bitácora — sesión 2026-06-28 (Ola 1 — refuerzo con patrones Medusa)

Se evaluaron **Medusa** (headless commerce) y **Logto** (auth) como referencia de estructura.
Decisión: **NO migrar** a ninguno (chocan con el stack Nexia). De Medusa se **extraen patrones**;
Logto queda **parqueado con gatillo futuro** en `~/dev/nexia-tools/TECH_RADAR.md` (SSO de planta enterprise).

**Ola 1 ejecutada (en producción — BD y n8n en vivo; código *deploy pendiente*):**
- ✅ **Line-item snapshot** (patrón Medusa): `order_items` += `product_name`, `sku` — nombre/SKU
  **congelados al comprar**. FK `product_id` → **`ON DELETE SET NULL`** + columna nullable: borrar un
  producto **ya no corrompe el historial** de órdenes. Verificado con prueba transaccional (ROLLBACK).
- ✅ **Eje de pago explícito** (patrón Medusa): `orders` += `payment_status` CHECK
  `('unpaid','pending','paid','refunded')` DEFAULT `'unpaid'`. Antes vivía escondido en
  `metadata.payment_status`. El eje de entrega (`status`) se queda igual.
- ✅ **Backfill** de las 11 órdenes existentes (19 items con snapshot; `payment_status` derivado de metadata).
- ✅ **3 canales escriben el snapshot**:
  - Web: `crearOrdenYSheet` en `src/app/(store)/tienda/carrito/actions.ts` (+ `payment_status`: web=`unpaid`, tarjeta=`pending`). *(deploy pendiente)*
  - Bot n8n `kpA4Qv6eXEcQ9vEe` nodo "Armar SQL orden": INSERT con `product_name`/`sku` vía **LEFT JOIN a products** + `payment_status='unpaid'`. (en vivo)
  - POS (`PosCalculator.tsx`): **sin cambio** — escribe en `sale_sessions`/`sale_session_items`, que **ya** snapshotea `product_name`.
  - Stripe webhook n8n `fBQxoiofBwgW2jKW` nodo "Confirmar pago…": ahora setea `payment_status='paid'` (columna) además del metadata. (sigue `active:false`)

**Ola 1.5 ejecutada (UI, *deploy pendiente*):** `/empleado` ahora avanza el `status` de entrega con
**flujo guiado** (botón "Marcar [siguiente etapa]", secuencia recibido→en_preparacion→listo_entrega→entregado,
sin saltos ni retrocesos) + cancelar, con manejo de errores async (revierte si falla) y `router.refresh()`.
Reemplaza el dropdown libre anterior (`OrderStatusSelect.tsx`, **eliminado**). Nuevo `EmpleadoOrderCard.tsx`
(client) muestra el **snapshot** `product_name`/`sku` (sobrevive a borrado de producto) + chip de `payment_status`.
Patrón tomado de `VendedorOrderCard.tsx`. RLS ya permitía a `empleado` el UPDATE de status.

---

## 0.bis Bitácora — sesión 2026-06-11

Resumen de lo trabajado (en producción salvo lo marcado *deploy pendiente* → entra al próximo deploy en EasyPanel):

**Datos / catálogo**
- ✅ **Mojibake corregido**: 244 productos de Naturaleza Mística (`�` → acentos correctos) vía `/pg/query`. Causa: CSV Windows-1252 leído como UTF-8.
- ✅ **Prevención** en `CsvUploader.tsx` (lee bytes + `TextDecoder` Windows-1252 fallback). *(deploy pendiente)*
- ✅ **Fotos de producto**: 183/244 con imagen — 107 reales (búsqueda web en caalfrabet/supernaturista) + 76 IA (Google Imagen 4). Scripts: `scripts/buscar-fotos-web.mjs`, `scripts/generar-fotos-ia.mjs`. Los **61 restantes**: job local `launchd com.nexia.fotos-ia` agendado **2026-06-12 09:00** (reset de cuota free de Imagen). Log: `/tmp/nexia_fotos_ia.log`.

**Bot Telegram** (workflow n8n `kpA4Qv6eXEcQ9vEe`)
- ✅ **Cliente recurrente**: saludo por nombre en `/start` + botón "Repetir último pedido" + pre-llenado de datos en checkout (confirmar/editar). Cruce por `orders.metadata->>'chat_id'`.
- ✅ **Bugs corregidos**: constraint `step_valid` (+`confirm_data`); "Enviar confirmación" leía texto vacío tras el DELETE del carrito; guarda anti-carrito-vacío.

**Tienda web**
- ✅ **Checkout web** (`/tienda/carrito`): Server Action `crearPedidoWeb` → crea orden (`metadata.source='web'`, recotiza precios en servidor) y registra en el **MISMO Google Sheet** del bot. Incluye **"Pagar con tarjeta"** (Stripe) si la tienda tiene Stripe conectado — ver Pagos. *(deploy pendiente)*

**Operación / dueño**
- ✅ **Notificar al dueño**: trigger `nexia_tienda.notify_owner_new_order` (`pg_net` → Telegram) en cada pedido nuevo, cualquier canal. (En producción.)
- ℹ️ Editar fotos/stock/precios (`/dueno/productos`), dashboard (`/dueno/analytics`), login por rol (`proxy.ts`+middleware), y **auto-registro de dueños** (`/registro`) **ya existían**.
- ✅ **Registro blindado**: `/registro` migró de `POST /api/registro` a Server Action `registro/actions.ts` `registrarTienda()` → evita el 405 de Traefik en EasyPanel (el auto-registro de dueños nuevos ya no se rompe en prod). El `GET /api/registro` (chequeo de slug) se queda (GET no se bloquea). *(deploy pendiente)*

**Pagos — Stripe Connect (multi-tenant) — Fases 1-4 ✅** *(deploy pendiente; ver §10 #1)*
- ✅ **Fase 1+2**: onboarding Express por tenant (`/dueno/cobros`), comisión Nexia **5%**.
- ✅ **Fase 3**: "Pagar con tarjeta" en el checkout web (Checkout Session, cargo directo en la cuenta del dueño + `application_fee` 5%); convive con el flujo WhatsApp.
- ✅ **Fase 4**: workflow n8n `fBQxoiofBwgW2jKW` (webhook → re-consulta a Stripe → marca `payment_status='paid'` + `stripe_payment_intent_id`).
- Probado en TEST mode. **Falta manual:** registrar el Connect webhook en Stripe + activar el workflow n8n. Al ir a prod: `sk_test_`→`sk_live_` y **rotar la sk_live expuesta**.

**Accesos / cuentas**
- ⚠️ **Doble candado**: nexia-tienda exige fila en `nexia_billing.nexia_subscriptions` (app_slug `tienda`, status `manual/active/on_trial`) ADEMÁS de `user_tenants.role`. Sin la fila de billing → pantalla "Sin acceso" aunque tenga rol. Para alta manual de un dueño: (1) auth user (email_confirm), (2) `user_tenants` rol+`status='activo'`, (3) `nexia_billing` suscripción. Pendiente decidir si se quita el gate de billing (redundante en multi-tenant).
- Dueños de Naturaleza Mística: `rubengarcia1995x`, `juanjose.garces`, `naturalezamisticaaa` (+ vendedores).

**Deploy pendiente en EasyPanel:** CsvUploader · checkout web (+ tarjeta) · sección Cobros · registro (Server Action) · envs Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PLATFORM_FEE_PERCENT`).

> Aprendizajes técnicos detallados de esta sesión → `~/dev/nexia-tools/MEMORY.md` (entradas 2026-06-11).

---

## 1. Visión del producto

Tienda multi-tenant para vender productos físicos (caso piloto: **Naturaleza Mística** — suplementos GN+VIDA y Prowinner) con **tres canales operativos**:

1. **Mostrador (POS)** — `/vendedor/*` — sesiones de venta presenciales, tablas `sale_sessions` + `sale_session_items`.
2. **Preparación de pedidos** — `/empleado/*` — recibe pedidos del bot Telegram y gestiona status (`recibido → en_preparacion → listo_entrega → entregado | cancelado`).
3. **Catálogo público** — `/(store)/tienda/[slug]` — escaparate web + bot Telegram (`@Baambule_bot`) que toma pedidos con búsqueda semántica por síntoma.

Cinco roles en `nexia_tienda.user_tenants.role`:
- `administrador` (SaaS — owner de la plataforma)
- `dueno` (owner de una tienda/tenant)
- `vendedor` (mostrador, POS)
- `empleado` (preparación de pedidos Telegram)
- `cliente`

---

## 2. Stack

```
Next.js 16 (con proxy.ts en vez de middleware.ts — ver §6)
React 19 + TypeScript + Tailwind 4
@supabase/ssr + @supabase/supabase-js v2
Supabase self-hosted (https://supabase.nexiasoluciones.com.mx)
n8n self-hosted (https://n8n.nexiasoluciones.com.mx) — workflows del bot
Anthropic Claude (Haiku 4.5 para bot, Sonnet 4.6 para búsqueda de productos)
OpenAI DALL-E 3 (generación de imagen)
```

---

## 3. Esquema BD `nexia_tienda`

**Tablas core**: `tenants`, `user_tenants`, `invitations`, `products`, `inventory`, `sale_sessions`, `sale_session_items`, `orders`, `order_items`, `audit_log`, `removal_requests`, `cart_drafts`.

**Vistas analíticas pre-cocinadas**: `v_inventory_suggestions`, `v_sales_by_hour`, `v_sales_summary`, `v_top_products`.

**Funciones**:
- `my_tenant_ids()` — IDs de tenants del usuario actual.
- `has_role_in_tenant(uuid, text[])` — `SECURITY DEFINER`, valida rol en tenant.
- `get_current_user_email()`, `registrar_venta()`, `upsert_product_with_inventory()`, `fn_audit_log()`, `create_inventory_on_product_insert()`.

**Triggers**: auto-creación de `inventory` al insertar `product`; auditoría AFTER INSERT/UPDATE/DELETE en `orders`, `inventory`, `removal_requests`.

**Búsqueda por síntoma**: `products.search_tags text[]` — frases naturales tipo `"me duele la espalda"`, `"quiero rendir más en el gym"`. El bot Telegram las usa con Claude para matchear consultas.

**Modelo de orden (patrones Medusa, 2026-06-28)**:
- `order_items` guarda **snapshot** `product_name` + `sku` (congelados al comprar). `product_id` es nullable con FK `ON DELETE SET NULL` → borrar un producto no rompe el historial.
- `orders.payment_status` (`unpaid`/`pending`/`paid`/`refunded`) es el **eje de pago**, separado del **eje de entrega** `orders.status` (`recibido`/`en_preparacion`/`listo_entrega`/`entregado`/`cancelado`).

---

## 4. Esquema del bot — tabla `cart_drafts`

Estado conversacional + carrito por `chat_id`:

| Columna | Tipo | Notas |
|---|---|---|
| chat_id | BIGINT PK | ID de chat Telegram |
| tenant_id | UUID | Por ahora Naturaleza Mística hardcoded |
| items | JSONB | `[{product_id, name, quantity, unit_price}]` |
| step | TEXT | `browsing` (default) → `awaiting_name` → `awaiting_phone` → `awaiting_address` → `ready` |
| customer_name, customer_phone, customer_address | TEXT | Capturados durante checkout |
| updated_at | TIMESTAMPTZ | Para limpieza de carritos abandonados |

Al confirmar pedido el bot crea `orders` + `order_items` y borra el `cart_drafts` correspondiente.

---

## 5. RLS policies (resumen)

| Tabla | Quién puede leer | Quién puede modificar |
|---|---|---|
| `orders`, `order_items` | empleado, dueno, administrador | empleado puede UPDATE (status); dueno/administrador full |
| Resto de tablas | filtrado por `my_tenant_ids()` |

Bot Telegram usa `SERVICE_ROLE_KEY` → bypassa RLS (necesario para INSERT desde n8n).

---

## 6. Diferencias importantes con Next 13/14/15

- **`proxy.ts` en vez de `middleware.ts`**: Next 16 acepta ambos nombres pero este proyecto usa `src/proxy.ts`. Lo confirmé en `node_modules/next/dist/lib/constants.js` (constantes `MIDDLEWARE_FILENAME` y `PROXY_FILENAME`).
- **Build output sigue siendo `.next/server/middleware.js`** aunque el source sea `proxy.ts`.

---

## 7. Aprendizajes técnicos críticos

### 7.1 Supabase self-hosted

- **`service_role` puede `ALTER ROLE` vía `/pg/query`** — para agregar schemas a PostgREST, no se requiere SSH al VPS. Patrón:
  ```bash
  curl -X POST https://supabase.nexiasoluciones.com.mx/pg/query \
    -H "apikey: $SR" -H "Authorization: Bearer $SR" \
    -d '{"query": "ALTER ROLE authenticator SET pgrst.db_schemas TO '"'"'public,storage,...,nexia_tienda'"'"'; NOTIFY pgrst, '"'"'reload schema'"'"';"}'
  ```
- **Agregar schema requiere 2 cosas**: (1) `ALTER ROLE authenticator SET pgrst.db_schemas` con NOTIFY pgrst reload; (2) `GRANT USAGE` + `GRANT ALL ON ALL TABLES/SEQUENCES` + `ALTER DEFAULT PRIVILEGES` para `anon, authenticated, service_role`. Sin ambas pasos PostgREST devuelve `PGRST106: Invalid schema` o 403.
- **`auth.email()` retorna NULL** en este self-hosted. Usar `auth.uid()` + `SECURITY DEFINER` que consulta `auth.users`. Ver `nexia-tools/MCP_SUPABASE_REGLAS.md` §"Aprendizajes críticos self-hosted".
- **`authenticated` role no tiene SELECT sobre `auth.users`** — referencias directas en policies fallan con 403. Usar funciones helper SECURITY DEFINER.

### 7.2 n8n quirks (descubiertos por las malas)

1. **Workflows creados vía API necesitan `webhookId` explícito** (UUID) en cada nodo `n8n-nodes-base.webhook`. Sin él, el production webhook NO se registra aunque `active: true`. La UI lo genera automático; la API no.

2. **Cambios a workflow activo requieren toggle**. `PUT /workflows/:id` no re-registra webhooks aunque la API devuelva 200. Solución:
   ```bash
   POST /workflows/:id/deactivate
   PUT /workflows/:id (con cambios)
   POST /workflows/:id/activate
   ```
   Estos endpoints existen pero no están documentados en la API pública.

3. **HTTP Request con response array → items separados**. Cuando un HTTP request retorna `[{...}, {...}]`, n8n splits y el siguiente Code recibe N items, no el array. En el Code, usar `$input.all().map(i => i.json)` para juntar, o `$input.first().json` si es un solo item esperado (NO `$input.first().json[0]`).

4. **Template strings (backticks) en expresiones n8n NO se evalúan**. Esto falla:
   ```js
   "={{ JSON.stringify({ query: `SELECT * FROM x WHERE id = ${$json.id}` }) }}"
   ```
   Error: `"JSON parameter needs to be valid JSON"`. Solución: concatenación normal:
   ```js
   "={{ JSON.stringify({ query: 'SELECT * FROM x WHERE id = ' + $json.id }) }}"
   ```
   O mejor: armar el SQL en un nodo Code dedicado y pasarlo al HTTP via `{{ $json.sql }}`.

5. **Nodo Telegram nativo agrega "Sent with n8n"** cuando el reply_markup no se interpreta como estructura nativa. Para inline_keyboard arbitrario, usar HTTP Request directo a `https://api.telegram.org/bot<TOKEN>/sendMessage` con `reply_markup` en el body JSON. Da control total.

6. **HTTP Response encoding broken con caracteres acentuados**. Si Supabase devuelve `Óxido Nítrico` y aparece `�xido N�trico`, agregar header `Accept-Encoding: identity` al HTTP Request (evita gzip mal decodificado).

7. **UPSERT con RETURNING para tener siempre 1 fila**: cuando un fetch puede no encontrar el registro, el siguiente nodo recibe 0 items y se detiene. Workaround:
   ```sql
   INSERT INTO t (pk, defaults...) VALUES (X, ...)
   ON CONFLICT (pk) DO UPDATE SET updated_at = t.updated_at
   RETURNING fields...
   ```
   El UPDATE es no-op pero permite RETURNING en ambos casos.

### 7.3 Telegram Bot API

- **setWebhook por default acepta `message`** pero no garantiza `callback_query`. Especificar:
  ```bash
  curl https://api.telegram.org/bot$TOKEN/setWebhook \
    --data-urlencode 'url=...' \
    --data-urlencode 'allowed_updates=["message","callback_query"]' \
    --data-urlencode 'drop_pending_updates=true'
  ```
- **`chat not found`** = chat_id no existe / nunca habló con el bot. Para tests usar un chat_id real (escribirle `/start` al bot primero).
- **El bot procesa solo 1 update a la vez** por webhook con `max_connections: 40` default.

### 7.4 OrderStatus en español vs inglés

El tipo TS estaba en español (`recibido | en_preparacion | ...`) pero el código y default de columna en inglés (`pending | processing | ...`). **Causa de bugs invisibles**: las pantallas de status usaban `STATUS_LABELS["pending"]` que no matcheaba ningún registro real (que tenía `recibido`).

Resuelto: todo el código en español, `ALTER COLUMN status SET DEFAULT 'recibido'`.

---

## 8. Setup local

### 8.1 Variables de entorno (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase.nexiasoluciones.com.mx
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # SOLO servidor
SUPABASE_JWT_SECRET=<jwt_secret>
DEV_TENANT_ID=00000000-0000-0000-0000-000000000001  # demo tenant
TELEGRAM_BOT_TOKEN_NATURALEZA_MISTICA=<token>
ANTHROPIC_API_KEY=<sk-ant-...>
OPENAI_API_KEY=<sk-...>  # opcional, sólo para /api/admin/generate-image
```

> **Cuidado** con tener estos valores en plain text en disco. Sugerido: mover a gestor de secretos. NUNCA exponer `SERVICE_ROLE_KEY` con prefijo `NEXT_PUBLIC_`.

### 8.2 Correr local

```bash
cd ~/dev/NexIA_Tienda
npm install
npm run dev  # → http://localhost:3000
```

En dev, `proxy.ts` omite la verificación de sesión (per `src/lib/supabase/middleware.ts`). Para probar el flow real de auth, hacer `npm run build && npm start` y entrar con un usuario real.

### 8.3 MCPs útiles (para Claude Code)

```bash
claude mcp add-json supabase-nexia '{"type":"stdio","command":"bun","args":["~/dev/nexia-tools/selfhosted-supabase-mcp/dist/index.js","--url","https://supabase.nexiasoluciones.com.mx","--anon-key","...","--service-key","...","--jwt-secret","..."]}'

claude mcp add-json n8n-nexia '{"type":"stdio","command":"npx","args":["-y","n8n-mcp"],"env":{"N8N_API_URL":"https://n8n.nexiasoluciones.com.mx","N8N_API_KEY":"...","MCP_MODE":"stdio"}}'
```

El MCP de Supabase requiere **Bun** (el dist es Bun-only; Node tira `__require is not a function`).

---

## 9. Bot Telegram — arquitectura del workflow n8n

ID workflow: `kpA4Qv6eXEcQ9vEe`. Webhook: `https://n8n.nexiasoluciones.com.mx/webhook/naturaleza-mistica-bot`.

```
Telegram Webhook
  └→ Extraer datos (text/chatId/userId del message o callback_query)
     └→ Leer carrito actual (UPSERT que garantiza 1 fila)
        └→ Armar contexto (cartItems, cartStep, etc.)
           └→ En checkout?  (Switch por cartStep)
              ├─ awaiting_name   → Guardar nombre → Pedir teléfono → Enviar
              ├─ awaiting_phone  → Guardar tel    → Pedir dirección → Enviar
              ├─ awaiting_address → Guardar dir  → Armar SQL orden → Crear orden BD → Confirmación → Limpiar carrito → Enviar
              └─ default (no en checkout) → Router de comandos (Switch por texto):
                 ├─ /start        → Buscar cliente recurrente → Armar saludo → Enviar
                 │                   · recurrente: saluda por nombre + botón [🔁 Repetir último pedido (rx_repeat)]
                 │                   · nuevo: saludo estándar
                 ├─ /catalogo     → Fetch categorías → Armar mensaje (inline_keyboard) → Enviar
                 ├─ cat:<x>       → Fetch productos categoría → Armar mensaje (con add: buttons) → Enviar
                 ├─ add:<uuid>    → Fetch producto → Armar SQL upsert → Upsert carrito → Confirmar agregado → Enviar
                 ├─ /carrito      → Armar vista → Enviar (botones: Confirmar / Vaciar / Tienda web)
                 ├─ clear_cart    → DELETE cart_drafts → Confirmar vaciado → Enviar
                 ├─ start_checkout → UPDATE prefill datos del último pedido → ¿Datos previos?
                 │                   ├─ sí (confirm_data) → Armar confirmar datos → Enviar [✅ Usar (rx_confirm) / ✏️ Capturar (rx_edit)]
                 │                   └─ no → Pedir nombre → Enviar (captura normal)
                 ├─ cancel_checkout → UPDATE step=browsing → Confirmar cancelado → Enviar
                 ├─ rx_*          → Despacho rx (Switch interno):
                 │                   ├─ rx_repeat  → Fetch último pedido (precios actuales) → Upsert carrito → Confirmar repetido → Enviar
                 │                   ├─ rx_confirm → Leer carrito para orden → Armar SQL orden → Crear orden BD → … (usa datos guardados)
                 │                   └─ rx_edit    → Reset step=awaiting_name → Pedir nombre → Enviar
                 └─ (fallback texto libre) → Fetch catálogo completo → Armar payload Claude → Claude busca match (Haiku 4.5) → Armar respuesta → Enviar
```

> **Cliente recurrente (2026-06-11)**: el cruce cliente↔pedidos se hace por `orders.metadata->>'chat_id'`.
> El saludo personalizado, "repetir último pedido" (re-cotizado con precios/nombres actuales de `products`)
> y el pre-llenado de datos en checkout (parsea `notes` con `substring(... 'Tel: (.*?) / Dir:'` y `'Dir: (.+)'`)
> dependen de que cada orden guarde `metadata.chat_id`. Todos los callbacks internos usan prefijo `rx_`.

---

## 10. Próximos pasos pendientes

> ✅ **Hecho 2026-06-11 — Checkout web → mismo Google Sheet que el bot**:
> `src/app/(store)/tienda/carrito/page.tsx` ahora tiene checkout real (nombre, WhatsApp,
> dirección) que llama al Server Action `carrito/actions.ts` → `crearPedidoWeb()`. Re-cotiza
> precios desde BD (no confía en localStorage), crea `orders`+`order_items` con
> `metadata.source='web'`, y registra en el **mismo Google Form** que el bot (entry IDs
> reusados; canal `web` vs `bot_telegram`). Sin pago en línea aún (status `recibido`, contacto
> por WhatsApp). Stripe sigue pendiente (#10).

> ✅ **Hecho 2026-06-11 — Cliente recurrente**: saludo por nombre en `/start`, botón "Repetir último
> pedido", y pre-llenado de nombre/teléfono/dirección en checkout con confirmación explícita (rx_confirm/rx_edit).
> Cubre parcialmente el punto #5 para clientes que ya compraron. Falta el "Sí, confirmar" para clientes nuevos.

1. **#10 Pago Stripe (Connect multi-tenant)** — EN PROGRESO:
   · ✅ **Fase 1+2 (2026-06-11)**: `tenants` += `stripe_account_id, stripe_charges_enabled, stripe_onboarded_at`.
     Onboarding **Stripe Connect Express** por tenant: `src/lib/stripe/server.ts` + Server Actions
     `src/app/dueno/cobros/actions.ts` (`conectarStripe`, `estadoStripe`) + página `/dueno/cobros`.
     Comisión Nexia = `STRIPE_PLATFORM_FEE_PERCENT` (5%). Probado en TEST mode (cuenta Express + account link OK).
   · ✅ **Fase 3 (2026-06-11)**: checkout web con "Pagar con tarjeta" (solo si tenant `stripe_charges_enabled`).
     Server Actions `crearCheckoutStripe` (Checkout Session, **cargo directo** en la cuenta conectada vía
     `{stripeAccount}` + `application_fee_amount` 5%) y `tiendaAceptaTarjeta`. El pedido se crea `recibido`
     con `metadata.payment_status='pending'`; el botón de tarjeta convive con "pedir y pagar por WhatsApp".
     `src/app/(store)/tienda/carrito/{actions.ts,page.tsx}`. *(deploy pendiente)*
   · ✅ **Fase 4 (2026-06-11)**: workflow n8n **"NexIA Tienda - Stripe Webhook"** (`fBQxoiofBwgW2jKW`):
     webhook `https://n8n.nexiasoluciones.com.mx/webhook/stripe-nexia` → re-consulta la sesión a la API de
     Stripe (verdad de pago, sin HMAC) → marca `metadata.payment_status='paid'` + `stripe_payment_intent_id`.
     **Pendiente manual:** (1) registrar el endpoint en Stripe Dashboard como **Connect webhook** (eventos de
     cuentas conectadas), evento `checkout.session.completed`; (2) **activar** el workflow en n8n (el MCP no puede).
     Al ir a producción: cambiar `sk_test_` → `sk_live_` en el nodo "Verificar en Stripe".
   · Env requeridas (EasyPanel): `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PLATFORM_FEE_PERCENT`.
     Hoy en TEST (`sk_test_`/`pk_test_`); cambiar a `sk_live_` al ir a producción.
2. ~~**#11 Notificar al dueño**~~ ✅ **Hecho 2026-06-11**: trigger `nexia_tienda.notify_owner_new_order()` (CONSTRAINT TRIGGER DEFERRED AFTER INSERT en `orders`) usa **`pg_net`** (`net.http_post`) para mandar Telegram sendMessage al chat del dueño (`5367409334`) con folio/cliente/total/productos/canal. Cubre TODOS los canales (bot/web/POS) de una. El `net.http_post` va envuelto en BEGIN/EXCEPTION → una notificación fallida nunca bloquea el pedido. Para cambiar destino: editar `v_chat` en la función.
3. **Deploy a `tienda.nexiasoluciones.com.mx`** vía EasyPanel. El link del bot ya apunta ahí.
4. **Re-clasificación de productos**: 242 productos en categoría `suplementos` — subdividir en sub-categorías (Vitaminas, Aceites, Cápsulas, Multivitamínicos, Pre-entreno…) usando Claude. Idealmente DESPUÉS de ver qué consultas hacen los clientes reales por el bot.
5. **Confirmación final antes de crear orden**: hoy basta con que el cliente escriba dirección y se crea la orden. Agregar un paso "Sí, confirmar" con botón explícito antes del INSERT para evitar pedidos accidentales.
6. **Validación de teléfono/dirección**: hoy se aceptan strings vacíos o números muy cortos. Validar en el step correspondiente.

---

## 11. Integración Google Sheets — patrón Google Forms (implementado)

**Approach final** (después de descartar Apps Script y OAuth en n8n por fricción):

Usar un Google Form vinculado a un Sheet como webhook público — sin OAuth, sin Apps Script, sin credenciales en el servidor.

**Setup**:
1. Crear Form en <https://forms.new> con N preguntas tipo "Respuesta corta", una por columna (el orden importa). Ejemplo de campos para Naturaleza Mística: `canal`, `order_id`, `customer_name`, `customer_phone`, `productos`, `cantidad_total`, `subtotal`, `total`, `status`.
2. En el Form → pestaña **Respuestas** → ícono Sheets verde → vincular a Sheet (crea uno nuevo automático con los headers).
3. Compartir el form, obtener URL pública `/viewform`.
4. Hacer fetch del HTML del form para extraer los **entry IDs** (cada pregunta tiene uno único tipo `entry.1234567890`). Patrón regex sobre `FB_PUBLIC_LOAD_DATA_`:
   ```python
   re.findall(r'\"([a-z_0-9]+)\",[^\[]*?\[\[(\d{6,})', data)
   ```
5. En n8n, agregar HTTP Request a `https://docs.google.com/forms/d/e/<FORM_ID>/formResponse` con method POST, `Content-Type: application/x-www-form-urlencoded`, body con cada `entry.XXXX=valor`.

**Ventaja sobre Apps Script**: no requiere autorización del owner (Apps Script pide consent OAuth no-verified que muchos usuarios no logran completar). Form responses URL es endpoint público estable.

**Implementación actual en el workflow**:
- Form ID: `1FAIpQLSdenR5i_5RZ_2wVlG0DGffbDzCqdEVQfjG1RJYeru8ar0X6BA`
- Entry IDs (Naturaleza Mística):
  - `entry.2049811377` → canal
  - `entry.2079790119` → order_id
  - `entry.1942425521` → customer_name
  - `entry.1653790148` → customer_phone
  - `entry.1588836309` → productos
  - `entry.1976439785` → cantidad_total
  - `entry.2087472238` → subtotal
  - `entry.181997826` → total
  - `entry.1096979497` → status
- En el workflow, el nodo "Registrar en Sheets" está después de "Crear orden BD" y conectado en paralelo con "Armar confirmación" (side-effect; si Form falla, no rompe la confirmación al cliente).

**Para otro tenant**: crear otro Form con la misma estructura, extraer sus entry IDs, agregar otro nodo en n8n (o lógica condicional por tenant_id).

---

## 12. Reglas operacionales

- **NUNCA** conectar directo a Postgres (`pg`, `psql`, puerto 5432) — firewall bloqueado. Todo va por PostgREST o `/pg/query`.
- **NUNCA** usar `SERVICE_ROLE_KEY` en frontend, cliente, edge middleware o con prefijo `NEXT_PUBLIC_`.
- **NUNCA** usar dot-notation en URLs PostgREST (`/nexia_tienda.tabla`) — usar `Accept-Profile: nexia_tienda` header.
- **Workflow n8n**: después de cambios vía API, hacer toggle off/on para registrar webhooks.
- **Pagos / RLS críticos**: testear policies con el rol específico (`SET LOCAL ROLE authenticated`) antes de aplicar a producción.
- **Antes de migrar productos masivamente con IA**: validar muestra de 5-10 con el dueño antes de aplicar al catálogo entero.

---

## 13. Tenants registrados

| Slug | Nombre | Tenant ID | Productos | Notas |
|---|---|---|---|---|
| `demo` | Tienda Demo | `00000000-0000-0000-0000-000000000001` | 3 (seed) | Tenant de pruebas |
| `nexiastore` | NexiaStore | `8187d07e-0f46-4327-a42e-9975c11928fb` | ? | — |
| `naturaleza-mistica` | Naturaleza Mística | `3679a8af-5772-4d5d-9b92-edc4bcebf418` | 244 (suplementos, gomitas, tes) | **Producción** — bot Telegram `@Baambule_bot` apunta aquí |

---

## 14. Contactos / Recursos

- Repo: `~/dev/NexIA_Tienda`
- Docs ecosistema Nexia: `~/dev/nexia-tools/` (CLAUDE_GLOBAL.md, MCP_SUPABASE_REGLAS.md, MCP_N8N_REGLAS.md, NEXIA-OS.md, etc.)
- VPS: `72.62.128.108` (EasyPanel + Docker)
- Bot Telegram: `@Baambule_bot` (Bambule, id 8575349743) — vinculado a Naturaleza Mística
- Google Sheet ventas (Naturaleza Mística): `13XyFTrR38Pc2bzu5wuo_I0Ww6VJXpl1Ob4U6h5gI07A`, owner `naturalezamisticaaa@gmail.com`
