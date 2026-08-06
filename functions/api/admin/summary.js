import { requireAdmin, jsonResponse } from '../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const counts = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total_members,
        SUM(CASE WHEN member_type = 'personal' THEN 1 ELSE 0 END) AS personal_members,
        SUM(CASE WHEN member_type = 'business' THEN 1 ELSE 0 END) AS business_members,
        SUM(CASE WHEN member_type = 'business' AND approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_business_members,
        SUM(CASE WHEN member_type = 'business' AND approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_business_members
      FROM members
    `).first();

    const recent = await env.DB.prepare(`
      SELECT id, member_type, username, name, company_name, approval_status, role, created_at
      FROM members
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `).all();

    return jsonResponse({
      success: true,
      code: 'ADMIN_SUMMARY_LOADED',
      summary: {
        totalMembers: Number(counts?.total_members || 0),
        personalMembers: Number(counts?.personal_members || 0),
        businessMembers: Number(counts?.business_members || 0),
        pendingBusinessMembers: Number(counts?.pending_business_members || 0),
        approvedBusinessMembers: Number(counts?.approved_business_members || 0),
      },
      recentMembers: (recent.results || []).map((row) => ({
        id: row.id,
        memberType: row.member_type,
        username: row.username,
        name: row.name,
        companyName: row.company_name,
        approvalStatus: row.approval_status,
        role: row.role,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('관리자 대시보드 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '관리 현황을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }
function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' }); }
