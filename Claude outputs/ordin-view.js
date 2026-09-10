export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mst = url.searchParams.get('mst');
  if (!/^\d{1,20}$/.test(String(mst || ''))) {
    return new Response('잘못된 요청입니다.', { status: 400 });
  }

  const oc = String(env.LAW_API_OC || '').trim();
  if (!oc) {
    return new Response('서버에 LAW_API_OC가 설정되어 있지 않습니다.', { status: 503 });
  }

  const target = `https://www.law.go.kr/DRF/lawService.do?OC=${encodeURIComponent(oc)}&target=ordin&MST=${encodeURIComponent(mst)}&type=HTML&mobileYn=`;

  let upstream;
  try {
    upstream = await fetch(target, {
      redirect: 'follow',
      headers: {
        Referer: 'https://teadosa.pages.dev/',
        Origin: 'https://teadosa.pages.dev',
      },
    });
  } catch {
    return new Response('법령정보 서버에 연결하지 못했습니다.', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(`원문을 가져오지 못했습니다. (${upstream.status})`, { status: 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: 200, headers });
}
