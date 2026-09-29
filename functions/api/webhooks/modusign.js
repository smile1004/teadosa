import { jsonResponse } from '../../_lib/admin-auth.js';
import { modusignConfigured, getDocument, applyDocumentStatus } from '../../_lib/modusign.js';

// POST /api/webhooks/modusign — register in 모두싸인 (설정 → Webhook, or POST /webhooks) with
// header X-Webhook-Token = MODUSIGN_WEBHOOK_TOKEN. The payload only carries the event type and document id,
// so the real status is always re-read from the 모두싸인 API rather than trusted from the body.
const HANDLED_EVENTS = ['document_started', 'document_signed', 'document_all_signed', 'document_rejected', 'document_request_canceled', 'document_signing_canceled'];

export async function onRequestPost({ request, env }) {
  // The 모두싸인 settings screen may not offer custom headers, so the token is also accepted as ?token= in the URL.
  const token = request.headers.get('x-webhook-token') || new URL(request.url).searchParams.get('token') || '';
  if (!env.MODUSIGN_WEBHOOK_TOKEN || !(await safeEqual(token, env.MODUSIGN_WEBHOOK_TOKEN))) {
    return jsonResponse({ success: false, code: 'UNAUTHORIZED' }, 401);
  }
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ success: false, code: 'INVALID_JSON' }, 400); }

  const eventType = String(body?.event?.type || '');
  const documentId = String(body?.document?.id || '');
  if (!HANDLED_EVENTS.includes(eventType) || !documentId) return jsonResponse({ success: true, ignored: true });

  try {
    const contract = await env.DB.prepare('SELECT * FROM service_contracts WHERE modusign_document_id = ?').bind(documentId).first();
    if (!contract) return jsonResponse({ success: true, ignored: true });
    const document = modusignConfigured(env) ? await getDocument(env, documentId) : null;
    await applyDocumentStatus(env, contract, document?.status || null, eventType);
    return jsonResponse({ success: true });
  } catch (error) {
    // A non-2xx lets 모두싸인 retry; the member page also re-syncs on its own.
    console.error('모두싸인 웹훅 처리 오류:', eventType, documentId, error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR' }, 500);
  }
}

async function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))]);
  const ax = new Uint8Array(x), by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ by[i];
  return diff === 0;
}
