import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

const CATEGORIES = ['homepage', 'taedo', 'eightsolar'];
const STATUSES = ['waiting', 'in_progress', 'done'];

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const u = new URL(request.url);
    const search = text(u.searchParams.get('search'), 100);
    const category = CATEGORIES.includes(u.searchParams.get('category')) ? u.searchParams.get('category') : '';
    const status = STATUSES.includes(u.searchParams.get('status')) ? u.searchParams.get('status') : '';
    const page = clamp(u.searchParams.get('page'), 1, 100000, 1);
    const pageSize = clamp(u.searchParams.get('pageSize'), 1, 100, 30);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    const bindings = [];
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(`(c.phone LIKE ? ESCAPE '\\' OR c.customer_name LIKE ? ESCAPE '\\' OR c.address LIKE ? ESCAPE '\\')`);
      bindings.push(like, like, like);
    }
    if (category) { conditions.push('c.category=?'); bindings.push(category); }
    if (status) { conditions.push('c.status=?'); bindings.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const count = await env.DB.prepare(`SELECT COUNT(*) total FROM cs_calls c ${where}`).bind(...bindings).first();
    const catSums = await env.DB.prepare('SELECT category, COUNT(*) count FROM cs_calls GROUP BY category').all();
    const statusSums = await env.DB.prepare('SELECT status, COUNT(*) count FROM cs_calls GROUP BY status').all();

    const rows = await env.DB.prepare(`
      SELECT c.id, c.category, c.call_date, c.phone, c.customer_name, c.address, c.content, c.channel, c.receiver, c.status, c.created_at, c.updated_at,
        (SELECT note FROM cs_call_notes n WHERE n.call_id = c.id ORDER BY n.created_at DESC, n.id DESC LIMIT 1) AS last_note
      FROM cs_calls c ${where}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, pageSize, offset).all();

    const total = Number(count?.total || 0);
    const byCategory = { homepage: 0, taedo: 0, eightsolar: 0 };
    (catSums.results || []).forEach((x) => { if (byCategory[x.category] !== undefined) byCategory[x.category] = Number(x.count || 0); });
    const byStatus = { waiting: 0, in_progress: 0, done: 0 };
    (statusSums.results || []).forEach((x) => { if (byStatus[x.status] !== undefined) byStatus[x.status] = Number(x.count || 0); });
    const totalAll = byCategory.homepage + byCategory.taedo + byCategory.eightsolar;

    return jsonResponse({
      success: true,
      code: 'ADMIN_CS_CALLS_LOADED',
      calls: (rows.results || []).map((x) => ({
        id: x.id,
        category: x.category,
        callDate: x.call_date,
        phone: x.phone,
        name: x.customer_name,
        address: x.address,
        content: x.content,
        channel: x.channel,
        receiver: x.receiver,
        status: x.status,
        lastNote: x.last_note || '',
        createdAt: x.created_at,
        updatedAt: x.updated_at
      })),
      summary: { total: totalAll, byCategory, byStatus },
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    });
  } catch (err) {
    console.error('CS 상담 목록 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'CS 상담 목록을 불러오는 중 오류가 발생했습니다.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    let body;
    try { body = await request.json(); } catch { return invalid('등록할 내용을 확인해 주세요.'); }

    const category = String(body.category || '');
    if (!CATEGORIES.includes(category)) return invalid('구분(홈페이지/태투사/에잇솔라)을 선택해 주세요.');
    const phone = text(body.phone, 30);
    if (!phone) return invalid('전화번호를 입력해 주세요.');
    const callDate = normalizeDateOnly(body.callDate) || todayStr();
    const customerName = text(body.name, 60);
    const address = text(body.address, 300);
    const content = text(body.content, 1000);
    const channel = text(body.channel, 60);
    const receiver = text(body.receiver, 40);
    if (!receiver) return invalid('문의접수자를 입력해 주세요.');
    const status = STATUSES.includes(body.status) ? body.status : 'waiting';
    const firstNote = text(body.firstNote, 2000);
    const firstNoteAuthor = text(body.firstNoteAuthor, 40) || receiver;

    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      INSERT INTO cs_calls (category, call_date, phone, customer_name, address, content, channel, receiver, status, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(category, callDate, phone, customerName || null, address || null, content || null, channel || null, receiver, status, auth.admin.member_id, now, now).run();

    if (!result.success) throw new Error('상담 등록 실패');
    const callId = result.meta && result.meta.last_row_id;

    if (firstNote) {
      await env.DB.prepare(`
        INSERT INTO cs_call_notes (call_id, status, author, note, created_by, created_at)
        VALUES (?,?,?,?,?,?)
      `).bind(callId, status, firstNoteAuthor, firstNote, auth.admin.member_id, now).run();
    }

    return jsonResponse({ success: true, code: 'CS_CALL_CREATED', message: '상담이 등록되었습니다.', call: { id: callId } });
  } catch (err) {
    console.error('CS 상담 등록 오류:', err);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '상담을 등록하는 중 오류가 발생했습니다.' }, 500);
  }
}

function text(v, n) { return String(v ?? '').normalize('NFKC').trim().slice(0, n); }
function clamp(v, min, max, f) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : f; }
function invalid(message) { return jsonResponse({ success: false, code: 'INVALID_REQUEST', message }, 400); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function normalizeDateOnly(v) { const s = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function method() { return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'GET 또는 POST 방식으로 요청해 주세요.' }, 405, { Allow: 'GET, POST' }); }
export function onRequestPut() { return method(); }
export function onRequestPatch() { return method(); }
export function onRequestDelete() { return method(); }
