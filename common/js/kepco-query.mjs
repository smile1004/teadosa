export async function queryKepco(input, key, fetcher = fetch) {
  if (!key) return { status: 503, body: { message: '서버에 KEPCO_API_KEY 환경변수를 설정해 주세요.' } };
  const params = new URLSearchParams({ apiKey: key, returnType: 'json' });
  for (const field of ['metroCd', 'cityCd', 'addrLidong', 'addrLi', 'addrJibun', 'substCd']) {
    const value = String(input?.[field] || '').trim();
    if (value.length > 80) return { status: 400, body: { message: '조회 조건이 너무 깁니다.' } };
    if (value) params.set(field, value);
  }
  if (!params.has('substCd') && !(params.has('metroCd') && params.has('cityCd') && params.has('addrLidong'))) {
    return { status: 400, body: { message: '테스트 조회는 시도코드·시군구코드·읍면동 또는 변전소코드를 입력해 주세요.' } };
  }
  const started = Date.now();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  try {
    const response = await fetcher('https://bigdata.kepco.co.kr/openapi/v1/dispersedGeneration.do?' + params, { signal: controller.signal, redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) return { status: 502, body: { code: 'KEPCO_REDIRECT', upstreamStatus: response.status, elapsedMs: Date.now() - started, message: '한전 API가 다른 주소로 이동하는 응답을 반환했습니다. 인증키 보호를 위해 이동을 중단했습니다.' } };
    const raw = (await response.text()).split(key).join('[인증키 숨김]');
    let payload;
    try { payload = JSON.parse(raw); } catch { return { status: 502, body: { message: '한전 응답이 JSON 형식이 아닙니다. 서버 응답을 확인해 주세요.', upstreamStatus: response.status, raw: raw.slice(0, 4000) } }; }
    const rows = Array.isArray(payload.data) ? payload.data : null;
    return { status: response.ok ? 200 : 502, body: { upstreamStatus: response.status, elapsedMs: Date.now() - started, queriedAt: new Date().toISOString(), rows: rows || [], message: !response.ok ? '한전 API가 오류를 반환했습니다.' : rows ? (rows.length ? `${rows.length}건을 조회했습니다.` : '조회된 데이터가 없습니다. 주소 조건을 확인해 주세요.') : '예상한 데이터 목록이 없습니다. 원본 응답에서 인증 또는 요청 오류를 확인해 주세요.', payload } };
  } catch {
    return { status: timedOut ? 504 : 502, body: { code: timedOut ? 'KEPCO_TIMEOUT' : 'KEPCO_CONNECTION_FAILED', elapsedMs: Date.now() - started, message: timedOut ? '한전 API가 20초 안에 응답하지 않았습니다. 잠시 후 다시 조회해 주세요.' : '서버에서 한전 API로 연결하는 중 오류가 발생했습니다. 원본 응답의 오류 코드와 경과시간을 확인해 주세요.' } };
  } finally {
    clearTimeout(timer);
  }
}
