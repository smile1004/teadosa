// 모두싸인 API helper (https://developers.modusign.co.kr)
// Required Cloudflare secrets/vars — never commit their values:
//   MODUSIGN_EMAIL          모두싸인 계정 이메일
//   MODUSIGN_API_KEY        설정 → 워크스페이스 관리 → API KEY
//   MODUSIGN_TEMPLATE_ID    기본 계약서 템플릿 ID (서비스별: MODUSIGN_TEMPLATE_ID_LICENSE 등으로 덮어쓰기 가능)
//   MODUSIGN_SIGNER_ROLE    템플릿의 서명자 역할 이름 (기본값: 고객)
//   MODUSIGN_WEBHOOK_TOKEN  웹훅 등록 시 X-Webhook-Token 헤더로 넣을 임의의 긴 문자열

const API_BASE = 'https://api.modusign.co.kr';

// Each service maps to its request table so contract rows can be tied back to the application.
export const CONTRACT_SERVICES = {
  license: { table: 'generation_license_requests', history: 'generation_license_status_history', label: '발전사업허가', envKey: 'LICENSE' },
  development: { table: 'development_permit_requests', history: 'development_permit_status_history', label: '개발행위허가', envKey: 'DEVELOPMENT' },
  ppa: { table: 'ppa_requests', history: 'ppa_status_history', label: '한전PPA 접수', envKey: 'PPA' },
  'construction-plan': { table: 'construction_plan_requests', history: 'construction_plan_status_history', label: '공사계획신고', envKey: 'CONSTRUCTION_PLAN' }
};

export function modusignConfigured(env) {
  return Boolean(env.MODUSIGN_EMAIL && env.MODUSIGN_API_KEY);
}

export function templateIdFor(env, serviceType) {
  const service = CONTRACT_SERVICES[serviceType];
  return (service && env['MODUSIGN_TEMPLATE_ID_' + service.envKey]) || env.MODUSIGN_TEMPLATE_ID || '';
}

async function modusignRequest(env, path, options = {}) {
  const credentials = btoa(String.fromCharCode(...new TextEncoder().encode(env.MODUSIGN_EMAIL + ':' + env.MODUSIGN_API_KEY)));
  const response = await fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + credentials,
      ...(options.body ? { 'Content-Type': 'application/json; charset=utf-8' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    const error = new Error('MODUSIGN_' + response.status);
    error.status = response.status;
    error.detail = data;
    throw error;
  }
  return data;
}

// SECURE_LINK: 모두싸인이 메일·카카오로 링크를 보내지 않고, 우리 사이트(마이페이지)에서 임베디드 URL로 서명받습니다.
export function createDocumentFromTemplate(env, { templateId, title, signerName, contact, metadatas }) {
  return modusignRequest(env, '/documents/request-with-template', {
    method: 'POST',
    body: {
      templateId,
      document: {
        title,
        participantMappings: [{
          role: env.MODUSIGN_SIGNER_ROLE || '고객',
          name: signerName,
          signingMethod: { type: 'SECURE_LINK', value: contact }
        }],
        metadatas
      }
    }
  });
}

// Embedded signing URL — valid for 10 minutes, so it is fetched each time the member clicks.
export function getParticipantEmbeddedUrl(env, documentId, participantId) {
  return modusignRequest(env, '/documents/' + encodeURIComponent(documentId) + '/participants/' + encodeURIComponent(participantId) + '/embedded-view');
}

export function getDocument(env, documentId) {
  return modusignRequest(env, '/documents/' + encodeURIComponent(documentId));
}

// 모두싸인 document status → our contract status.
export function contractStatusFromDocument(documentStatus) {
  return ({
    COMPLETED: 'completed',
    ABORTED: 'canceled',
    PROCESSING_FAILED: 'failed'
  })[documentStatus] || 'requested';
}

// When a contract completes, move the application to 계약완료 unless it has already progressed past it.
export async function markApplicationContracted(env, serviceType, requestId, nowIso) {
  const service = CONTRACT_SERVICES[serviceType];
  if (!service) return;
  const current = await env.DB.prepare(`SELECT status FROM ${service.table} WHERE id = ?`).bind(requestId).first();
  if (!current || !['received', 'consulting'].includes(current.status)) return;
  const notice = '전자계약 서명이 완료되었습니다.';
  await env.DB.prepare(`UPDATE ${service.table} SET status = 'contracted', customer_notice = ?, updated_at = ? WHERE id = ?`)
    .bind(notice, nowIso, requestId).run();
  await env.DB.prepare(`INSERT INTO ${service.history} (request_id, from_status, to_status, customer_notice, changed_by, changed_at) VALUES (?, ?, 'contracted', ?, NULL, ?)`)
    .bind(requestId, current.status, notice, nowIso).run();
}

export async function applyDocumentStatus(env, contract, documentStatus, eventType) {
  const nowIso = new Date().toISOString();
  const status = eventType === 'document_rejected' ? 'rejected'
    : eventType === 'document_request_canceled' ? 'canceled'
    : contractStatusFromDocument(documentStatus);
  if (status === contract.status && !eventType) return contract.status;
  await env.DB.prepare(`UPDATE service_contracts SET status = ?, last_event = ?, completed_at = COALESCE(completed_at, ?), updated_at = ? WHERE id = ?`)
    .bind(status, eventType || documentStatus || null, status === 'completed' ? nowIso : null, nowIso, contract.id).run();
  if (status === 'completed' && contract.status !== 'completed') {
    await markApplicationContracted(env, contract.service_type, contract.request_id, nowIso);
  }
  return status;
}

export function contractJson(row) {
  return {
    id: row.id,
    serviceType: row.service_type,
    requestId: row.request_id,
    title: row.title,
    status: row.status,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at
  };
}
