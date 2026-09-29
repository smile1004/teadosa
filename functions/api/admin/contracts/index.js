import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';
import { CONTRACT_SERVICES, modusignConfigured, templateIdFor, createDocumentFromTemplate, contractJson } from '../../../_lib/modusign.js';

// GET  /api/admin/contracts?serviceType=license&requestId=12  → contracts of one application
// POST /api/admin/contracts { serviceType, requestId }         → create a 모두싸인 signing request
export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const url = new URL(request.url);
    const target = parseTarget(url.searchParams.get('serviceType'), url.searchParams.get('requestId'));
    if (!target) return invalid('신청 정보를 확인해 주세요.');
    const rows = await env.DB.prepare('SELECT * FROM service_contracts WHERE service_type = ? AND request_id = ? ORDER BY id DESC')
      .bind(target.serviceType, target.requestId).all();
    return jsonResponse({ success: true, configured: modusignConfigured(env) && Boolean(templateIdFor(env, target.serviceType)), contracts: (rows.results || []).map(contractJson) });
  } catch (error) {
    console.error('전자계약 목록 조회 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '전자계약 정보를 불러오지 못했습니다.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    let body;
    try { body = await request.json(); } catch { return invalid('요청 내용을 읽을 수 없습니다.'); }
    const target = parseTarget(body?.serviceType, body?.requestId);
    if (!target) return invalid('신청 정보를 확인해 주세요.');

    const templateId = templateIdFor(env, target.serviceType);
    if (!modusignConfigured(env) || !templateId) {
      return jsonResponse({ success: false, code: 'MODUSIGN_NOT_CONFIGURED', message: '모두싸인 API 키 또는 템플릿 ID가 설정되지 않았습니다.' }, 503);
    }

    const service = CONTRACT_SERVICES[target.serviceType];
    const application = await env.DB.prepare(`SELECT id, request_no, member_id, applicant_name, email, status FROM ${service.table} WHERE id = ?`)
      .bind(target.requestId).first();
    if (!application) return jsonResponse({ success: false, code: 'NOT_FOUND', message: '신청내역을 찾을 수 없습니다.' }, 404);
    if (application.status === 'cancelled') return invalid('취소된 신청에는 전자계약을 요청할 수 없습니다.');

    const open = await env.DB.prepare(`SELECT id FROM service_contracts WHERE service_type = ? AND request_id = ? AND status IN ('requested','completed') LIMIT 1`)
      .bind(target.serviceType, target.requestId).first();
    if (open) return jsonResponse({ success: false, code: 'CONTRACT_EXISTS', message: '이미 진행 중이거나 완료된 전자계약이 있습니다.' }, 409);

    const title = `[태양광도사] ${service.label} 계약서_${application.applicant_name}_${application.request_no}`.slice(0, 100);
    let document;
    try {
      document = await createDocumentFromTemplate(env, {
        templateId,
        title,
        signerName: application.applicant_name,
        contact: application.email,
        metadatas: [
          { key: 'serviceType', value: target.serviceType },
          { key: 'requestNo', value: application.request_no }
        ]
      });
    } catch (error) {
      console.error('모두싸인 문서 생성 오류:', error.status, JSON.stringify(error.detail || {}));
      return jsonResponse({ success: false, code: 'MODUSIGN_REQUEST_FAILED', message: '모두싸인 계약서 생성에 실패했습니다. 템플릿 ID와 서명자 역할 이름을 확인해 주세요.', detail: error.detail || null }, 502);
    }

    const participant = (document.participants || []).find((p) => p.type === 'SIGNER') || (document.participants || [])[0];
    if (!document.id || !participant?.id) throw new Error('모두싸인 응답에 문서 또는 서명자 ID가 없습니다.');

    const nowIso = new Date().toISOString();
    const inserted = await env.DB.prepare(`INSERT INTO service_contracts
      (service_type, request_id, member_id, title, modusign_document_id, modusign_participant_id, status, last_event, requested_by, requested_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'requested', 'document_started', ?, ?, ?)`)
      .bind(target.serviceType, target.requestId, application.member_id, title, document.id, participant.id, auth.admin.member_id, nowIso, nowIso).run();
    const row = await env.DB.prepare('SELECT * FROM service_contracts WHERE id = ?').bind(inserted.meta.last_row_id).first();

    return jsonResponse({ success: true, code: 'CONTRACT_REQUESTED', message: '전자계약이 요청되었습니다. 회원이 마이페이지에서 서명할 수 있습니다.', contract: contractJson(row) }, 201);
  } catch (error) {
    console.error('전자계약 요청 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '전자계약을 요청하는 중 오류가 발생했습니다.' }, 500);
  }
}

function parseTarget(serviceType, requestId) {
  const id = Number.parseInt(requestId, 10);
  if (!Object.prototype.hasOwnProperty.call(CONTRACT_SERVICES, serviceType) || !Number.isInteger(id) || id < 1) return null;
  return { serviceType, requestId: id };
}
function invalid(message) {
  return jsonResponse({ success: false, code: 'INVALID_REQUEST', message }, 400);
}
