import { requireMember, jsonResponse } from '../../../_lib/member-auth.js';
import { modusignConfigured, getParticipantEmbeddedUrl, getDocument, applyDocumentStatus } from '../../../_lib/modusign.js';

// POST /api/contracts/:id/sign → a fresh embedded signing URL (valid 10 minutes) for the owner of the contract
export async function onRequestPost({ request, env, params }) {
  const redirectUrl = (contract) => new URL('/contract/signed/?type=' + encodeURIComponent(contract.service_type) + '&id=' + contract.id, request.url).href;
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    const contract = await loadOwnContract(env, params.id, auth.member.member_id);
    if (!contract) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '전자계약을 찾을 수 없습니다.' }, 404);
    if (contract.status !== 'requested') return jsonResponse({ success: false, code: 'CONTRACT_NOT_SIGNABLE', message: '서명할 수 있는 상태의 계약이 아닙니다.' }, 409);
    if (!modusignConfigured(env)) return jsonResponse({ success: false, code: 'MODUSIGN_NOT_CONFIGURED', message: '전자계약 서비스가 준비되지 않았습니다.' }, 503);

    try {
      const view = await getParticipantEmbeddedUrl(env, contract.modusign_document_id, contract.modusign_participant_id, redirectUrl(contract));
      if (!view?.embeddedUrl) throw new Error('embeddedUrl 없음');
      return jsonResponse({ success: true, embeddedUrl: view.embeddedUrl });
    } catch (error) {
      // The document may already be finished or canceled on 모두싸인; sync so the page shows the real state.
      try {
        const document = await getDocument(env, contract.modusign_document_id);
        const status = await applyDocumentStatus(env, contract, document.status, null);
        if (status !== 'requested') return jsonResponse({ success: false, code: 'CONTRACT_STATUS_CHANGED', message: '계약 상태가 변경되었습니다. 페이지를 새로고침해 주세요.', status }, 409);
      } catch {}
      console.error('모두싸인 서명 URL 오류:', error.status, JSON.stringify(error.detail || {}));
      return jsonResponse({ success: false, code: 'MODUSIGN_REQUEST_FAILED', message: '서명 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 502);
    }
  } catch (error) {
    console.error('전자계약 서명 요청 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '서명 화면을 여는 중 오류가 발생했습니다.' }, 500);
  }
}

export async function loadOwnContract(env, idParam, memberId) {
  const id = Number.parseInt(idParam, 10);
  if (!Number.isInteger(id) || id < 1) return null;
  return env.DB.prepare('SELECT * FROM service_contracts WHERE id = ? AND member_id = ?').bind(id, memberId).first();
}
