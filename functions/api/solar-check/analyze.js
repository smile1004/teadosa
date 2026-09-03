const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export async function onRequestPost(context) {
  let input;
  try { input = await context.request.json(); }
  catch { return json({ error: '요청 내용을 확인할 수 없습니다.' }, 400); }

  const address = String(input.address || '').trim();
  const roadAddress = String(input.roadAddress || '').trim();
  const jibunAddress = String(input.jibunAddress || '').trim();
  const vworldKey = String(context.env.VWORLD_API_KEY || '').trim();
  const kakaoRestKey = String(context.env.KAKAO_REST_API_KEY || '').trim();
  if (!address || address.length > 250) return json({ error: '올바른 주소를 선택해 주세요.' }, 400);
  const suppliedLatitude = Number(input.latitude);
  const suppliedLongitude = Number(input.longitude);
  const hasClientCoordinates = Number.isFinite(suppliedLatitude) && suppliedLatitude >= 32 && suppliedLatitude <= 40 && Number.isFinite(suppliedLongitude) && suppliedLongitude >= 124 && suppliedLongitude <= 132;
  if (!hasClientCoordinates && !vworldKey && !kakaoRestKey) {
    return json({ error: 'V-World 또는 카카오 REST 인증키가 아직 배포 환경에 연결되지 않았습니다.' }, 503);
  }

  const candidates = [...new Set([roadAddress, jibunAddress, address].filter(Boolean))];
  // V-World는 인증키에 등록된 서비스 URL과 domain 값을 문자열 기준으로 비교한다.
  // 등록 URL(https://teadosa.pages.dev/)과 동일하게 마지막 슬래시를 포함한다.
  const requestOrigin = `${new URL(context.request.url).origin}/`;
  let location = hasClientCoordinates ? {
    latitude: suppliedLatitude,
    longitude: suppliedLongitude,
    roadAddress: roadAddress || address,
    jibunAddress,
    pnu: null,
    source: '카카오 지도 주소 좌표변환'
  } : null;
  let authorizationFailed = false;
  // 브라우저의 카카오 지도 SDK가 좌표를 먼저 찾았더라도 PNU는 별도 주소 API로 보완한다.
  // 좌표만 성공했다고 서버 검색을 건너뛰면 화면에는 계속 "지번 확인 필요"가 표시된다.
  if (location && !location.pnu && vworldKey) {
    for (const candidate of candidates) {
      const result = await searchVworld(candidate, vworldKey, 'PARCEL', requestOrigin);
      if (result.authorizationFailed) authorizationFailed = true;
      if (result.location?.pnu) {
        location = mergeParcelLocation(location, result.location, '카카오 지도 좌표변환 + V-World 필지검색');
        break;
      }
    }
  }
  if (location && !location.pnu && kakaoRestKey) {
    for (const candidate of candidates) {
      const result = await searchKakao(candidate, kakaoRestKey);
      if (result.authorizationFailed) authorizationFailed = true;
      if (result.location?.pnu) {
        location = mergeParcelLocation(location, result.location, '카카오 지도 좌표변환 + 카카오 지번검색');
        break;
      }
    }
  }
  if (!location && vworldKey) {
    for (const candidate of candidates) {
      for (const category of ['ROAD', 'PARCEL']) {
        const result = await searchVworld(candidate, vworldKey, category, requestOrigin);
        if (result.authorizationFailed) authorizationFailed = true;
        if (result.location) { location = result.location; break; }
      }
      if (location) break;
    }
  }
  if (!location && kakaoRestKey) {
    for (const candidate of candidates) {
      const result = await searchKakao(candidate, kakaoRestKey);
      if (result.authorizationFailed) authorizationFailed = true;
      if (result.location) { location = result.location; break; }
    }
  }
  if (!location && authorizationFailed) {
    return json({ error: '주소 API 인증이 거부되었습니다. 등록한 키의 종류와 허용 도메인을 확인해 주세요.' }, 503);
  }
  if (!location) return json({ error: '선택한 주소의 위치를 찾지 못했습니다. 도로명과 지번주소를 모두 조회했지만 결과가 없습니다.' }, 404);

  const area = Number(input.area);
  const solar = await fetchSolarClimate(location.latitude, location.longitude);
  const spatialReview = vworldKey && location.pnu
    ? await fetchSetbackReview(location, vworldKey, requestOrigin)
    : { parcelGeometry: null, setbacks: unavailableSetbacks('PNU 또는 V-World 공간정보 키 확인 필요') };
  return json({
    mode: 'live',
    roadAddress: String(roadAddress || location.roadAddress || address),
    jibunAddress: String(jibunAddress || location.jibunAddress || ''),
    region: String(input.region || '').slice(0, 100),
    siteType: ['roof', 'land', 'unknown'].includes(input.siteType) ? input.siteType : 'unknown',
    area: Number.isFinite(area) && area > 0 && area < 100000000 ? area : null,
    longitude: location.longitude, latitude: location.latitude,
    pnu: location.pnu || null,
    source: location.source, solar,
    parcelGeometry: spatialReview.parcelGeometry,
    setbacks: spatialReview.setbacks,
    queriedAt: new Date().toISOString()
  });
}

async function fetchSetbackReview(location, key, domain) {
  let parcelFeatures = await fetchVworldFeatures('LP_PA_CBND_BUBUN', key, domain, `pnu:=:${location.pnu}`, null, 5);
  let parcel = parcelFeatures.find((feature) => normalizePnu(feature?.properties?.pnu || feature?.id) === location.pnu) || parcelFeatures[0];
  if (!parcel?.geometry) {
    parcelFeatures = await fetchVworldFeatures('LP_PA_CBND_BUBUN', key, domain, null, `POINT(${location.longitude} ${location.latitude})`, 5);
    parcel = parcelFeatures.find((feature) => normalizePnu(feature?.properties?.pnu || feature?.id) === location.pnu) || parcelFeatures[0];
  }
  const parcelResolved = Boolean(parcel?.geometry);
  const reviewGeometry = parcelResolved ? parcel.geometry : { type: 'Point', coordinates: [location.longitude, location.latitude] };

  const radius = 1400;
  const latGap = radius / 111320;
  const lonGap = radius / (111320 * Math.cos(location.latitude * Math.PI / 180));
  const box = `BOX(${location.longitude - lonGap},${location.latitude - latGap},${location.longitude + lonGap},${location.latitude + latGap})`;
  const [roads, heritage] = await Promise.all([
    fetchVworldFeatures('LT_L_SPRD', key, domain, null, box, 1000),
    fetchVworldFeatures('LT_C_UO301', key, domain, null, box, 500)
  ]);
  return {
    parcelGeometry: parcelResolved ? parcel.geometry : null,
    setbacks: {
      road: distanceResult(reviewGeometry, roads, parcelResolved ? '필지 경계→도로 중심선 참고거리' : '주소 중심점→도로 중심선 임시 참고거리'),
      residential: pendingResult('주택 용도·밀집 호수 판정 필요'),
      river: pendingResult('하천구역 경계 데이터 연동 필요'),
      forest: pendingResult('산림 적용 경계와 조례 확인 필요'),
      heritage: distanceResult(reviewGeometry, heritage, parcelResolved ? '필지 경계→문화재보호도 경계' : '주소 중심점→문화재보호도 임시 참고거리')
    }
  };
}

async function fetchVworldFeatures(dataId, key, domain, attrFilter, geomFilter, size) {
  const endpoint = new URL('https://api.vworld.kr/req/data');
  const params = { service: 'data', request: 'GetFeature', version: '2.0', data: dataId, key, domain, format: 'json', geometry: 'true', attribute: 'true', crs: 'EPSG:4326', size: String(size || 100), page: '1' };
  if (attrFilter) params.attrFilter = attrFilter;
  if (geomFilter) params.geomFilter = geomFilter;
  endpoint.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(endpoint.toString(), { headers: { Accept: 'application/json', Referer: domain } });
    if (!response.ok) return [];
    const payload = await response.json();
    const collection = payload?.response?.result?.featureCollection || payload?.response?.result;
    return Array.isArray(collection?.features) ? collection.features : [];
  } catch { return []; }
}

function unavailableSetbacks(reason) {
  return { road: pendingResult(reason), residential: pendingResult(reason), river: pendingResult(reason), forest: pendingResult(reason), heritage: pendingResult(reason) };
}

function pendingResult(note) { return { distance: null, status: '확인 필요', note }; }

function distanceResult(parcelGeometry, features, note) {
  if (!features.length) return { distance: null, status: '주변 데이터 없음', note };
  let minimum = Infinity;
  for (const feature of features) {
    if (!feature?.geometry) continue;
    minimum = Math.min(minimum, geometryDistanceMeters(parcelGeometry, feature.geometry));
  }
  return Number.isFinite(minimum)
    ? { distance: Math.round(minimum), status: '거리 확인', note }
    : pendingResult(`${note} 계산 실패`);
}

function geometryDistanceMeters(first, second) {
  const a = geometrySegments(first);
  const b = geometrySegments(second);
  if (!a.length || !b.length) return Infinity;
  const latitude = [...a[0][0], ...b[0][0]][1] || 36;
  const project = (point) => [point[0] * 111320 * Math.cos(latitude * Math.PI / 180), point[1] * 111320];
  let min = Infinity;
  for (const lineA of a) for (const lineB of b) {
    const p1 = project(lineA[0]); const p2 = project(lineA[1]);
    const q1 = project(lineB[0]); const q2 = project(lineB[1]);
    min = Math.min(min, segmentDistance(p1, p2, q1, q2));
  }
  return min;
}

function geometrySegments(geometry) {
  const lines = [];
  const visit = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (coordinates.length >= 2 && typeof coordinates[0]?.[0] === 'number') {
      for (let i = 1; i < coordinates.length; i += 1) lines.push([coordinates[i - 1], coordinates[i]]);
      return;
    }
    coordinates.forEach(visit);
  };
  if (geometry.type === 'Point') {
    const p = geometry.coordinates; const tiny = 0.00000001; return [[[p[0] - tiny, p[1]], [p[0] + tiny, p[1]]]];
  }
  visit(geometry.coordinates);
  return lines;
}

function segmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cross(a, b, c); const abD = cross(a, b, d); const cdA = cross(c, d, a); const cdB = cross(c, d, b);
  const epsilon = 0.000001;
  const onSegment = (p, q, r) => q[0] >= Math.min(p[0], r[0]) - epsilon && q[0] <= Math.max(p[0], r[0]) + epsilon && q[1] >= Math.min(p[1], r[1]) - epsilon && q[1] <= Math.max(p[1], r[1]) + epsilon;
  if (((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon)) && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon))) return true;
  return (Math.abs(abC) <= epsilon && onSegment(a, c, b)) || (Math.abs(abD) <= epsilon && onSegment(a, d, b)) || (Math.abs(cdA) <= epsilon && onSegment(c, a, d)) || (Math.abs(cdB) <= epsilon && onSegment(c, b, d));
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

async function searchVworld(address, key, category, domain) {
  const endpoint = new URL('https://api.vworld.kr/req/search');
  endpoint.search = new URLSearchParams({
    service: 'search', request: 'search', version: '2.0', size: '5', page: '1',
    query: address, type: 'address', category, format: 'json',
    crs: 'EPSG:4326', key, domain
  }).toString();
  try {
    const response = await fetch(endpoint.toString(), { headers: { Accept: 'application/json', Referer: domain } });
    if (response.status === 401 || response.status === 403) return { location: null, authorizationFailed: true };
    if (!response.ok) return { location: null, authorizationFailed: false };
    const payload = await response.json();
    const item = payload?.response?.result?.items?.[0];
    const apiError = String(payload?.response?.status || '').toUpperCase() === 'ERROR';
    if (!item?.point) return { location: null, authorizationFailed: apiError && /KEY|AUTH|DOMAIN/i.test(JSON.stringify(payload?.response?.error || {})) };
    return { authorizationFailed: false, location: {
      longitude: Number(item.point.x), latitude: Number(item.point.y),
      roadAddress: item.address?.road || address,
      jibunAddress: item.address?.parcel || '',
      pnu: normalizePnu(item.id), source: 'V-World 주소검색 API'
    }};
  } catch { return { location: null, authorizationFailed: false }; }
}

async function searchKakao(address, key) {
  const endpoint = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  endpoint.searchParams.set('query', address);
  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: 'application/json', Authorization: `KakaoAK ${key}` }
    });
    if (response.status === 401 || response.status === 403) return { location: null, authorizationFailed: true };
    if (!response.ok) return { location: null, authorizationFailed: false };
    const payload = await response.json();
    const item = payload?.documents?.[0];
    if (!item) return { location: null, authorizationFailed: false };
    return { authorizationFailed: false, location: {
      longitude: Number(item.x), latitude: Number(item.y),
      roadAddress: item.road_address?.address_name || address,
      jibunAddress: item.address?.address_name || '',
      pnu: createPnu(item.address), source: '카카오 주소검색 API (V-World 자동 대체)'
    }};
  } catch { return { location: null, authorizationFailed: false }; }
}

function normalizePnu(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 19 ? digits : null;
}

function mergeParcelLocation(base, parcel, source) {
  return {
    ...base,
    roadAddress: base.roadAddress || parcel.roadAddress || '',
    jibunAddress: base.jibunAddress || parcel.jibunAddress || '',
    pnu: parcel.pnu,
    source
  };
}

function createPnu(parcel) {
  if (!parcel || !/^\d{10}$/.test(String(parcel.b_code || ''))) return null;
  const mountain = parcel.mountain_yn === 'Y' ? '2' : '1';
  const main = String(parcel.main_address_no || '').replace(/\D/g, '').padStart(4, '0');
  const sub = String(parcel.sub_address_no || '').replace(/\D/g, '').padStart(4, '0');
  if (main === '0000') return null;
  return `${parcel.b_code}${mountain}${main}${sub}`;
}
