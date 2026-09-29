import { requireMember, jsonResponse } from '../../../_lib/member-auth.js';
import { modusignConfigured, getDocument, applyDocumentStatus, contractJson } from '../../../_lib/modusign.js';

// POST /api/contracts/:id/refresh → re-read the document status from 모두싸인.
// Used after the signing window closes, and as a fallback when the webhook has not arrived yet.
// Allowed for the contract owner and for admins.
export async function onRequestPost({ request, env, params }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const id = Number.parseInt(params.id, 10);
    if (!Number.isInteger(id) || id < 1) return jsonResponse({ success: false, code: 'INVALID_REQUEST', message: '올바른 계약 ID가 아닙니다.' }, 400);
    const contract = await env.DB.prepare('SELECT * FROM service_contracts WHERE id = ?').bind(id).first();
    if (!contract || (contract.member_id !== auth.member.member_id && auth.member.role !== 'admin')) {
      return jsonResponse({ success: false, code: 'NOT_FOUND', message: '전자계약을 찾을 수 없습니다.' }, 404);
    }
    if (!modusignConfigured(env)) return jsonResponse({ success: false, code: 'MODUSIGN_NOT_CONFIGURED', message: '전자계약 서비스가 준비되지 않았습니다.' }, 503);

    const document = await getDocument(env, contract.modusign_document_id);
    await applyDocumentStatus(env, contract, document.status, null);
    const updated = await env.DB.prepare('SELECT * FROM service_contracts WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, contract: contractJson(updated) });
  } catch (error) {
    console.error('전자계약 상태 동기화 오류:', error.status || '', JSON.stringify(error.detail || {}), error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '계약 상태를 확인하지 못했습니다.' }, 500);
  }
}
