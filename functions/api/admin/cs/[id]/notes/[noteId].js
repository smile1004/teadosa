import { requireAdmin, jsonResponse } from '../../../../../_lib/admin-auth.js';

const STATUSES = ['waiting', 'in_progress', 'done'];

export async function onRequestPut({ request, env, params }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const callId = Number.parseInt(params.id, 10);
    const noteId = Number.parseInt(params.noteId, 10);
    if (!callId || !noteId) return invalid('올바른 요청이 아닙니다.');
    let body;
    try { body = await request.json(); } catch { return invalid('수정할 내용을 확인해 주세요.'); }
    const status = String(body.status || '');
    if (!STATUSES.includes(status)) return invalid('처리상태를 확인해 주세요.');
    const note = text(body.note, 2000);
    if (!note) return invalid('처리내용을 입력해 주세요.');
    const author = text(body.author, 40);
    if (!author) return invalid('담당자(작성자)를 입력해 주세요.');

    const existing = await env.DB.prepare('SELECT id FROM cs_call_notes WHERE id=? AND call_id=?').bind(noteId, callId).first();
    if (!existing) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '처리 기록을 찾을 수 없습니다.' }, 404);

    await env.DB.prepare('UPDATE cs_call_notes SET status=?, author=?, note=? WHERE id=?').bind(status, author, note, noteId).run();

    const now = new Date().toISOString();
    const latest = await env.DB.prepare('SELECT status FROM cs_call_notes WHERE call_id=? ORDER BY created_at DESC, id DESC LIMIT 1').bind(callId).first();
    if (latest) {
      await env.DB.prepare('UPDATE cs_calls SET status=?, updated_at=? WHERE id=?').bind(latest.status, now, callId).run();
    }

    return jsonResponse({ success: true, code: 'CS_CALL_NOTE_UPDATED', message: '처리 기록이 수정되었습니다.', updatedAt: now });
  } catch (err) {
    console.error('CS 처리기록 수정 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '처리 기록을 수정하는 중 오류가 발생했습니다.' }, 500);
  }
}

function text(v, n) { return String(v ?? '').normalize('NFKC').trim().slice(0, n); }
function invalid(message) { return jsonResponse({ success: false, code: 'INVALID_REQUEST', message }, 400); }
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'PUT 방식으로 요청해 주세요.' }, 405, { Allow: 'PUT' }); }
export function onRequestGet() { return method(); }
export function onRequestPost() { return method(); }
export function onRequestPatch() { return method(); }
export function onRequestDelete() { return method(); }
