import { requireMember, jsonResponse } from '../../_lib/member-auth.js';
import { contractJson } from '../../_lib/modusign.js';

// GET /api/contracts/my → the signed-in member's contracts (마이페이지)
export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const rows = await env.DB.prepare('SELECT * FROM service_contracts WHERE member_id = ? ORDER BY id DESC LIMIT 200')
      .bind(auth.member.member_id).all();
    return jsonResponse({ success: true, contracts: (rows.results || []).map(contractJson) });
  } catch (error) {
    console.error('회원 전자계약 조회 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '전자계약 정보를 불러오지 못했습니다.' }, 500);
  }
}
