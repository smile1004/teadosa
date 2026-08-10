import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const requestId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(requestId) || requestId < 1) {
      return jsonResponse({ success: false, code: 'INVALID_REQUEST_ID', message: '올바른 신청번호가 아닙니다.' }, 400);
    }

    const row = await env.DB.prepare(`
      SELECT
        r.*,
        m.member_type,
        m.username,
        pr.id AS review_id,
        pr.installation_possible,
        pr.expected_capacity,
        pr.overall_opinion,
        pr.customer_notice,
        pr.internal_memo,
        pr.result_version,
        pr.result_data,
        pr.reviewed_at,
        pr.published_at,
        pr.updated_at AS review_updated_at,
        reviewer.name AS reviewer_name
      FROM precheck_requests r
      LEFT JOIN members m ON m.id = r.member_id
      LEFT JOIN precheck_reviews pr ON pr.request_id = r.id
      LEFT JOIN members reviewer ON reviewer.id = pr.reviewed_by
      WHERE r.id = ?
      LIMIT 1
    `).bind(requestId).first();

    if (!row) {
      return jsonResponse({ success: false, code: 'PRECHECK_NOT_FOUND', message: '사전검토 신청을 찾을 수 없습니다.' }, 404);
    }

    return jsonResponse({
      success: true,
      code: 'ADMIN_PRECHECK_DETAIL_LOADED',
      request: {
        id: row.id,
        requestNo: row.request_no,
        memberId: row.member_id,
        memberType: row.member_type,
        username: row.username,
        applicantName: row.applicant_name,
        phone: row.phone,
        email: row.email,
        companyName: row.company_name,
        siteAddress: row.site_address,
        siteType: row.site_type,
        purpose: row.purpose,
        requestNote: row.request_note,
        formVersion: row.form_version,
        formData: parseJson(row.form_data, {}),
        status: row.status,
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at
      },
      review: row.review_id ? {
        id: row.review_id,
        installationPossible: row.installation_possible || 'undetermined',
        expectedCapacity: row.expected_capacity,
        overallOpinion: row.overall_opinion || '',
        customerNotice: row.customer_notice || '',
        internalMemo: row.internal_memo || '',
        resultVersion: row.result_version || 'PRECHECK_RESULT_V2',
        resultData: parseJson(row.result_data, { items: [] }),
        reviewedAt: row.reviewed_at,
        publishedAt: row.published_at,
        updatedAt: row.review_updated_at,
        reviewerName: row.reviewer_name || ''
      } : null
    });
  } catch (error) {
    console.error('관리자 사전검토 상세 조회 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '사전검토 상세정보를 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function methodNotAllowed() {
  return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' });
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }
