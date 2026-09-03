export async function onRequestGet(context) {
  return Response.json({ kakaoJavaScriptKey: String(context.env.KAKAO_JAVASCRIPT_KEY || '').trim() || null }, {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' }
  });
}
