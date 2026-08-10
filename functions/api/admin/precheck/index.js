import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const search = normalizeText(url.searchParams.get('search')).slice(0, 100);
    const status = normalizeEnum(url.searchParams.get('status'), ['received', 'reviewing', 'supplement_required', 'completed']);
    const page = clampInteger(url.searchParams.get('page'), 1, 100000, 1);
    const pageSize = clampInteger(url.searchParams.get('pageSize'), 1, 50, 20);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const bindings = [];
    if (search) {
      conditions.push(`(
        r.request_no LIKE ? ESCAPE '\\' OR
        r.applicant_name LIKE ? ESCAPE '\\' OR
        r.phone LIKE ? ESCAPE '\\' OR
        COALESCE(r.email, '') LIKE ? ESCAPE '\\' OR
        COALESCE(r.company_name, '') LIKE ? ESCAPE '\\' OR
        r.site_address LIKE ? ESCAPE '\\'
      )`);
      const like = `%${escapeLike(search)}%`;
      bindings.push(like, like, like, like, like, like);
    }
    if (status) {
      conditions.push('r.status = ?');
      bindings.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM precheck_requests r ${where}`)
      .bind(...bindings).first();

    const statusRows = await env.DB.prepare(`
      SELECT status, COUNT(*) AS count
      FROM precheck_requests
      GROUP BY status
    `).all();

    const result = await env.DB.prepare(`
      SELECT
        r.id,
        r.request_no,
        r.member_id,
        r.applicant_name,
        r.phone,
        r.email,
        r.company_name,
        r.site_address,
        r.status,
        r.submitted_at,
        r.updated_at,
        m.member_type,
        m.username
      FROM precheck_requests r
      LEFT JOIN members m ON m.id = r.member_id
      ${where}
      ORDER BY r.submitted_at DESC, r.id DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, pageSize, offset).all();

    const total = Number(countRow?.total || 0);
    return jsonResponse({
      success: true,
      code: 'ADMIN_PRECHECK_REQUESTS_LOADED',
      requests: (result.results || []).map(mapRequest),
      summary: mapStatusSummary(statusRows.results || []),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('관리자 사전검토 목록 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '사전검토 신청목록을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function mapRequest(row) {
  return {
    id: row.id,
    requestNo: row.request_no,
    memberId: row.member_id,
    memberType: row.member_type,
    username: row.username,
    applicantName: row.applicant_name,
    phone: row.phone,
    email: row.email,
    companyName: row.company_name,
    siteAddress: row.site_address,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function mapStatusSummary(rows) {
  const summary = { total: 0, received: 0, reviewing: 0, supplementRequired: 0, completed: 0 };
  rows.forEach((row) => {
    const count = Number(row.count || 0);
    summary.total += count;
    if (row.status === 'received') summary.received = count;
    if (row.status === 'reviewing') summary.reviewing = count;
    if (row.status === 'supplement_required') summary.supplementRequired = count;
    if (row.status === 'completed') summary.completed = count;
  });
  return summary;
}

function normalizeText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeEnum(value, allowed) { const text = normalizeText(value); return allowed.includes(text) ? text : ''; }
function clampInteger(value, min, max, fallback) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; }
function escapeLike(value) { return value.replace(/[\\%_]/g, '\\$&'); }
function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' }); }
