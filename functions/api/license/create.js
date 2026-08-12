import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return error('요청 형식이 올바르지 않습니다.', 415);
    if (Number(request.headers.get('content-length') || 0) > 50_000) return error('신청 내용이 너무 큽니다.', 413);

    let body;
    try { body = await request.json(); } catch { return error('신청 정보를 읽을 수 없습니다.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('신청 정보가 올바르지 않습니다.');

    const precheckId = integer(body.precheckRequestId);
    const applicantName = text(body.applicantName, 100);
    const phone = String(body.applicantPhone || '').replace(/\D/g, '');
    const email = text(body.applicantEmail, 254);
    const siteAddress = text(body.siteAddress, 250);
    if (!precheckId) return error('완료된 사전검토 결과를 선택해 주세요.');
    if (!applicantName) return error('신청인 이름을 입력해 주세요.');
    if (!/^\d{9,11}$/.test(phone)) return error('연락처를 정확하게 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('이메일 형식을 확인해 주세요.');
    if (!siteAddress) return error('설치 희망 주소를 입력해 주세요.');
    if (body.privacyConsent !== true || body.applicationConfirmed !== true) return error('필수 확인 및 동의 항목을 확인해 주세요.');

    const precheck = await env.DB.prepare(`
      SELECT r.id FROM precheck_requests r
      INNER JOIN precheck_reviews pr ON pr.request_id = r.id
      WHERE r.id = ? AND r.member_id = ? AND r.status = 'completed' AND pr.published_at IS NOT NULL
      LIMIT 1
    `).bind(precheckId, auth.member.member_id).first();
    if (!precheck) return error('신청 가능한 사전검토 완료내역을 확인할 수 없습니다.');

    const existing = await env.DB.prepare(`
      SELECT id, request_no FROM generation_license_requests
      WHERE member_id = ? AND precheck_request_id = ? AND status != 'cancelled' LIMIT 1
    `).bind(auth.member.member_id, precheckId).first();
    if (existing) return jsonResponse({ success: false, code: 'DUPLICATE_LICENSE_REQUEST', message: '선택한 사전검토 결과로 이미 접수된 발전사업허가 신청이 있습니다.', request: { id: existing.id, requestNo: existing.request_no } }, 409);

    const now = new Date();
    const nowIso = now.toISOString();
    const temporaryNo = `TMP-${crypto.randomUUID()}`;
    const safeBody = sanitize(body);
    const result = await env.DB.prepare(`
      INSERT INTO generation_license_requests (
        request_no, member_id, precheck_request_id, applicant_name, phone, email,
        site_address, form_version, form_data, privacy_consented_at, status,
        submitted_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).bind(temporaryNo, auth.member.member_id, precheckId, applicantName, phone, email,
      siteAddress, text(body.formVersion, 40) || 'GENERATION_LICENSE_APPLY_V2', JSON.stringify(safeBody), nowIso, nowIso, nowIso).run();
    const id = Number(result?.meta?.last_row_id || 0);
    if (!result.success || !id) throw new Error('저장 결과를 확인할 수 없습니다.');
    const requestNo = createRequestNo(now, id);
    const updated = await env.DB.prepare('UPDATE generation_license_requests SET request_no = ?, updated_at = ? WHERE id = ? AND member_id = ?')
      .bind(requestNo, nowIso, id, auth.member.member_id).run();
    if (!updated.success || Number(updated.meta?.changes || 0) !== 1) throw new Error('신청번호 생성에 실패했습니다.');
    await env.DB.prepare(`INSERT INTO generation_license_status_history (request_id, from_status, to_status, customer_notice, changed_by, changed_at) VALUES (?, NULL, 'received', ?, ?, ?)`)
      .bind(id, '발전사업허가 신청이 정상적으로 접수되었습니다.', auth.member.member_id, nowIso).run();

    return jsonResponse({ success: true, code: 'LICENSE_REQUEST_CREATED', message: '발전사업허가 신청이 접수되었습니다.', request: { id, requestNo, status: 'received', submittedAt: nowIso } }, 201);
  } catch (err) {
    console.error('발전사업허가 신청 저장 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '신청을 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}

function sanitize(body) {
  const copy = { ...body };
  delete copy.residentNumber;
  copy.privacyConsent = true;
  copy.applicationConfirmed = true;
  return copy;
}
function text(v, max = 2000) { return String(v ?? '').normalize('NFKC').trim().slice(0, max); }
function integer(v) { const n = Number.parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : 0; }
function createRequestNo(date, id) { const k = new Date(date.getTime() + 32400000); return `GL-${k.getUTCFullYear()}${String(k.getUTCMonth()+1).padStart(2,'0')}${String(k.getUTCDate()).padStart(2,'0')}-${String(id).padStart(6,'0')}`; }
function error(message, status = 400) { return jsonResponse({ success: false, code: 'INVALID_LICENSE_REQUEST', message }, status); }
function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'POST 방식으로 요청해 주세요.' }, 405, { Allow: 'POST' }); }
export function onRequestGet(){ return methodNotAllowed(); }
export function onRequestPut(){ return methodNotAllowed(); }
export function onRequestPatch(){ return methodNotAllowed(); }
export function onRequestDelete(){ return methodNotAllowed(); }
