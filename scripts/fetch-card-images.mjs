/**
 * Collects card images from each bank's own card page.
 *
 * For every card in datasets/cards.json:
 *   1. open its CardAdvisor page and find the link to the issuer's card page,
 *   2. open the issuer page and read its social-share image (og:image) or card picture,
 *   3. save the image to assets/card-images/<cardId>.<ext>,
 *   4. record the source page and image URL in assets/card-images/manifest.json.
 *
 * It identifies itself with a descriptive User-Agent, waits between requests, and does
 * not try to get around bot checks: a page that refuses is recorded as "blocked".
 * Card artwork belongs to the issuing banks and is used here to identify their products.
 *
 * Run: node scripts/fetch-card-images.mjs [--limit N] [--only id1,id2]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'card-images');
const manifestPath = join(outDir, 'manifest.json');
mkdirSync(outDir, { recursive: true });

const UA = 'WalletWise-college-project (sanchit.borikar24@vit.edu)';
const args = process.argv.slice(2);
const limit = Number(args[args.indexOf('--limit') + 1]) || Infinity;
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;

const cards = JSON.parse(readFileSync(join(root, 'datasets', 'cards.json'), 'utf8')).cards;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept = 'text/html') {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  return res;
}

const SKIP_LINK = /cardadvisor|googletagmanager|linkredirect|web\.archive|\.pdf|share|wa\.me|twitter|linkedin|facebook|instagram|youtube|customer-notice|tnc|terms|privacy/i;

function issuerLink(html) {
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  return links.find((l) => !SKIP_LINK.test(l)) ?? null;
}

function absolute(base, u) {
  try {
    return new URL(u.replace(/&amp;/g, '&'), base).toString();
  } catch {
    return null;
  }
}

const GENERIC = /logo|favicon|sprite|icon|placeholder|default|og-image|share-image|banner-default|header|footer/i;

function imageCandidates(html, base) {
  const out = [];
  const meta = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
    return m ? absolute(base, m[1]) : null;
  };
  for (const p of ['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']) {
    const u = meta(p);
    if (u) out.push({ url: u, via: p });
  }
  // Images in the page whose file name mentions a card.
  for (const m of html.matchAll(/(?:src|data-src|srcset)=["']([^"' ]+\.(?:png|jpe?g|webp)[^"' ]*)/gi)) {
    const u = absolute(base, m[1]);
    if (u && /card|credit/i.test(u) && !GENERIC.test(u)) out.push({ url: u, via: 'img' });
  }
  return out;
}

/** Pixel size read from the image header (PNG, JPEG, WebP), without decoding. */
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
    }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// A credit card face is about 1.586 wide for each unit of height (ISO/IEC 7810 ID-1).
const CARD_ASPECT = [1.4, 1.8];

async function downloadImage(url, id) {
  const res = await get(url, 'image/*');
  if (!res.ok) return { ok: false, why: `image HTTP ${res.status}` };
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/') || type.includes('svg')) return { ok: false, why: `not a raster image (${type})` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) return { ok: false, why: `too small (${buf.length} bytes)` };
  if (buf.length > 3_000_000) return { ok: false, why: `too large (${buf.length} bytes)` };
  const size = imageSize(buf);
  if (!size) return { ok: false, why: 'unreadable image header' };
  const aspect = size.w / size.h;
  if (aspect < CARD_ASPECT[0] || aspect > CARD_ASPECT[1] || size.w < 300) {
    return { ok: false, why: `not card shaped (${size.w}x${size.h})` };
  }
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const file = `${id}.${ext}`;
  writeFileSync(join(outDir, file), buf);
  return { ok: true, file, bytes: buf.length, width: size.w, height: size.h };
}

async function processCard(card) {
  const rec = { id: card.cardKey, name: card.name, issuer: card.issuer, status: 'pending' };
  try {
    const ca = await get(card.url);
    if (!ca.ok) return { ...rec, status: 'no-cardadvisor-page', detail: `HTTP ${ca.status}` };
    const page = issuerLink(await ca.text());
    if (!page) return { ...rec, status: 'no-issuer-link' };
    rec.sourcePage = page;

    const res = await get(page);
    if (!res.ok) return { ...rec, status: 'blocked', detail: `issuer page HTTP ${res.status}` };
    const html = await res.text();
    if (/captcha|access denied|are you a robot|bot detection|request unsuccessful/i.test(html.slice(0, 6000)) && html.length < 20000) {
      return { ...rec, status: 'blocked', detail: 'bot check page' };
    }
    const candidates = imageCandidates(html, res.url || page);
    if (candidates.length === 0) return { ...rec, status: 'no-image-found' };

    // Pictures named after the card first, then the social-share image.
    candidates.sort((a, b) => (a.via === 'img' ? 0 : 1) - (b.via === 'img' ? 0 : 1));
    const seen = new Set();
    for (const c of candidates.filter((x) => !seen.has(x.url) && seen.add(x.url)).slice(0, 8)) {
      if (GENERIC.test(c.url.split('/').pop() ?? '')) continue;
      const d = await downloadImage(c.url, card.cardKey);
      if (d.ok) return { ...rec, status: 'downloaded', imageUrl: c.url, via: c.via, file: d.file, bytes: d.bytes, width: d.width, height: d.height };
      rec.detail = d.why;
      await sleep(300);
    }
    return { ...rec, status: 'no-card-face' };
  } catch (e) {
    return { ...rec, status: 'error', detail: String(e).slice(0, 120) };
  }
}

const todo = cards.filter((c) => (!only || only.has(c.cardKey)) && manifest[c.cardKey]?.status !== 'downloaded').slice(0, limit);
console.log(`${todo.length} cards to process`);

let done = 0;
const queue = [...todo];
async function worker() {
  while (queue.length) {
    const card = queue.shift();
    manifest[card.cardKey] = await processCard(card);
    done += 1;
    if (done % 10 === 0) {
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
      const ok = Object.values(manifest).filter((m) => m.status === 'downloaded').length;
      console.log(`${done}/${todo.length} processed, ${ok} images so far`);
    }
    await sleep(1200);
  }
}
await Promise.all([worker(), worker(), worker()]);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

const counts = {};
for (const m of Object.values(manifest)) counts[m.status] = (counts[m.status] ?? 0) + 1;
console.log('Done.', counts);
