import { fetchSupportNotices } from '../_lib/support-notices.mjs';

let recent;
let inflight;
const HOUR = 3600000;
export async function onRequestGet({ request, waitUntil }) {
  const headers = { 'Cache-Control': 'no-store' };
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL('/api/support-notices-cache-v3', request.url));
  let saved = recent;
  if (!saved && cache) {
    try { saved = await (await cache.match(key))?.json(); } catch { /* Retry upstream. */ }
  }
  if (saved && Date.now() - Date.parse(saved.fetchedAt) < HOUR) {
    return Response.json({ success: true, ...saved, stale: false }, { headers });
  }
  try {
    if (!inflight) inflight = fetchSupportNotices().finally(() => { inflight = null; });
    recent = await inflight;
    if (cache) waitUntil(cache.put(key, Response.json(recent, { headers: { 'Cache-Control': 'public, max-age=604800' } })).catch(() => {}));
    return Response.json({ success: true, ...recent, stale: false }, { headers });
  } catch {
    if (saved && Date.now() - Date.parse(saved.fetchedAt) < 7 * 24 * HOUR) {
      return Response.json({ success: true, ...saved, stale: true }, { headers });
    }
    return Response.json({ success: false, message: '공고를 불러오지 못했습니다. 더보기에서 확인해 주세요.' }, { status: 502, headers });
  }
}
