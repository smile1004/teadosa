import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';
import { PHRASE_GROUPS, MAX_TEXT_LENGTH, validGroup, cleanText, toPhrase } from '../../../../_lib/precheck-phrases.js';

// GET /api/admin/precheck/phrases?category=site&group=shade
// category, group 생략 시 전체 사용 중 문장을 그룹별로 돌려줍니다.
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const groupKey = url.searchParams.get('group');

    let sql = 'SELECT id, category, group_key, text, sort_order, is_active, updated_at FROM precheck_phrases WHERE is_active = 1';
    const binds = [];
    if (category) {
      if (!Object.prototype.hasOwnProperty.call(PHRASE_GROUPS, category)) {
        return jsonResponse({ success: false, code: 'INVALID_CATEGORY', message: '문장 구분이 올바르지 않습니다.' }, 400);
      }
      sql += ' AND category = ?';
      binds.push(category);
    }
    if (groupKey) {
      if (!category || !validGroup(category, groupKey)) {
        return jsonResponse({ success: false, code: 'INVALID_GROUP', message: '문장 항목이 올바르지 않습니다.' }, 400);
      }
      sql += ' AND group_key = ?';
      binds.push(groupKey);
    }
    sql += ' ORDER BY category, group_key, sort_order, id';

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const groups = {};
    for (const row of results || []) {
      const key = row.category + '.' + row.group_key;
      (groups[key] = groups[key] || []).push(toPhrase(row));
    }
    return jsonResponse({ success: true, phrases: (results || []).map(toPhrase), groups });
  } catch (error) {
    console.error('precheck phrases list error', error);
    return jsonResponse({ success: false, code: 'SERVER_ERROR', message: '표준 문장을 불러오지 못했습니다.' }, 500);
  }
}

// POST /api/admin/precheck/phrases  { category, groupKey, text }
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, code: 'INVALID_JSON', message: '입력 내용을 확인해 주세요.' }, 400); }

    const category = body?.category;
    const groupKey = body?.groupKey;
    const text = cleanText(body?.text);
    if (!validGroup(category, groupKey)) {
      return jsonResponse({ success: false, code: 'INVALID_GROUP', message: '문장 항목이 올바르지 않습니다.' }, 400);
    }
    if (!text) return jsonResponse({ success: false, code: 'TEXT_REQUIRED', message: '등록할 문장을 입력해 주세요.' }, 400);
    if (text.length > MAX_TEXT_LENGTH) {
      return jsonResponse({ success: false, code: 'TEXT_TOO_LONG', message: `문장은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.` }, 400);
    }

    const dup = await env.DB.prepare('SELECT id FROM precheck_phrases WHERE category = ? AND group_key = ? AND text = ? AND is_active = 1 LIMIT 1')
      .bind(category, groupKey, text).first();
    if (dup) return jsonResponse({ success: false, code: 'DUPLICATE_PHRASE', message: '이미 목록에 있는 문장입니다.' }, 409);

    const last = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM precheck_phrases WHERE category = ? AND group_key = ?')
      .bind(category, groupKey).first();
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      'INSERT INTO precheck_phrases (category, group_key, text, sort_order, is_active, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)'
    ).bind(category, groupKey, text, Number(last?.max_order || 0) + 10, auth.admin.member_id, auth.admin.member_id, now, now).run();

    const row = await env.DB.prepare('SELECT id, category, group_key, text, sort_order, is_active, updated_at FROM precheck_phrases WHERE id = ?')
      .bind(result.meta.last_row_id).first();
    return jsonResponse({ success: true, message: '목록에 등록했습니다.', phrase: toPhrase(row) }, 201);
  } catch (error) {
    console.error('precheck phrase create error', error);
    return jsonResponse({ success: false, code: 'SERVER_ERROR', message: '문장을 등록하지 못했습니다.' }, 500);
  }
}
