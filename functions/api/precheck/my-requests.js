import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;

    const rows = await env.DB.prepare(`
      SELECT
        r.id,
        r.request_no,
        r.site_address,
        r.site_type,
        r.purpose,
        r.status,
        r.submitted_at,
        r.updated_at,
        pr.id AS review_id,
        pr.installation_possible,
        pr.reviewed_at,
        pr.published_at
      FROM precheck_requests r
      LEFT JOIN precheck_reviews pr ON pr.request_id = r.id
      WHERE r.member_id = ?
      ORDER BY r.submitted_at DESC, r.id DESC
      LIMIT 100
    `).bind(auth.member.member_id).all();

    return jsonResponse({
      success: true,
      code: 'MY_PRECHECK_REQUESTS_LOADED',
      requests: (rows.results || []).map((row) => ({
        id: row.id,
        requestNo: row.request_no,
        siteAddress: row.site_address,
        siteType: row.site_type,
        purpose: row.purpose,
        status: row.status,
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at,
        reviewId: row.review_id,
        installationPossible: row.installation_possible,
        reviewedAt: row.reviewed_at,
        publishedAt: row.published_at,
        resultAvailable: Boolean(row.review_id && row.published_at)
      }))
    });
  } catch (error) {
    console.error('마이페이지 사전검토 신청내역 조회 오류:', error);
    return jsonResponse({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: '사전검토 신청내역을 불러오는 중 오류가 발생했습니다.'
    }, 500);
  }
}

function methodNotAllowed() {
  return jsonResponse({
    success: false,
    code: 'METHOD_NOT_ALLOWED',
    message: 'GET 방식으로 요청해 주세요.'
  }, 405, { Allow: 'GET' });
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }
