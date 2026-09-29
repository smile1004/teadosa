import { requireMember, jsonResponse } from '../../../_lib/member-auth.js';
import { modusignConfigured, getDocument } from '../../../_lib/modusign.js';

// GET /api/contracts/:id/download → redirect to the signed PDF (모두싸인 download URL, valid 10 minutes).
// Allowed for the contract owner and for admins, only after the contract is completed.
export async function onRequestGet({ request, env, params }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    const contract = Number.isInteger(id) && id > 0
      ? await env.DB.prepare('SELECT * FROM service_contracts WHERE id = ?').bind(id).first()
      : null;
    if (!contract || (contract.member_id !== auth.member.member_id && auth.member.role !== 'admin')) {
      return jsonResponse({ success: false, code: 'NOT_FOUND', message: '전자계약을 찾을 수 없습니다.' }, 404);
    }
    if (contract.status !== 'completed') return jsonResponse({ success: false, code: 'CONTRACT_NOT_COMPLETED', message: '서명이 완료된 계약서만 내려받을 수 있습니다.' }, 409);
    if (!modusignConfigured(env)) return jsonResponse({ success: false, code: 'MODUSIGN_NOT_CONFIGURED', message: '전자계약 서비스가 준비되지 않았습니다.' }, 503);

    const document = await getDocument(env, contract.modusign_document_id);
    const url = document?.file?.downloadUrl;
    if (!url) return jsonResponse({ success: false, code: 'FILE_NOT_READY', message: '계약서 파일이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, 409);
    return Response.redirect(url, 302);
  } catch (error) {
    console.error('전자계약 파일 다운로드 오류:', error.status || '', JSON.stringify(error.detail || {}), error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '계약서 파일을 불러오지 못했습니다.' }, 500);
  }
}
