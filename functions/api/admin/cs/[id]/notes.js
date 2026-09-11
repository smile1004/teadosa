import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

const STATUSES = ['waiting', 'in_progress', 'done'];

export async function onRequestPost({ request, env, params }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    if (!id) return invalid('올바른 상담 ID가 아닙니다.');
    let body;
    try { body = await request.json(); } catch { return invalid('등록할 내용을 확인해 주세요.'); }
    const status = String(body.status || '');
    if (!STATUSES.includes(status)) return invalid('처리상태를 확인해 주세요.');
    const note = text(body.note, 2000);
    if (!note) return invalid('처리내용을 입력해 주세요.');
    const author = text(body.author, 40);
    if (!author) return invalid('담당자(작성자)를 입력해 주세요.');

    const existing = await env.DB.prepare('SELECT id FROM cs_calls WHERE id=?').bind(id).first();
    if (!existing) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '상담 내역을 찾을 수 없습니다.' }, 404);

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO cs_call_notes (call_id, status, author, note, created_by, created_at)
      VALUES (?,?,?,?,?,?)
    `).bind(id, status, author, note, auth.admin.member_id, now).run();

    await env.DB.prepare('UPDATE cs_calls SET status=?, updated_at=? WHERE id=?').bind(status, now, id).run();

    return jsonResponse({ success: true, code: 'CS_CALL_NOTE_ADDED', message: '처리 기록이 추가되었습니다.', updatedAt: now });
  } catch (err) {
    console.error('CS 상담 처리기록 등록 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '처리 기록을 추가하는 중 오류가 발생했습니다.' }, 500);
  }
}

function text(v, n) { return String(v ?? '').normalize('NFKC').trim().slice(0, n); }
function invalid(message) { return jsonResponse({ success: false, code: 'INVALID_REQUEST', message }, 400); }
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'POST 방식으로 요청해 주세요.' }, 405, { Allow: 'POST' }); }
export function onRequestGet() { return method(); }
export function onRequestPut() { return method(); }
export function onRequestPatch() { return method(); }
export function onRequestDelete() { return method(); }
