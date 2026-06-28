// Batch de fotos para Naturaleza Mística.
// Busca cada producto sin imagen en caalfrabet (Shopify suggest.json),
// puntúa el match por solape de tokens + marca, y (en commit) sube a Supabase.
// Uso: node fotos_mistica.mjs dry   |   node fotos_mistica.mjs commit
import { readFileSync, writeFileSync } from 'node:fs';

const MODE = process.argv[2] || 'dry';
const TENANT = '3679a8af-5772-4d5d-9b92-edc4bcebf418';
const STORES = (process.argv[3] || 'caalfrabet.com.mx').split(',').map(s => s.trim());
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

const env = readFileSync(new URL('../.env.local', import.meta.url)).toString();
const getEnv = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm'))?.[1] || '').trim().replace(/^["']|["']$/g, '');
const URL_SB = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['de','con','para','y','el','la','los','las','en','del','al','x','c','mg','g','gr','ml','kg','caps','cap','capsulas','capsula','tabletas','tableta','tabs','sol','suplemento','alimenticio','un','una','sin','su','para','tbs','amp','sob','cont','net','neto']);
const sigTokens = (s) => norm(s).split(' ').filter(t => t.length >= 3 && !STOP.has(t));

async function pgQuery(query) {
  const r = await fetch(`${URL_SB}/pg/query`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error('pg ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function search(name, store) {
  const q = encodeURIComponent(name.replace(/[()]/g, ' '));
  const url = `https://${store}/search/suggest.json?q=${q}&resources%5Btype%5D=product&resources%5Blimit%5D=6`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    return (j?.resources?.results?.products || []).map(p => ({ ...p, _store: store }));
  } catch { return []; }
}

// marca entre paréntesis del nombre, p.ej. "Citrato de Magnesio (GODVIT)" -> "godvit"
function brandOf(name) {
  const m = name.match(/\(([^)]+)\)/);
  return m ? norm(m[1]).split(' ').filter(t => t.length >= 3 && !STOP.has(t)) : [];
}

function score(name, prod) {
  // Títulos de caalfrabet: "FORMA NOMBRE C/QTY ...ingredientes...". Usar encabezado.
  const words = norm(prod.title).split(' ');
  const head9 = words.slice(0, 9).join(' ');   // para contar solapamiento
  const head6 = words.slice(0, 6).join(' ');   // para exigir el nombre al inicio
  const tagsNorm = norm((prod.tags || []).join(' '));
  const brand = brandOf(name);
  const productToks = sigTokens(name).filter(t => !brand.includes(t));  // tokens del producto, sin la marca
  let hits = 0;
  for (const t of productToks) if (head9.includes(t)) hits++;
  // el PRIMER token del producto (sustantivo principal) debe ir al inicio del título
  const firstTok = productToks[0] || '';
  const leadOk = firstTok.length >= 3 && head6.includes(firstTok);
  const brandHit = brand.length > 0 && brand.some(b => head9.includes(b) || tagsNorm.includes(b));
  return { hits, total: productToks.length, brandHit, leadOk, title: prod.title, image: prod.image };
}

async function resolve(name) {
  for (const store of STORES) {                 // cascada: primera tienda con match aceptado gana
    const prods = await search(name, store);
    let best = null;
    for (const p of prods) {
      if (!p.image) continue;
      const s = score(name, p);
      const better = !best
        || (s.leadOk && !best.leadOk)
        || (s.leadOk === best.leadOk && s.hits > best.hits)
        || (s.leadOk === best.leadOk && s.hits === best.hits && s.brandHit && !best.brandHit);
      if (better) best = { ...s, store };
    }
    if (best && best.leadOk && (best.hits >= 2 || (best.hits >= 1 && best.brandHit))) {
      return { ...best, accept: true };
    }
  }
  return null;
}

const products = await pgQuery(
  `SELECT id, name FROM nexia_tienda.products WHERE tenant_id='${TENANT}' AND (image_url IS NULL OR image_url='') ORDER BY name`
);
console.log(`Productos sin imagen: ${products.length}  | modo: ${MODE}\n`);

const accepted = [], rejected = [];
for (const p of products) {
  let res = null;
  try { res = await resolve(p.name); } catch { /* skip */ }
  if (res && res.accept) accepted.push({ ...p, ...res });
  else rejected.push({ ...p, why: res ? `débil(${res.hits}/${res.total}${res.brandHit ? '+marca' : ''})` : 'sin resultados' });
}

console.log(`✅ ACEPTADOS: ${accepted.length}   ❌ SIN MATCH: ${rejected.length}\n`);
console.log('--- MUESTRA ACEPTADOS (primeros 25) ---');
for (const a of accepted.slice(0, 25)) console.log(`• ${a.name}\n    → ${a.title}  [${a.hits}/${a.total}${a.brandHit ? '+marca' : ''}]`);
console.log('\n--- SIN MATCH (todos) ---');
for (const r of rejected) console.log(`• ${r.name}  (${r.why})`);

if (MODE === 'commit') {
  console.log('\n=== SUBIENDO ' + accepted.length + ' imágenes ===');
  const base = `${URL_SB}/storage/v1/object`;
  const updates = [];
  let ok = 0, fail = 0;
  for (const a of accepted) {
    try {
      const ir = await fetch(a.image, { headers: { 'User-Agent': UA } });
      if (!ir.ok) { fail++; continue; }
      const buf = Buffer.from(await ir.arrayBuffer());
      writeFileSync(`/tmp/batch_${a.id}.jpg`, buf);
      const up = await fetch(`${base}/product-images/${TENANT}/${a.id}.jpg`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'x-upsert': 'true', 'Content-Type': 'image/jpeg' },
        body: buf,
      });
      if (!up.ok) { fail++; continue; }
      updates.push(`('${a.id}'::uuid, '${base}/public/product-images/${TENANT}/${a.id}.jpg')`);
      ok++;
    } catch { fail++; }
  }
  if (updates.length) {
    await pgQuery(
      `UPDATE nexia_tienda.products AS p SET image_url=v.url, updated_at=NOW() FROM (VALUES ${updates.join(',')}) AS v(id,url) WHERE p.id=v.id`
    );
  }
  console.log(`\nSubidas OK: ${ok}  | Fallidas: ${fail}  | image_url actualizados: ${updates.length}`);
}
