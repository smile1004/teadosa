import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare(`
      SELECT id, request_no, precheck_request_id, site_address, status, customer_notice, submitted_at, updated_at
      FROM generation_license_requests WHERE member_id = ?
      ORDER BY submitted_at DESC, id DESC LIMIT 100
    `).bind(auth.member.member_id).all();
    return jsonResponse({ success: true, code: 'MY_LICENSE_REQUESTS_LOADED', requests: (rows.results || []).map(row => ({
      id: row.id, requestNo: row.request_no, precheckRequestId: row.precheck_request_id,
      siteAddress: row.site_address, status: row.status, customerNotice: row.customer_notice || '',
      submittedAt: row.submitted_at, updatedAt: row.updated_at
    })) });
  } catch (err) {
    console.error('마이페이지 발전사업허가 조회 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '발전사업허가 신청내역을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}
function methodNotAllowed(){ return jsonResponse({ success:false, code:'METHOD_NOT_ALLOWED', message:'GET 방식으로 요청해 주세요.' },405,{Allow:'GET'}); }
export function onRequestPost(){return methodNotAllowed();} export function onRequestPut(){return methodNotAllowed();} export function onRequestPatch(){return methodNotAllowed();} export function onRequestDelete(){return methodNotAllowed();}
