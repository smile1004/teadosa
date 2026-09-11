import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

const CATEGORIES = ['homepage', 'taedo', 'eightsolar'];

export async function onRequestGet({ request, env, params }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    if (!id) return invalid();
    const row = await env.DB.prepare('SELECT * FROM cs_calls WHERE id=? LIMIT 1').bind(id).first();
    if (!row) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '상담 내역을 찾을 수 없습니다.' }, 404);
    const notes = await env.DB.prepare(`
      SELECT n.id, n.status, n.author, n.note, n.created_at, m.name admin_name
      FROM cs_call_notes n LEFT JOIN members m ON m.id = n.created_by
      WHERE n.call_id=? ORDER BY n.created_at ASC, n.id ASC
    `).bind(id).all();
    return jsonResponse({
      success: true,
      code: 'ADMIN_CS_CALL_LOADED',
      call: {
        id: row.id,
        category: row.category,
        callDate: row.call_date,
        phone: row.phone,
        name: row.customer_name,
        address: row.address,
        content: row.content,
        channel: row.channel,
        receiver: row.receiver,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      notes: (notes.results || []).map((n) => ({
        id: n.id,
        status: n.status,
        author: n.author,
        note: n.note,
        createdAt: n.created_at,
        adminName: n.admin_name || ''
      }))
    });
  } catch (err) {
    console.error('CS 상담 상세 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '상담 내역을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export async function onRequestPut({ request, env, params }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    if (!id) return invalid();
    let body;
    try { body = await request.json(); } catch { return invalid('수정할 내용을 확인해 주세요.'); }
    const existing = await env.DB.prepare('SELECT id FROM cs_calls WHERE id=?').bind(id).first();
    if (!existing) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '상담 내역을 찾을 수 없습니다.' }, 404);

    const fields = [];
    const bindings = [];
    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) return invalid('구분을 확인해 주세요.');
      fields.push('category=?'); bindings.push(body.category);
    }
    if (body.callDate !== undefined) { fields.push('call_date=?'); bindings.push(normalizeDateOnly(body.callDate) || todayStr()); }
    if (body.phone !== undefined) { fields.push('phone=?'); bindings.push(text(body.phone, 30)); }
    if (body.name !== undefined) { fields.push('customer_name=?'); bindings.push(text(body.name, 60) || null); }
    if (body.address !== undefined) { fields.push('address=?'); bindings.push(text(body.address, 300) || null); }
    if (body.content !== undefined) { fields.push('content=?'); bindings.push(text(body.content, 1000) || null); }
    if (body.channel !== undefined) { fields.push('channel=?'); bindings.push(text(body.channel, 60) || null); }
    if (body.receiver !== undefined) { fields.push('receiver=?'); bindings.push(text(body.receiver, 40)); }
    if (!fields.length) return invalid('변경할 항목이 없습니다.');

    const now = new Date().toISOString();
    fields.push('updated_at=?'); bindings.push(now);
    bindings.push(id);
    await env.DB.prepare(`UPDATE cs_calls SET ${fields.join(',')} WHERE id=?`).bind(...bindings).run();
    return jsonResponse({ success: true, code: 'CS_CALL_UPDATED', message: '수정 내용이 저장되었습니다.', updatedAt: now });
  } catch (err) {
    console.error('CS 상담 수정 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '수정하는 중 오류가 발생했습니다.' }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    if (!id) return invalid();
    const result = await env.DB.prepare('DELETE FROM cs_calls WHERE id=?').bind(id).run();
    if (!result.success || Number(result.meta?.changes || 0) !== 1) {
      return jsonResponse({ success: false, code: 'NOT_FOUND', message: '상담 내역을 찾을 수 없습니다.' }, 404);
    }
    return jsonResponse({ success: true, code: 'CS_CALL_DELETED', message: '상담 내역이 삭제되었습니다.' });
  } catch (err) {
    console.error('CS 상담 삭제 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '삭제하는 중 오류가 발생했습니다.' }, 500);
  }
}

function text(v, n) { return String(v ?? '').normalize('NFKC').trim().slice(0, n); }
function invalid(message) { return jsonResponse({ success: false, code: 'INVALID_REQUEST', message: message || '올바른 요청이 아닙니다.' }, 400); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function normalizeDateOnly(v) { const s = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET, PUT, DELETE 방식으로 요청해 주세요.' }, 405, { Allow: 'GET, PUT, DELETE' }); }
export function onRequestPost() { return method(); }
export function onRequestPatch() { return method(); }
