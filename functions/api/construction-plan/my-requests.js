import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare(
      `SELECT id,request_no,site_address,status,customer_notice,submitted_at,updated_at FROM construction_plan_requests WHERE member_id=? ORDER BY submitted_at DESC,id DESC LIMIT 100`
    ).bind(auth.member.member_id).all();
    const hs = await env.DB.prepare(
      `SELECT h.request_id,h.from_status,h.to_status,h.customer_notice,h.changed_at FROM construction_plan_status_history h INNER JOIN construction_plan_requests r ON r.id=h.request_id WHERE r.member_id=? ORDER BY h.changed_at ASC,h.id ASC`
    ).bind(auth.member.member_id).all();
    const by = (hs.results || []).reduce((m, x) => {
      const k = String(x.request_id);
      if (!m[k]) m[k] = [];
      m[k].push({ fromStatus: x.from_status || null, status: x.to_status, customerNotice: x.customer_notice || '', changedAt: x.changed_at });
      return m;
    }, {});
    return jsonResponse({
      success: true, code: 'MY_CONSTRUCTION_PLAN_REQUESTS_LOADED',
      requests: (rows.results || []).map(x => ({
        id: x.id, requestNo: x.request_no, siteAddress: x.site_address, status: x.status,
        customerNotice: x.customer_notice || '', submittedAt: x.submitted_at, updatedAt: x.updated_at,
        statusHistory: by[String(x.id)] || []
      }))
    });
  } catch (err) {
    console.error('마이페이지 공사계획신고 조회 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '공사계획신고 신청내역을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' }); }
export function onRequestPost() { return method(); }
export function onRequestPut() { return method(); }
export function onRequestPatch() { return method(); }
export function onRequestDelete() { return method(); }
