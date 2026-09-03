export async function onRequestGet(context) {
  return Response.json({ kakaoJavaScriptKey: context.env.KAKAO_JAVASCRIPT_KEY || null }, {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' }
  });
}
