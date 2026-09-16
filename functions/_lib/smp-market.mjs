const ENDPOINT = 'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand';

export function normalizeSmp(rows, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
  const days = new Map();
  for (const row of rows) {
    const date = String(row.date || '');
    const region = { '육지': 'land', '제주': 'jeju' }[row.areaName];
    if (!region || !/^\d{8}$/.test(date) || date > today) continue;
    if (!days.has(date)) days.set(date, { land: new Map(), jeju: new Map(), invalid: false });
    const day = days.get(date);
    const hour = Number(row.hour);
    // SMP can be zero or negative; missing prices must never become zero.
    const value = row.smp;
    const price = value === null || value === undefined || String(value).trim() === '' ? NaN : Number(value);
    if (!Number.isInteger(hour) || hour < 1 || hour > 24 || !Number.isFinite(price)) { day.invalid = true; continue; }
    if (day[region].has(hour) && day[region].get(hour) !== price) day.invalid = true;
    day[region].set(hour, price);
  }
  const date = [...days.keys()].sort().reverse().find(date => {
    const day = days.get(date);
    return !day.invalid && day.land.size === 24 && day.jeju.size === 24;
  });
  if (!date) throw new Error('NO_COMPLETE_DAY');
  function area(region) {
    const values = [...days.get(date)[region].values()];
    return { max: Math.max(...values), min: Math.min(...values), average: Number((values.reduce((a,b) => a+b, 0) / 24).toFixed(2)), sampleCount: 24 };
  }
  return {
    tradeDate: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,
    unit: '원/kWh', source: '한국전력거래소',
    sourceUrl: 'https://www.data.go.kr/data/15131225/openapi.do',
    averageMethod: '24시간 단순평균',
    areas: { land: area('land'), jeju: area('jeju') }
  };
}

export async function fetchLatestSmp(key, fetcher = fetch, now = new Date()) {
  let decoded;
  try { decoded = decodeURIComponent(key.trim()); } catch { throw new Error('INVALID_KEY'); }
  const rows = [];
  // The provider returns newest dates first. Keep fallback calls bounded.
  for (let pageNo = 1; pageNo <= 3; pageNo++) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ serviceKey: decoded, dataType: 'json', pageNo: String(pageNo), numOfRows: '100' });
    const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('UPSTREAM_ERROR');
    let payload;
    try { payload = await response.json(); } catch { throw new Error('UPSTREAM_FORMAT'); }
    if (String(payload.response?.header?.resultCode) !== '00') throw new Error('UPSTREAM_REJECTED');
    const body = payload.response.body;
    const item = body?.items?.item;
    const batch = Array.isArray(item) ? item : item ? [item] : [];
    rows.push(...batch);
    try { return { ...normalizeSmp(rows, now), fetchedAt: now.toISOString() }; }
    catch (error) { if (error.message !== 'NO_COMPLETE_DAY') throw error; }
    if (batch.length < 100 || pageNo * 100 >= Number(body.totalCount)) break;
  }
  throw new Error('NO_COMPLETE_DAY');
}
