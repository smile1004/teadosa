import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';
const STATUSES = ['received','consulting','contracted','documents','submitted','supplement_required','completed','cancelled'];
export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const u = new URL(request.url), search = text(u.searchParams.get('search'), 100), status = STATUSES.includes(u.searchParams.get('status')) ? u.searchParams.get('status') : '';
    const page = clamp(u.searchParams.get('page'), 1, 100000, 1), pageSize = clamp(u.searchParams.get('pageSize'), 1, 50, 20), offset = (page - 1) * pageSize, conditions = [], bindings = [];
    if (search) { const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`; conditions.push(`(r.request_no LIKE ? ESCAPE '\\' OR r.applicant_name LIKE ? ESCAPE '\\' OR r.phone LIKE ? ESCAPE '\\' OR r.email LIKE ? ESCAPE '\\' OR r.site_address LIKE ? ESCAPE '\\')`); bindings.push(like, like, like, like, like); }
    if (status) { conditions.push('r.status=?'); bindings.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await env.DB.prepare(`SELECT COUNT(*) total FROM construction_plan_requests r ${where}`).bind(...bindings).first();
    const sums = await env.DB.prepare('SELECT status,COUNT(*) count FROM construction_plan_requests GROUP BY status').all();
    const rows = await env.DB.prepare(`SELECT r.id,r.request_no,r.applicant_name,r.phone,r.email,r.site_address,r.capacity_type,r.user_type,r.status,r.submitted_at,r.updated_at,m.username,m.member_type FROM construction_plan_requests r LEFT JOIN members m ON m.id=r.member_id ${where} ORDER BY r.submitted_at DESC,r.id DESC LIMIT ? OFFSET ?`).bind(...bindings, pageSize, offset).all();
    const total = Number(count?.total || 0), summary = { total: 0 };
    STATUSES.forEach(s => summary[s] = 0);
    (sums.results || []).forEach(x => { summary[x.status] = Number(x.count || 0); summary.total += Number(x.count || 0); });
    return jsonResponse({
      success: true, code: 'ADMIN_CONSTRUCTION_PLAN_REQUESTS_LOADED',
      requests: (rows.results || []).map(x => ({ id: x.id, requestNo: x.request_no, applicantName: x.applicant_name, phone: x.phone, email: x.email, siteAddress: x.site_address, capacityType: x.capacity_type, userType: x.user_type, status: x.status, submittedAt: x.submitted_at, updatedAt: x.updated_at, username: x.username, memberType: x.member_type })),
      summary, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    });
  } catch (err) { console.error('관리자 공사계획신고 목록 오류:', err); return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '공사계획신고 신청목록을 불러오는 중 오류가 발생했습니다.' }, 500); }
}
function text(v, n) { return String(v ?? '').trim().slice(0, n); }
function clamp(v, min, max, f) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : f; }
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' }); }
export function onRequestPost() { return method(); }
export function onRequestPut() { return method(); }
export function onRequestPatch() { return method(); }
export function onRequestDelete() { return method(); }
