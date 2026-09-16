import assert from 'node:assert/strict';
import { normalizeSmp, fetchLatestSmp } from '../functions/_lib/smp-market.mjs';

const now = new Date('2026-09-16T00:00:00Z');
const day = date => Array.from({ length: 24 }, (_,i) => [
  { date, hour: String(i+1).padStart(2,'0'), areaName: '육지', smp: 100+i, mlfd: 1, jlfd: 9 },
  { date, hour: String(i+1).padStart(2,'0'), areaName: '제주', smp: i-12, mlfd: 9, jlfd: 1 }
]).flat();
const rows = day('20260916');
let data = normalizeSmp(rows, now);
assert.equal(data.areas.land.average, 111.5);
assert.equal(data.areas.jeju.min, -12);
assert.equal(data.areas.jeju.average, -0.5);
assert.equal(data.areas.jeju.sampleCount, 24);
const weightedRows = rows.map(row => ({ ...row, smp: row.hour === '24' ? 200 : 100, mlfd: row.hour === '24' ? 23 : 1, jlfd: row.hour === '24' ? 69 : 1, slfd: 999 }));
const weighted = normalizeSmp(weightedRows, now);
assert.equal(weighted.areas.land.average, 150);
assert.equal(weighted.areas.jeju.average, 175);
assert.equal(weighted.areas.land.min, 100);
assert.equal(weighted.areas.land.max, 200);
assert.throws(() => normalizeSmp(rows.map(row => ({ ...row, mlfd: 0, jlfd: 0 })), now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp([{ ...rows[0], mlfd: undefined }, ...rows.slice(1)], now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp([{ ...rows[1], jlfd: -1 }, ...rows.filter((_,i) => i !== 1)], now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp([...rows, { ...rows[0], mlfd: 2 }], now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp(rows.slice(1), now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp([{ ...rows[0], smp: '' }, ...rows.slice(1)], now), /NO_COMPLETE_DAY/);
assert.throws(() => normalizeSmp([...rows, { ...rows[0], smp: 999 }], now), /NO_COMPLETE_DAY/);
data = normalizeSmp([...day('20260917'), ...rows.slice(1), ...day('20260915')], now);
assert.equal(data.tradeDate, '2026-09-15');
const urls=[];
const fetcher = async url => {
  urls.push(url);
  return Response.json({ response: { header: { resultCode: '00' }, body: { totalCount: 48, items: { item: rows } } } });
};
data = await fetchLatestSmp('test%2Bkey%3D', fetcher, now);
assert.equal(data.tradeDate, '2026-09-16');
assert.equal(urls[0].searchParams.get('serviceKey'), 'test+key=');
assert.equal(urls.length, 1);
await assert.rejects(fetchLatestSmp('test', async () => Response.json({ response: { header: { resultCode: '30' } } }), now), /UPSTREAM_REJECTED/);
console.log('PASS: regional demand-weighted averages, invalid demand, negative/zero SMP, missing/conflicting rows, future dates, fallback, encoding and provider errors.');
