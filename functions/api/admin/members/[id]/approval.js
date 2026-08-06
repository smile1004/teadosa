import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

export async function onRequestPut(context) {
  const { request, env, params } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const memberId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(memberId) || memberId < 1) {
      return jsonResponse({ success: false, code: 'INVALID_MEMBER_ID', message: '회원 번호가 올바르지 않습니다.' }, 400);
    }

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, code: 'INVALID_JSON', message: '요청 내용을 확인할 수 없습니다.' }, 400); }

    const status = typeof body?.approvalStatus === 'string' ? body.approvalStatus.trim() : '';
    if (!['approved', 'pending'].includes(status)) {
      return jsonResponse({ success: false, code: 'INVALID_APPROVAL_STATUS', message: '승인 상태가 올바르지 않습니다.' }, 400);
    }

    const member = await env.DB.prepare(`
      SELECT id, member_type, username, name, company_name, approval_status
      FROM members WHERE id = ? LIMIT 1
    `).bind(memberId).first();

    if (!member) return jsonResponse({ success: false, code: 'MEMBER_NOT_FOUND', message: '회원을 찾을 수 없습니다.' }, 404);
    if (member.member_type !== 'business') return jsonResponse({ success: false, code: 'BUSINESS_MEMBER_ONLY', message: '기업회원만 승인 상태를 변경할 수 있습니다.' }, 400);

    const nowIso = new Date().toISOString();
    const update = await env.DB.prepare(`
      UPDATE members SET approval_status = ?, updated_at = ? WHERE id = ? AND member_type = 'business'
    `).bind(status, nowIso, memberId).run();
    if (!update.success) throw new Error('회원 승인 상태 저장 실패');

    if (status !== 'approved') {
      await env.DB.prepare('DELETE FROM sessions WHERE member_id = ?').bind(memberId).run();
    }

    return jsonResponse({
      success: true,
      code: status === 'approved' ? 'MEMBER_APPROVED' : 'MEMBER_APPROVAL_CANCELLED',
      message: status === 'approved' ? '기업회원 승인이 완료되었습니다.' : '기업회원 승인이 취소되었습니다.',
      member: {
        id: member.id,
        username: member.username,
        name: member.name,
        companyName: member.company_name,
        approvalStatus: status,
        updatedAt: nowIso,
      },
    });
  } catch (error) {
    console.error('기업회원 승인 처리 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '승인 상태를 변경하는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }
function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'PUT 방식으로 요청해 주세요.' }, 405, { Allow: 'PUT' }); }
