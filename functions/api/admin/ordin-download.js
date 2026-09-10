export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const src = url.searchParams.get('src');
  if (!src) return new Response('src 파라미터가 필요합니다.', { status: 400 });

  let target;
  try {
    target = new URL(src);
  } catch {
    return new Response('잘못된 다운로드 주소입니다.', { status: 400 });
  }
  if (!/(^|\.)law\.go\.kr$/i.test(target.hostname)) {
    return new Response('허용되지 않은 다운로드 주소입니다.', { status: 400 });
  }
  target.protocol = 'https:';

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.law.go.kr/',
        Accept: '*/*',
      },
    });
  } catch {
    return new Response('파일 서버에 연결하지 못했습니다.', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(`파일을 가져오지 못했습니다. (${upstream.status})`, { status: 502 });
  }

  const upstreamType = upstream.headers.get('Content-Type') || '';
  if (upstreamType.includes('text/html')) {
    return new Response(
      '국가법령정보센터 파일 서버가 일시적으로 혼잡하여 파일을 받지 못했습니다. 잠시 후 다시 시도해 주세요.',
      { status: 502 }
    );
  }

  let filename = (url.searchParams.get('name') || target.searchParams.get('flNm') || '첨부파일').trim();
  try {
    filename = decodeURIComponent(filename);
  } catch {
    /* keep as-is */
  }
  filename = filename.replace(/[\\/:*?"<>|]/g, '_');

  const ext = (url.searchParams.get('ext') || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (ext && !filename.toLowerCase().endsWith(`.${ext}`)) filename += `.${ext}`;

  const headers = new Headers();
  headers.set('Content-Type', upstreamType || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  headers.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: 200, headers });
}
