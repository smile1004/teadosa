import { requireMember, jsonResponse } from './member-auth.js';
import { requireAdmin } from './admin-auth.js';

const tables = Object.freeze({ precheck: 'precheck_requests', license: 'generation_license_requests', development: 'development_permit_requests', ppa: 'ppa_requests', 'construction-plan': 'construction_plan_requests' });
const basicFields = [
  { key: 'applicantName', label: '신청인 이름 / 법인명', required: true, max: 100 },
  { key: 'phone', label: '연락처', type: 'tel', required: true, max: 20 },
  { key: 'email', label: '이메일', type: 'email', max: 254 },
  { key: 'siteAddress', label: '사업지 주소', required: true, max: 200 },
  { key: 'requestNote', label: '추가 요청사항', type: 'textarea', max: 1500 }
];

// Keep permissions, validation and denormalized application fields in one place.
export async function manageApplication({ request, env, params }, admin = false) {
  try {
    const auth = await (admin ? requireAdmin : requireMember)(request, env);
    if (auth.error) return auth.error;
    const type = params.type, id = Number(params.id);
    if (!Object.hasOwn(tables, type) || !/^[1-9]\d*$/.test(String(params.id)) || !Number.isSafeInteger(id)) return fail('올바른 신청이 아닙니다.', 400);
    if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return jsonResponse({ success: false, message: '지원하지 않는 요청 방식입니다.' }, 405, { Allow: 'GET, PUT, DELETE' });
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin');
      if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return fail('요청 출처를 확인할 수 없습니다.', 403);
    }
    const table = tables[type];
    const owner = admin ? '' : ' AND member_id = ?';
    const scope = admin ? [id] : [id, auth.member.member_id];
    const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?${owner}`).bind(...scope).first();
    if (!row) return fail('신청내역을 찾을 수 없습니다.', 404);
    let form;
    try { form = JSON.parse(row.form_data || '{}'); } catch { return fail('신청서 정보를 읽을 수 없습니다. 관리자에게 문의해 주세요.', 409); }
    if (!form || typeof form !== 'object' || Array.isArray(form)) return fail('신청서 정보를 확인해 주세요.', 409);
    const values = { applicantName: row.applicant_name, phone: row.phone, email: row.email || '', siteAddress: row.site_address, requestNote: type === 'precheck' ? row.request_note || '' : form.requestNote || '' };
    if (request.method === 'GET') return jsonResponse({ success: true, request: { id, requestNo: row.request_no, updatedAt: row.updated_at, values }, fields: basicFields.map(f => ({ ...f, required: f.key === 'email' ? type !== 'precheck' : !!f.required })) });
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return fail('JSON 형식으로 요청해 주세요.', 415);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 12000) return fail('신청 내용이 너무 큽니다.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { return fail('요청 내용을 읽을 수 없습니다.', 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('요청 내용이 올바르지 않습니다.', 400);
    if (body.updatedAt !== row.updated_at) return fail('다른 화면에서 신청이 변경되었습니다. 창을 닫고 다시 열어 주세요.', 409);
    if (request.method === 'DELETE') {
      // SQLite RESTRICT prevents deleting a precheck referenced by a license.
      const deleted = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?${owner} AND updated_at = ?`).bind(...scope, body.updatedAt).run();
      if (!deleted.success || deleted.meta?.changes !== 1) return fail('신청이 변경되었습니다. 새로고침 후 다시 시도해 주세요.', 409);
      return jsonResponse({ success: true, message: '신청내역이 삭제되었습니다.' });
    }
    const next = {};
    for (const field of basicFields) {
      if (typeof body.values?.[field.key] !== 'string') return fail(field.label + '을(를) 확인해 주세요.', 400);
      const value = body.values[field.key].normalize('NFKC').trim();
      if (value.length > field.max || (field.required && !value)) return fail(field.label + '을(를) 확인해 주세요.', 400);
      next[field.key] = value;
    }
    next.phone = next.phone.replace(/\D/g, '');
    if (!/^\d{9,11}$/.test(next.phone)) return fail('연락처를 정확하게 입력해 주세요.', 400);
    if ((!next.email && type !== 'precheck') || (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))) return fail('이메일 형식을 확인해 주세요.', 400);
    // A published assessment is tied to its site; changing that site needs a new assessment.
    if (type === 'precheck' && next.siteAddress !== row.site_address && row.status === 'completed') return fail('검토 완료된 사업지는 주소를 변경할 수 없습니다. 새 사전검토를 신청해 주세요.', 409);
    if (['development', 'ppa', 'construction-plan'].includes(type) && !['completed', 'cancelled'].includes(row.status)) {
      const duplicate = await env.DB.prepare(`SELECT id FROM ${table} WHERE member_id = ? AND site_address = ? AND id != ? AND status NOT IN ('completed','cancelled') LIMIT 1`).bind(row.member_id, next.siteAddress, id).first();
      if (duplicate) return fail('같은 사업지 주소로 진행 중인 신청이 있습니다.', 409);
    }
    if (type === 'precheck') {
      form.applicant = { ...form.applicant, name: next.applicantName, phone: next.phone, email: next.email, siteAddress: next.siteAddress };
      form.request = { ...form.request, memo: next.requestNote || null };
    } else {
      Object.assign(form, { applicantName: next.applicantName, applicantPhone: next.phone, applicantEmail: next.email, siteAddress: next.siteAddress, requestNote: next.requestNote });
    }
    const extra = type === 'precheck' ? ', request_note = ?' : '';
    const args = [next.applicantName, next.phone, next.email, next.siteAddress, JSON.stringify(form), new Date().toISOString()];
    if (type === 'precheck') args.push(next.requestNote || null);
    const result = await env.DB.prepare(`UPDATE ${table} SET applicant_name = ?, phone = ?, email = ?, site_address = ?, form_data = ?, updated_at = ?${extra} WHERE id = ?${owner} AND updated_at = ?`).bind(...args, ...scope, body.updatedAt).run();
    if (!result.success || result.meta?.changes !== 1) return fail('신청이 변경되었습니다. 창을 닫고 다시 열어 주세요.', 409);
    return jsonResponse({ success: true, message: '신청내용이 수정되었습니다.' });
  } catch (error) {
    if (/FOREIGN KEY constraint failed/i.test(String(error.message))) return fail('연결된 후속 신청이 있어 삭제할 수 없습니다. 후속 신청을 먼저 확인해 주세요.', 409);
    console.error('신청 수정/삭제 오류:', error);
    return fail('신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
}
function fail(message, status) { return jsonResponse({ success: false, message }, status); }
