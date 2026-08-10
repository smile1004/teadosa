import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

const ALLOWED_STATUS = ['received', 'reviewing', 'supplement_required', 'completed'];

export async function onRequestPut(context) {
  const { request, env, params } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const requestId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(requestId) || requestId < 1) {
      return jsonResponse({ success: false, code: 'INVALID_REQUEST_ID', message: '올바른 신청번호가 아닙니다.' }, 400);
    }

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, code: 'INVALID_JSON', message: '요청 내용을 확인해 주세요.' }, 400); }

    const status = typeof body?.status === 'string' ? body.status.trim() : '';
    const supplementNote = typeof body?.supplementNote === 'string'
      ? body.supplementNote.trim().slice(0, 3000)
      : '';

    if (!ALLOWED_STATUS.includes(status)) {
      return jsonResponse({ success: false, code: 'INVALID_STATUS', message: '올바른 처리상태를 선택해 주세요.' }, 400);
    }

    const existing = await env.DB.prepare('SELECT id, request_no, status FROM precheck_requests WHERE id = ? LIMIT 1')
      .bind(requestId).first();
    if (!existing) {
      return jsonResponse({ success: false, code: 'PRECHECK_NOT_FOUND', message: '사전검토 신청을 찾을 수 없습니다.' }, 404);
    }

    if (status === 'supplement_required' && !supplementNote) {
      return jsonResponse({
        success: false,
        code: 'SUPPLEMENT_NOTE_REQUIRED',
        message: '보완요청 내용을 입력해 주세요.'
      }, 400);
    }

    const nowIso = new Date().toISOString();

    let updateResult;
    if (status === 'supplement_required') {
      updateResult = await env.DB.prepare(`
        UPDATE precheck_requests
        SET status = ?,
            supplement_note = ?,
            supplement_requested_at = ?,
            supplement_requested_by = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(
        status,
        supplementNote,
        nowIso,
        auth.admin.member_id,
        nowIso,
        requestId
      ).run();
    } else {
      updateResult = await env.DB.prepare(`
        UPDATE precheck_requests
        SET status = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(status, nowIso, requestId).run();
    }

    if (!updateResult?.success || Number(updateResult.meta?.changes || 0) !== 1) {
      throw new Error('사전검토 처리상태 저장에 실패했습니다.');
    }

    return jsonResponse({
      success: true,
      code: 'PRECHECK_STATUS_UPDATED',
      message: '처리상태가 변경되었습니다.',
      request: {
        id: requestId,
        requestNo: existing.request_no,
        status,
        supplementNote: status === 'supplement_required' ? supplementNote : null,
        supplementRequestedAt: status === 'supplement_required' ? nowIso : null,
        updatedAt: nowIso
      },
    });
  } catch (error) {
    console.error('관리자 사전검토 상태변경 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '처리상태를 변경하는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'PUT 방식으로 요청해 주세요.' }, 405, { Allow: 'PUT' }); }
