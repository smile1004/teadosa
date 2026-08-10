import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const idText = (url.searchParams.get('id') || '').trim();
    const requestId = idText ? Number.parseInt(idText, 10) : null;

    if (idText && (!Number.isInteger(requestId) || requestId < 1)) {
      return jsonResponse({ success: false, code: 'INVALID_REQUEST_ID', message: '올바른 신청번호가 아닙니다.' }, 400);
    }

    const row = requestId
      ? await loadById(env, auth.member.member_id, requestId)
      : await loadLatest(env, auth.member.member_id);

    if (!row) {
      return jsonResponse({ success: false, code: 'PUBLISHED_RESULT_NOT_FOUND', message: '확인할 수 있는 공개 검토결과가 없습니다.' }, 404);
    }

    return jsonResponse({
      success: true,
      code: 'PRECHECK_RESULT_LOADED',
      request: {
        id: row.request_id,
        requestNo: row.request_no,
        applicantName: row.applicant_name,
        siteAddress: row.site_address,
        siteType: row.site_type,
        purpose: row.purpose,
        formVersion: row.form_version,
        formData: parseJson(row.form_data, {}),
        submittedAt: row.submitted_at
      },
      review: {
        installationPossible: row.installation_possible,
        expectedCapacity: row.expected_capacity,
        overallOpinion: row.overall_opinion || '',
        customerNotice: row.customer_notice || '',
        resultVersion: row.result_version || 'PRECHECK_RESULT_V2',
        resultData: parseJson(row.result_data, { items: [] }),
        reviewedAt: row.reviewed_at,
        publishedAt: row.published_at
      }
    });
  } catch (error) {
    console.error('회원 사전검토 결과 조회 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '검토결과를 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

async function loadById(env, memberId, requestId) {
  return env.DB.prepare(`
    SELECT
      r.id AS request_id,
      r.request_no,
      r.applicant_name,
      r.site_address,
      r.site_type,
      r.purpose,
      r.form_version,
      r.form_data,
      r.submitted_at,
      pr.installation_possible,
      pr.expected_capacity,
      pr.overall_opinion,
      pr.customer_notice,
      pr.result_version,
      pr.result_data,
      pr.reviewed_at,
      pr.published_at
    FROM precheck_requests r
    INNER JOIN precheck_reviews pr ON pr.request_id = r.id
    WHERE r.id = ? AND r.member_id = ? AND pr.published_at IS NOT NULL
    LIMIT 1
  `).bind(requestId, memberId).first();
}

async function loadLatest(env, memberId) {
  return env.DB.prepare(`
    SELECT
      r.id AS request_id,
      r.request_no,
      r.applicant_name,
      r.site_address,
      r.site_type,
      r.purpose,
      r.form_version,
      r.form_data,
      r.submitted_at,
      pr.installation_possible,
      pr.expected_capacity,
      pr.overall_opinion,
      pr.customer_notice,
      pr.result_version,
      pr.result_data,
      pr.reviewed_at,
      pr.published_at
    FROM precheck_requests r
    INNER JOIN precheck_reviews pr ON pr.request_id = r.id
    WHERE r.member_id = ? AND pr.published_at IS NOT NULL
    ORDER BY pr.published_at DESC, r.id DESC
    LIMIT 1
  `).bind(memberId).first();
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
