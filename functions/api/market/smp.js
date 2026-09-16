import { fetchLatestSmp } from '../../_lib/smp-market.mjs';

const FRESH_MS = 60 * 60 * 1000;
let inflight;
let recent;

export async function onRequestGet({ request, env, waitUntil }) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!env.SMP_API_KEY) return Response.json({ success: false, message: 'SMP 정보 연결을 준비 중입니다.' }, { status: 503, headers });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL('/api/market/smp-cache-v2-weighted', request.url));
  let saved = recent;
  if (!saved && cache) {
    try { saved = await (await cache.match(cacheKey))?.json(); } catch { /* Fetch a fresh copy. */ }
  }
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (saved && Date.now() - Date.parse(saved.fetchedAt) < FRESH_MS) {
    return Response.json({ success: true, ...saved, stale: false, previousDay: saved.tradeDate < today }, { headers });
  }
  try {
    if (!inflight) inflight = fetchLatestSmp(env.SMP_API_KEY).finally(() => { inflight = null; });
    const data = await inflight;
    recent = data;
    if (cache) waitUntil(cache.put(cacheKey, Response.json(data, { headers: { 'Cache-Control': 'public, max-age=604800' } })).catch(() => {}));
    return Response.json({ success: true, ...data, stale: false, previousDay: data.tradeDate < today }, { headers });
  } catch {
    // Keep credentials and upstream exception details out of public responses.
    if (saved && Date.now() - Date.parse(saved.fetchedAt) < 7 * 86400000) {
      return Response.json({ success: true, ...saved, stale: true, previousDay: saved.tradeDate < today }, { headers });
    }
    return Response.json({ success: false, message: 'SMP 가격정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.' }, { status: 502, headers });
  }
}
