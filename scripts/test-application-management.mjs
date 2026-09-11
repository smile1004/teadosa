import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

async function moduleUrl(path) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const match of [...source.matchAll(/from '([^']+)'/g)]) {
    if (match[1].startsWith('.')) {
      const child = new URL(match[1], new URL(path, import.meta.url));
      source = source.replace(match[0], `from '${await moduleUrl(child)}'`);
    }
  }
  return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
}
const { manageApplication } = await import(await moduleUrl('../functions/_lib/application-management.js'));
const db = new DatabaseSync(':memory:');
for (const file of ['schema/member_system_v1_fresh.sql', 'migrations/009_generation_license_system_v1.sql', 'migrations/014_development_permit_system_v1.sql', 'migrations/015_ppa_reception_system_v1.sql', 'migrations/016_construction_plan_system_v1.sql']) {
  db.exec(await readFile(new URL('../database/' + file, import.meta.url), 'utf8'));
}
const env = { DB: { prepare(sql) { return { bind(...args) { return {
  async first() { return db.prepare(sql).get(...args) || null; },
  async run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; }
}; } }; } } };
for (const [id, role] of [[1, 'member'], [2, 'member'], [3, 'admin']]) {
  db.prepare(`INSERT INTO members(id,member_type,username,email,password_hash,name,phone,role,created_at,updated_at) VALUES(?,'personal',?,?,'hash','테스트','01012345678',?,'2026','2026')`).run(id, 'user' + id, id + '@example.com', role);
  db.prepare(`INSERT INTO sessions(member_id,token_hash,created_at,expires_at,last_used_at) VALUES(?,?,'2026','2099-01-01','2026')`).run(id, createHash('sha256').update('token' + id).digest('hex'));
}
const tables = { precheck: 'precheck_requests', license: 'generation_license_requests', development: 'development_permit_requests', ppa: 'ppa_requests', 'construction-plan': 'construction_plan_requests' };
function seed(type, id = 1) {
  const data = { id, request_no: type + id, member_id: 1, applicant_name: '신청인', phone: '01012345678', email: 'owner@example.com', site_address: '서울시 원본주소', form_data: JSON.stringify({ preserved: 'keep', requestNote: '원본 요청' }), updated_at: '2026-09-01' };
  if (type === 'license') data.precheck_request_id = 1;
  if (type !== 'precheck') data.privacy_consented_at = '2026-09-01';
  if (type === 'ppa') data.user_type = 'new';
  if (type === 'construction-plan') Object.assign(data, { user_type: 'new', capacity_type: 'unknown' });
  db.prepare(`INSERT INTO ${tables[type]} (${Object.keys(data)}) VALUES (${Object.keys(data).map(() => '?')})`).run(...Object.values(data));
}
async function call(type, method = 'GET', body, user = 1, admin = false, headers = {}, id = '1') {
  const request = new Request('https://test.local/api/applications/' + type + '/' + id, { method, headers: { cookie: user ? 'teadosa_session=token' + user : '', 'content-type': 'application/json', ...headers }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
  const response = await manageApplication({ request, env, params: { type, id } }, admin);
  return { status: response.status, body: await response.json() };
}
for (const type of Object.keys(tables)) seed(type);
assert.equal((await call('precheck', 'GET', null, 0)).status, 401);
assert.equal((await call('precheck', 'GET', null, 2)).status, 404);
assert.equal((await call('precheck', 'GET', null, 1, true)).status, 403);
assert.equal((await call('bad')).status, 400);
assert.equal((await call('precheck', 'GET', null, 1, false, {}, '1junk')).status, 400);
for (const type of Object.keys(tables)) {
  const loaded = await call(type);
  assert.equal(loaded.status, 200);
  assert.equal(loaded.body.request.internalMemo, undefined);
  const payload = { updatedAt: loaded.body.request.updatedAt, values: { ...loaded.body.request.values, applicantName: '수정 신청인', phone: '010-9876-5432', siteAddress: '서울시 수정주소', requestNote: '수정 요청' } };
  assert.equal((await call(type, 'PUT', payload, 2)).status, 404);
  assert.equal((await call(type, 'DELETE', payload, 2)).status, 404);
  assert.equal((await call(type, 'PUT', payload, 1, false, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(type, 'PUT', { ...payload, values: { ...payload.values, phone: 'abc' } })).status, 400);
  assert.equal((await call(type, 'PUT', payload)).status, 200);
  assert.equal((await call(type, 'PUT', payload)).status, 409);
  assert.equal((await call(type, 'DELETE', payload)).status, 409);
  const row = db.prepare(`SELECT * FROM ${tables[type]} WHERE id=1`).get();
  assert.equal(row.phone, '01098765432');
  const form = JSON.parse(row.form_data);
  assert.equal(form.preserved, 'keep');
  assert.equal(type === 'precheck' ? form.applicant.siteAddress : form.siteAddress, row.site_address);
  const adminLoaded = await call(type, 'GET', null, 3, true);
  assert.equal(adminLoaded.status, 200);
  assert.equal((await call(type, 'PUT', { updatedAt: row.updated_at, values: { ...adminLoaded.body.request.values, applicantName: '관리자 수정' } }, 3, true)).status, 200);
}
let precheck = (await call('precheck')).body.request;
assert.equal((await call('precheck', 'DELETE', { updatedAt: precheck.updatedAt })).status, 409);
db.exec("UPDATE precheck_requests SET status='completed' WHERE id=1");
assert.equal((await call('precheck', 'PUT', { updatedAt: precheck.updatedAt, values: { ...precheck.values, siteAddress: '다른 사업지' } })).status, 409);
for (const type of ['license', 'development', 'ppa', 'construction-plan', 'precheck']) {
  const loaded = (await call(type)).body.request;
  assert.equal((await call(type, 'DELETE', { updatedAt: loaded.updatedAt }, 3, true)).status, 200);
  assert.equal((await call(type)).status, 404);
}
seed('precheck', 2);
const owned = (await call('precheck', 'GET', null, 1, false, {}, '2')).body.request;
assert.equal((await call('precheck', 'DELETE', { updatedAt: owned.updatedAt }, 1, false, {}, '2')).status, 200);
console.log('PASS: five services; real SQLite + session auth; ownership/admin permissions; validation; synchronized fields; stale-write protection; linked-delete restriction; member/admin deletion.');
