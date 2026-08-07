import { requireMember, jsonResponse } from '../../_lib/member-auth.js';

const SITE_TYPE_MAP = Object.freeze({
  '토지': 'land',
  '건물': 'building',
  land: 'land',
  building: 'building'
});

const PURPOSE_MAP = Object.freeze({
  '자가소비': 'self_consumption',
  '발전사업': 'power_business',
  self_consumption: 'self_consumption',
  power_business: 'power_business'
});

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return jsonResponse({
        success: false,
        code: 'INVALID_CONTENT_TYPE',
        message: '요청 형식이 올바르지 않습니다.'
      }, 415);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 20_000) {
      return jsonResponse({
        success: false,
        code: 'PAYLOAD_TOO_LARGE',
        message: '신청 내용이 너무 큽니다.'
      }, 413);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({
        success: false,
        code: 'INVALID_JSON',
        message: '신청 정보를 읽을 수 없습니다.'
      }, 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return invalidRequest('신청 정보가 올바르지 않습니다.');
    }

    const applicantName = normalizeText(body.name ?? body.applicantName, 50);
    const phone = digits(body.phone);
    const siteAddress = normalizeText(body.address ?? body.siteAddress, 250);
    const siteType = SITE_TYPE_MAP[normalizeText(body.siteType, 30)] || '';
    const purpose = PURPOSE_MAP[normalizeText(body.purpose, 30)] || '';
    const requestNote = normalizeText(body.memo ?? body.requestNote, 2000);

    if (!applicantName) return invalidRequest('이름을 입력해 주세요.');
    if (!/^\d{9,11}$/.test(phone)) return invalidRequest('연락처를 정확하게 입력해 주세요.');
    if (!siteAddress) return invalidRequest('설치주소를 입력해 주세요.');
    if (!siteType) return invalidRequest('사업지 유형을 선택해 주세요.');
    if (!purpose) return invalidRequest('용도를 선택해 주세요.');

    const now = new Date();
    const nowIso = now.toISOString();
    const temporaryRequestNo = `TMP-${crypto.randomUUID()}`;
    const member = auth.member;

    const insertResult = await env.DB.prepare(`
      INSERT INTO precheck_requests (
        request_no,
        member_id,
        applicant_name,
        phone,
        email,
        company_name,
        site_address,
        site_type,
        purpose,
        request_note,
        status,
        submitted_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).bind(
      temporaryRequestNo,
      member.member_id,
      applicantName,
      phone,
      normalizeText(member.email, 254) || null,
      normalizeText(member.company_name, 100) || null,
      siteAddress,
      siteType,
      purpose,
      requestNote || null,
      nowIso,
      nowIso
    ).run();

    if (!insertResult.success || !insertResult.meta || !insertResult.meta.last_row_id) {
      throw new Error('사전검토 신청 저장 결과를 확인할 수 없습니다.');
    }

    const requestId = Number(insertResult.meta.last_row_id);
    const requestNo = createRequestNo(now, requestId);

    const updateResult = await env.DB.prepare(`
      UPDATE precheck_requests
      SET request_no = ?, updated_at = ?
      WHERE id = ? AND member_id = ?
    `).bind(requestNo, nowIso, requestId, member.member_id).run();

    if (!updateResult.success || !updateResult.meta || Number(updateResult.meta.changes || 0) !== 1) {
      await env.DB.prepare('DELETE FROM precheck_requests WHERE id = ? AND request_no = ?')
        .bind(requestId, temporaryRequestNo)
        .run();
      throw new Error('사전검토 신청번호 생성에 실패했습니다.');
    }

    return jsonResponse({
      success: true,
      code: 'PRECHECK_REQUEST_CREATED',
      message: '사전검토 신청이 접수되었습니다.',
      request: {
        id: requestId,
        requestNo,
        status: 'received',
        applicantName,
        phone,
        siteAddress,
        siteType,
        purpose,
        requestNote,
        submittedAt: nowIso
      }
    }, 201);
  } catch (error) {
    console.error('사전검토 신청 저장 오류:', error);
    return jsonResponse({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: '사전검토 신청을 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }, 500);
  }
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function normalizeText(value, maxLength) {
  const text = String(value ?? '').normalize('NFKC').trim();
  return typeof maxLength === 'number' ? text.slice(0, maxLength) : text;
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function createRequestNo(date, id) {
  const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaDate.getUTCFullYear();
  const month = String(koreaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getUTCDate()).padStart(2, '0');
  return `PC-${year}${month}${day}-${String(id).padStart(6, '0')}`;
}

function invalidRequest(message) {
  return jsonResponse({
    success: false,
    code: 'INVALID_PRECHECK_REQUEST',
    message
  }, 400);
}

function methodNotAllowed() {
  return jsonResponse({
    success: false,
    code: 'METHOD_NOT_ALLOWED',
    message: 'POST 방식으로 요청해 주세요.'
  }, 405, { Allow: 'POST' });
}
