import assert from 'node:assert/strict';
import { fetchLatestRec, normalizeRec } from '../functions/_lib/rec-market.mjs';

const row = { bzDd: '20260915', landTrdCnt: 3, landHgPrc: 71900, landLwPrc: 71300, landAvgPrc: 71770, jejuTrdCnt: 0 };
assert.equal(normalizeRec(row).areas.land.average, 71770);
assert.deepEqual(normalizeRec(row).areas.jeju, { max: null, min: null, average: null, noTrades: true });
assert.throws(() => normalizeRec({ ...row, landAvgPrc: '' }));
assert.throws(() => normalizeRec({ ...row, landAvgPrc: 99999 }));
const calls = [];
const mockFetch = async url => {
  calls.push(url);
  const items = url.searchParams.get('pageNo') === '1' ? { ...row, bzDd: '20170530' } : [row];
  return Response.json({ response: { header: { resultCode: '00' }, body: { totalCount: 925, items: { item: items } } } });
};
const result = await fetchLatestRec('test%2Bkey%3D', mockFetch, new Date('2026-09-16T00:00:00Z'));
assert.equal(result.tradeDate, '2026-09-15');
assert.equal(calls.length, 2);
assert.equal(calls[1].searchParams.get('pageNo'), '10');
assert.equal(calls[0].searchParams.get('serviceKey'), 'test+key=');
await assert.rejects(fetchLatestRec('test', async () => Response.json({ response: { header: { resultCode: '30' } } })), /UPSTREAM_REJECTED/);
await assert.rejects(fetchLatestRec('test', async () => new Response('<error/>')), /UPSTREAM_FORMAT/);
console.log('PASS: REC latest-page selection, official average, missing/no-trade data, key encoding and provider errors.');
