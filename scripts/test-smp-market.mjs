import assert from 'node:assert/strict';
import { normalizeSmp, fetchLatestSmp } from '../functions/_lib/smp-market.mjs';

const now = new Date('2026-09-16T00:00:00Z');
const day = date => Array.from({ length: 24 }, (_,i) => [
  { date, hour: String(i+1).padStart(2,'0'), areaName: '육지', smp: 100+i },
  { date, hour: String(i+1).padStart(2,'0'), areaName: '제주', smp: i-12 }
]).flat();
const rows = day('20260916');
let data = normalizeSmp(rows, now);
assert.equal(data.areas.land.average, 111.5);
assert.equal(data.areas.jeju.min, -12);
assert.equal(data.areas.jeju.average, -0.5);
assert.equal(data.areas.jeju.sampleCount, 24);
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
console.log('PASS: 24-hour averages, negative/zero SMP, missing/conflicting rows, future dates, fallback, encoding and provider errors.');
