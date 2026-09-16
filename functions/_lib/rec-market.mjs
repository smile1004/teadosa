const ENDPOINT = 'https://apis.data.go.kr/B552115/RecMarketInfo2/getRecMarketInfo2';

function number(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeRec(row) {
  const date = String(row.bzDd || '');
  if (!/^\d{8}$/.test(date)) throw new Error('INVALID_DATA');
  function area(prefix) {
    const count = number(row[prefix + 'TrdCnt']);
    const prices = [row[prefix + 'HgPrc'], row[prefix + 'LwPrc'], row[prefix + 'AvgPrc']].map(number);
    if (count === 0) return { max: null, min: null, average: null, noTrades: true };
    if (count === null || prices.some(value => value === null) || prices[0] < prices[1] || prices[2] < prices[1] || prices[2] > prices[0]) {
      throw new Error('INVALID_DATA');
    }
    return { max: prices[0], min: prices[1], average: prices[2], noTrades: false };
  }
  return {
    tradeDate: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,
    unit: '원/REC', source: '한국전력거래소',
    sourceUrl: 'https://www.data.go.kr/data/15099762/openapi.do',
    areas: { land: area('land'), jeju: area('jeju') }
  };
}

export async function fetchLatestRec(key, fetcher = fetch, now = new Date()) {
  // Accept both encoded and decoded keys without double encoding.
  let decoded = key.trim();
  try { decoded = decodeURIComponent(decoded); } catch { throw new Error('INVALID_KEY'); }
  async function page(pageNo) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ serviceKey: decoded, dataType: 'json', pageNo: String(pageNo), numOfRows: '100' });
    const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('UPSTREAM_ERROR');
    let payload;
    try { payload = await response.json(); } catch { throw new Error('UPSTREAM_FORMAT'); }
    if (String(payload.response?.header?.resultCode) !== '00') throw new Error('UPSTREAM_REJECTED');
    const body = payload.response.body;
    const count = number(body?.totalCount);
    if (!count) throw new Error('NO_DATA');
    const item = body.items?.item;
    return { count, rows: Array.isArray(item) ? item : item ? [item] : [] };
  }
  const first = await page(1);
  const lastPage = Math.ceil(first.count / 100);
  const last = lastPage > 1 ? await page(lastPage) : first;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
  const rows = [...first.rows, ...last.rows].filter(row => /^\d{8}$/.test(String(row.bzDd)) && row.bzDd <= today);
  rows.sort((a,b) => String(b.bzDd).localeCompare(String(a.bzDd)));
  if (!rows.length) throw new Error('NO_DATA');
  return { ...normalizeRec(rows[0]), fetchedAt: now.toISOString() };
}
