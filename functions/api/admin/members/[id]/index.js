import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const memberId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(memberId) || memberId < 1) {
      return jsonResponse({ success: false, code: 'INVALID_MEMBER_ID', message: '회원 번호가 올바르지 않습니다.' }, 400);
    }

    const member = await env.DB.prepare(`
      SELECT
        id, member_type, username, name, email, phone,
        company_name, business_number, postal_code, address, address_detail,
        ceo_name, business_type, business_item, department, office_phone,
        approval_status, role, created_at, updated_at
      FROM members
      WHERE id = ?
      LIMIT 1
    `).bind(memberId).first();

    if (!member) {
      return jsonResponse({ success: false, code: 'MEMBER_NOT_FOUND', message: '회원을 찾을 수 없습니다.' }, 404);
    }

    const nowIso = new Date().toISOString();
    const sessionCount = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM sessions
      WHERE member_id = ? AND expires_at > ?
    `).bind(memberId, nowIso).first();

    return jsonResponse({
      success: true,
      code: 'ADMIN_MEMBER_DETAIL_LOADED',
      member: mapMember(member, Number(sessionCount?.total || 0)),
    });
  } catch (error) {
    console.error('관리자 회원상세 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '회원 상세정보를 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function mapMember(row, activeSessionCount) {
  return {
    id: row.id,
    memberType: row.member_type,
    username: row.username,
    name: row.name,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    businessNumber: row.business_number,
    postalCode: row.postal_code,
    address: row.address,
    addressDetail: row.address_detail,
    ceoName: row.ceo_name,
    businessType: row.business_type,
    businessItem: row.business_item,
    department: row.department,
    officePhone: row.office_phone,
    approvalStatus: row.approval_status,
    role: row.role,
    activeSessionCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function methodNotAllowed() {
  return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' });
}
