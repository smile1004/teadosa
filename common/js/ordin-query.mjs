export async function queryOrdin(input, oc, fetcher = fetch) {
  oc = String(oc || '').trim();
  if (!oc) return {status:503, body:{message:'서버에 LAW_API_OC를 설정해 주세요. 국가법령정보에서 승인받은 OC 인증값을 사용합니다.'}};
  const detail = input?.mode === 'detail';
  const params = new URLSearchParams({OC:oc,target:'ordin',type:'JSON'});
  if (detail) {
    if (!/^\d{1,20}$/.test(String(input.id || ''))) return {status:400,body:{message:'조회할 조례를 선택해 주세요.'}};
    params.set('ID', input.id);
  } else {
    const query = String(input?.query || '').trim();
    if (!query || query.length > 150) return {status:400,body:{message:'검색어를 1~150자로 입력해 주세요.'}};
    params.set('query',query); params.set('nw','1'); params.set('knd','30001');
    params.set('search',input.search === '2' ? '2' : '1'); params.set('display','20');
    params.set('page',String(Math.max(1,Math.min(1000,Number.parseInt(input.page,10)||1))));
    for (const field of ['org','sborg']) {
      if (input[field]) {
        if (!/^\d{7}$/.test(String(input[field]))) return {status:400,body:{message:'기관코드는 7자리 숫자입니다. 한전 조회용 지역코드와 다릅니다.'}};
        params.set(field,input[field]);
      }
    }
    if (params.has('sborg') && !params.has('org')) return {status:400,body:{message:'시군구 기관코드를 사용하려면 시도 기관코드도 입력해 주세요.'}};
  }
  const start = Date.now();
  const controller = new AbortController(); let timeout = false;
  const timer = setTimeout(()=>{timeout=true;controller.abort();},20000);
  try {
    const response = await fetcher(`https://www.law.go.kr/DRF/${detail?'lawService':'lawSearch'}.do?${params}`,{signal:controller.signal,redirect:'manual',headers:{Referer:'https://teadosa.pages.dev/',Origin:'https://teadosa.pages.dev'}});
    const raw = (await response.text()).split(oc).join('[인증값 숨김]');
    let payload;
    try {payload=JSON.parse(raw);} catch {
      return {status:502,body:{message:'법령 API가 JSON 대신 다른 응답을 반환했습니다. 승인 상태와 등록 도메인·호출 IP를 확인해 주세요.',upstreamStatus:response.status,elapsedMs:Date.now()-start,raw:raw.slice(0,4000)}};
    }
    if (payload && typeof payload.msg === 'string') return {status:502,body:{message:`국가법령정보 API: ${payload.msg}`,code:'LAW_REQUEST_REJECTED',upstreamStatus:response.status,payload}};
    if (!response.ok) return {status:502,body:{message:'법령 API에서 오류를 반환했습니다.',upstreamStatus:response.status,payload}};
    if (detail) {
      if (!payload?.LawService) return {status:502,body:{message:'조례 본문을 받지 못했습니다. 원본 응답을 확인해 주세요.',payload}};
      return {status:200,body:{message:'조례 본문을 조회했습니다.',detail:payload.LawService,payload}};
    }
    const root=payload?.OrdinSearch;
    if (!root || root.totalCnt === undefined) return {status:502,body:{message:'검색 목록을 받지 못했습니다. OC 승인 상태와 원본 응답을 확인해 주세요.',payload}};
    const rows=root.law ? (Array.isArray(root.law)?root.law:[root.law]) : [];
    return {status:200,body:{message:`총 ${root.totalCnt}건 중 ${rows.length}건을 표시합니다.`,rows,total:Number(root.totalCnt)||0,page:Number(params.get('page')),elapsedMs:Date.now()-start,payload}};
  } catch {
    return {status:timeout?504:502,body:{message:timeout?'법령 API가 20초 안에 응답하지 않았습니다.':'법령 API 연결에 실패했습니다.',code:timeout?'LAW_TIMEOUT':'LAW_CONNECTION_FAILED',elapsedMs:Date.now()-start}};
  } finally {clearTimeout(timer);}
}
