export async function onRequestGet(context) {
  return Response.json({
    kakaoJavaScriptKey: String(context.env.KAKAO_JAVASCRIPT_KEY || '').trim() || null,
    vworldApiKey: String(context.env.VWORLD_API_KEY || '').trim() || null
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'X-Content-Type-Options': 'nosniff' }
  });
}
