const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export async function onRequestPost(context) {
  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: '요청 내용을 확인할 수 없습니다.' }, 400); }

  const address = String(input.address || '').trim();
  if (!address || address.length > 250) return json({ error: '올바른 주소를 선택해 주세요.' }, 400);
  if (!context.env.VWORLD_API_KEY && !context.env.KAKAO_REST_API_KEY) {
    return json({ error: 'V-World 또는 카카오 REST 인증키가 아직 배포 환경에 연결되지 않았습니다.' }, 503);
  }

  let location = null;
  if (context.env.VWORLD_API_KEY) location = await searchVworld(address, context.env.VWORLD_API_KEY);
  if (!location && context.env.KAKAO_REST_API_KEY) location = await searchKakao(address, context.env.KAKAO_REST_API_KEY);
  if (!location) return json({ error: '선택한 주소의 위치를 찾지 못했습니다. 지번주소로 다시 확인해 주세요.' }, 404);

  const area = Number(input.area);
  const solar = await fetchSolarClimate(location.latitude, location.longitude);
  return json({
    mode: 'live',
    roadAddress: String(input.roadAddress || location.roadAddress || address),
    jibunAddress: String(input.jibunAddress || location.jibunAddress || ''),
    region: String(input.region || '').slice(0, 100),
    siteType: ['roof', 'land', 'unknown'].includes(input.siteType) ? input.siteType : 'unknown',
    area: Number.isFinite(area) && area > 0 && area < 100000000 ? area : null,
    longitude: location.longitude, latitude: location.latitude,
    pnu: location.pnu || null,
    source: location.source, solar, queriedAt: new Date().toISOString()
  });
}

async function fetchSolarClimate(latitude, longitude) {
  const endpoint = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  endpoint.search = new URLSearchParams({ parameters: 'ALLSKY_SFC_SW_DWN', community: 'RE', longitude: String(longitude), latitude: String(latitude), start: '2001', end: '2020', format: 'JSON' }).toString();
  try {
    const response = await fetch(endpoint.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    const values = payload?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
    const keys = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const days = [31,28.25,31,30,31,30,31,31,30,31,30,31];
    if (!values || keys.some((key) => !Number.isFinite(Number(values[key])))) return null;
    const monthly = keys.map((key, index) => ({ month: index + 1, irradiance: Number(values[key]), days: days[index] }));
    return { averageDaily: monthly.reduce((sum, item) => sum + item.irradiance * item.days, 0) / 365.25, monthly, source: 'NASA POWER 장기평균 일사량' };
  } catch { return null; }
}

async function searchVworld(address, key) {
  const endpoint = new URL('https://api.vworld.kr/req/search');
  endpoint.search = new URLSearchParams({
    service: 'search', request: 'search', version: '2.0', size: '5', page: '1',
    query: address, type: 'address', category: 'road', format: 'json',
    crs: 'EPSG:4326', key
  }).toString();
  try {
    const response = await fetch(endpoint.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = payload?.response?.result?.items?.[0];
    if (!item?.point) return null;
    return {
      longitude: Number(item.point.x), latitude: Number(item.point.y),
      roadAddress: item.address?.road || address,
      jibunAddress: item.address?.parcel || '',
      pnu: normalizePnu(item.id), source: 'V-World 주소검색 API'
    };
  } catch { return null; }
}

async function searchKakao(address, key) {
  const endpoint = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  endpoint.searchParams.set('query', address);
  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: 'application/json', Authorization: `KakaoAK ${key}` }
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = payload?.documents?.[0];
    if (!item) return null;
    return {
      longitude: Number(item.x), latitude: Number(item.y),
      roadAddress: item.road_address?.address_name || address,
      jibunAddress: item.address?.address_name || '',
      pnu: createPnu(item.address), source: '카카오 주소검색 API (V-World 자동 대체)'
    };
  } catch { return null; }
}

function normalizePnu(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 19 ? digits : null;
}

function createPnu(parcel) {
  if (!parcel || !/^\d{10}$/.test(String(parcel.b_code || ''))) return null;
  const mountain = parcel.mountain_yn === 'Y' ? '2' : '1';
  const main = String(parcel.main_address_no || '').replace(/\D/g, '').padStart(4, '0');
  const sub = String(parcel.sub_address_no || '').replace(/\D/g, '').padStart(4, '0');
  if (main === '0000') return null;
  return `${parcel.b_code}${mountain}${main}${sub}`;
}
