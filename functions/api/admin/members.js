import { requireAdmin, jsonResponse } from '../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const search = normalizeText(url.searchParams.get('search')).slice(0, 100);
    const memberType = normalizeEnum(url.searchParams.get('memberType'), ['personal', 'business']);
    const approvalStatus = normalizeEnum(url.searchParams.get('approvalStatus'), ['pending', 'approved', 'rejected']);
    const page = clampInteger(url.searchParams.get('page'), 1, 100000, 1);
    const pageSize = clampInteger(url.searchParams.get('pageSize'), 1, 50, 20);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const bindings = [];
    if (search) {
      conditions.push('(username LIKE ? OR name LIKE ? OR email LIKE ? OR company_name LIKE ? OR business_number LIKE ?)');
      const like = `%${escapeLike(search)}%`;
      bindings.push(like, like, like, like, like);
    }
    if (memberType) { conditions.push('member_type = ?'); bindings.push(memberType); }
    if (approvalStatus) { conditions.push('approval_status = ?'); bindings.push(approvalStatus); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM members ${where}`)
      .bind(...bindings).first();

    const result = await env.DB.prepare(`
      SELECT id, member_type, username, name, email, phone, company_name,
             business_number, approval_status, role, created_at, updated_at
      FROM members
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, pageSize, offset).all();

    return jsonResponse({
      success: true,
      code: 'ADMIN_MEMBERS_LOADED',
      members: (result.results || []).map(mapMember),
      pagination: {
        page,
        pageSize,
        total: Number(countRow?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(countRow?.total || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error('관리자 회원목록 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '회원목록을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function mapMember(row) {
  return {
    id: row.id,
    memberType: row.member_type,
    username: row.username,
    name: row.name,
    email: row.email,
    phone: row.phone,
    companyName: row.company_name,
    businessNumber: row.business_number,
    approvalStatus: row.approval_status,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function normalizeText(value) { return typeof value === 'string' ? value.trim() : ''; }
function normalizeEnum(value, allowed) { const text = normalizeText(value); return allowed.includes(text) ? text : ''; }
function clampInteger(value, min, max, fallback) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; }
function escapeLike(value) { return value.replace(/[\\%_]/g, '\\$&'); }
function methodNotAllowed() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 방식으로 요청해 주세요.' }, 405, { Allow: 'GET' }); }
