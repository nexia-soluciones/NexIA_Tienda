// Genera imágenes de producto con IA (Google Imagen 4) para los productos sin foto
// y las sube a Supabase Storage (bucket product-images), marcando image_url.
// Requiere GEMINI_API_KEY en .env.local (API key gratis de Google AI Studio).
// Uso: node scripts/generar-fotos-ia.mjs dry           (imprime prompts, no gasta)
//      node scripts/generar-fotos-ia.mjs commit [N]    (genera; N opcional = límite, p.ej. 3 para muestra)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const MODE = process.argv[2] || 'dry';
const LIMIT = parseInt(process.argv[3] || '0', 10) || 0;   // 0 = todos
const TENANT = '3679a8af-5772-4d5d-9b92-edc4bcebf418';
const CONCURRENCY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = readFileSync(new URL('../.env.local', import.meta.url)).toString();
const getEnv = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
const URL_SB = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const GKEY = getEnv('GEMINI_API_KEY');
const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001';

async function pgQuery(query) {
  const r = await fetch(`${URL_SB}/pg/query`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error('pg ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

function buildPrompt(name, desc) {
  const cleanName = name.replace(/\([^)]*\)/g, '').trim();           // quita la marca entre paréntesis
  const info = (desc || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  return `Professional e-commerce product photograph on a pure white seamless background, soft studio lighting, centered, high detail, photorealistic. No text, no labels, no logos, no brand names, no watermark. Subject: ${cleanName}. ${info} Show the product/food itself in an appealing, clean, natural way.`;
}

async function genImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${GKEY}`;
  for (let attempt = 0; attempt < 7; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }),
    });
    if (r.status === 429) { await sleep(12000 + attempt * 8000); continue; }   // rate limit → espera y reintenta
    if (!r.ok) throw new Error('imagen ' + r.status + ' ' + (await r.text()).slice(0, 160));
    const j = await r.json();
    const b64 = j.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('sin imagen (¿bloqueado por filtro?)');
    return Buffer.from(b64, 'base64');
  }
  throw new Error('429 persistente tras reintentos');
}

async function uploadAndSet(id, buf) {
  const base = `${URL_SB}/storage/v1/object`;
  const up = await fetch(`${base}/product-images/${TENANT}/${id}.jpg`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'x-upsert': 'true', 'Content-Type': 'image/jpeg' },
    body: buf,
  });
  if (!up.ok) throw new Error('upload ' + up.status);
  const url = `${base}/public/product-images/${TENANT}/${id}.jpg`;
  // enlazar de inmediato (resiliencia: un fallo de red no pierde el lote)
  await pgQuery(`UPDATE nexia_tienda.products SET image_url='${url}', updated_at=NOW() WHERE id='${id}'`);
  return url;
}

let products = await pgQuery(
  `SELECT id, name, description FROM nexia_tienda.products WHERE tenant_id='${TENANT}' AND (image_url IS NULL OR image_url='') ORDER BY name`
);
if (LIMIT) products = products.slice(0, LIMIT);
console.log(`Sin imagen: ${products.length}  | modo: ${MODE}  | Imagen 4 fast (~$${(products.length * 0.02).toFixed(2)} o free-tier)\n`);

if (!GKEY && MODE === 'commit') { console.error('FALTA GEMINI_API_KEY en .env.local'); process.exit(1); }

if (MODE === 'dry') {
  for (const p of products.slice(0, 12)) console.log(`• ${p.name}\n    prompt: ${buildPrompt(p.name, p.description).slice(0, 160)}...`);
  console.log(`\n(${products.length} productos. Corre 'commit 3' para una muestra de 3, o 'commit' para todos.)`);
  process.exit(0);
}

mkdirSync('/tmp/ia_fotos', { recursive: true });
let ok = 0, fail = 0;
const updates = [];
async function worker(queue) {
  while (queue.length) {
    const p = queue.shift();
    try {
      const buf = await genImage(buildPrompt(p.name, p.description));
      writeFileSync(`/tmp/ia_fotos/${p.id}.jpg`, buf);
      const url = await uploadAndSet(p.id, buf);
      updates.push(`('${p.id}'::uuid, '${url}')`);
      ok++; console.log(`✓ ${p.name}`);
    } catch (e) { fail++; console.log(`✗ ${p.name} :: ${e.message}`); }
  }
}
const queue = [...products];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
// (el enlace a image_url ya se hace por imagen dentro de uploadAndSet — resiliente)
console.log(`\nGeneradas OK: ${ok} | Fallidas: ${fail} | image_url actualizados: ${updates.length}`);
console.log('Copias locales en /tmp/ia_fotos/ para revisar.');
