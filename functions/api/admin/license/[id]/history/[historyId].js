import { requireAdmin, jsonResponse } from '../../../../../_lib/admin-auth.js';

const STATUSES = ['received','consulting','contracted','documents','submitted','supplement_required','completed','cancelled'];

export async function onRequestPut(context) {
  return changeHistory(context, false);
}

export async function onRequestDelete(context) {
  return changeHistory(context, true);
}

async function changeHistory({ request, env, params }, remove) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const requestId = Number.parseInt(params.id, 10);
    const historyId = Number.parseInt(params.historyId, 10);
    if (!requestId || !historyId) return invalid('올바른 처리이력 ID가 아닙니다.');

    const existing = await env.DB.prepare('SELECT id FROM generation_license_status_history WHERE id = ? AND request_id = ?').bind(historyId, requestId).first();
    if (!existing) return jsonResponse({ success:false, code:'NOT_FOUND', message:'처리이력을 찾을 수 없습니다.' }, 404);

    if (remove) {
      await env.DB.prepare('DELETE FROM generation_license_status_history WHERE id = ? AND request_id = ?').bind(historyId, requestId).run();
    } else {
      let body;
      try { body = await request.json(); } catch { return invalid('수정할 내용을 확인해 주세요.'); }
      const status = String(body.status || '');
      const customerNotice = cleanText(body.customerNotice, 2000);
      const changedAt = normalizeDate(body.changedAt);
      if (!STATUSES.includes(status)) return invalid('처리상태를 확인해 주세요.');
      if (!changedAt) return invalid('처리일시를 확인해 주세요.');
      await env.DB.prepare(`UPDATE generation_license_status_history SET to_status = ?, customer_notice = ?, changed_at = ?, changed_by = ? WHERE id = ? AND request_id = ?`)
        .bind(status, customerNotice || null, changedAt, auth.admin.member_id, historyId, requestId).run();
    }

    await syncCurrentStatus(env, requestId, auth.admin.member_id);
    return jsonResponse({ success:true, code:remove ? 'LICENSE_HISTORY_DELETED' : 'LICENSE_HISTORY_UPDATED', message:remove ? '처리이력이 삭제되었습니다.' : '처리이력이 수정되었습니다.' });
  } catch (error) {
    console.error('발전사업허가 처리이력 변경 오류:', error);
    return jsonResponse({ success:false, code:'INTERNAL_SERVER_ERROR', message:'처리이력을 변경하는 중 오류가 발생했습니다.' }, 500);
  }
}

async function syncCurrentStatus(env, requestId, changedBy) {
  const latest = await env.DB.prepare(`SELECT to_status, customer_notice, changed_at FROM generation_license_status_history WHERE request_id = ? ORDER BY changed_at DESC, id DESC LIMIT 1`).bind(requestId).first();
  const request = await env.DB.prepare('SELECT submitted_at FROM generation_license_requests WHERE id = ?').bind(requestId).first();
  const status = latest ? latest.to_status : 'received';
  const notice = latest ? latest.customer_notice : null;
  const updatedAt = latest ? latest.changed_at : request.submitted_at;
  await env.DB.prepare(`UPDATE generation_license_requests SET status = ?, customer_notice = ?, status_updated_by = ?, updated_at = ? WHERE id = ?`)
    .bind(status, notice, changedBy, updatedAt, requestId).run();
}

function cleanText(value, maxLength) { return String(value ?? '').normalize('NFKC').trim().slice(0, maxLength); }
function normalizeDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function invalid(message) { return jsonResponse({ success:false, code:'INVALID_REQUEST', message }, 400); }
function method() { return jsonResponse({ success:false, code:'METHOD_NOT_ALLOWED', message:'PUT 또는 DELETE 방식으로 요청해 주세요.' }, 405, { Allow:'PUT, DELETE' }); }
export function onRequestGet() { return method(); }
export function onRequestPost() { return method(); }
export function onRequestPatch() { return method(); }
