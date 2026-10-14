import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';
import { MAX_TEXT_LENGTH, cleanText, toPhrase } from '../../../../_lib/precheck-phrases.js';

async function loadPhrase(env, params) {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isInteger(id) || id < 1) return { error: jsonResponse({ success: false, code: 'INVALID_ID', message: '올바른 문장 번호가 아닙니다.' }, 400) };
  const row = await env.DB.prepare('SELECT id, category, group_key, text, sort_order, is_active, updated_at FROM precheck_phrases WHERE id = ? LIMIT 1').bind(id).first();
  if (!row || row.is_active !== 1) return { error: jsonResponse({ success: false, code: 'PHRASE_NOT_FOUND', message: '문장을 찾을 수 없습니다.' }, 404) };
  return { row };
}

// PUT /api/admin/precheck/phrases/:id  { text }
// 이미 검토 결과에 들어간 문장은 그대로 남고, 목록 문장만 바뀝니다.
export async function onRequestPut(context) {
  const { request, env, params } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const found = await loadPhrase(env, params);
    if (found.error) return found.error;

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, code: 'INVALID_JSON', message: '입력 내용을 확인해 주세요.' }, 400); }

    const text = cleanText(body?.text);
    if (!text) return jsonResponse({ success: false, code: 'TEXT_REQUIRED', message: '문장을 입력해 주세요.' }, 400);
    if (text.length > MAX_TEXT_LENGTH) {
      return jsonResponse({ success: false, code: 'TEXT_TOO_LONG', message: `문장은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.` }, 400);
    }
    const dup = await env.DB.prepare('SELECT id FROM precheck_phrases WHERE category = ? AND group_key = ? AND text = ? AND is_active = 1 AND id <> ? LIMIT 1')
      .bind(found.row.category, found.row.group_key, text, found.row.id).first();
    if (dup) return jsonResponse({ success: false, code: 'DUPLICATE_PHRASE', message: '이미 목록에 있는 문장입니다.' }, 409);

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE precheck_phrases SET text = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .bind(text, auth.admin.member_id, now, found.row.id).run();
    const row = await env.DB.prepare('SELECT id, category, group_key, text, sort_order, is_active, updated_at FROM precheck_phrases WHERE id = ?').bind(found.row.id).first();
    return jsonResponse({ success: true, message: '문장을 수정했습니다.', phrase: toPhrase(row) });
  } catch (error) {
    console.error('precheck phrase update error', error);
    return jsonResponse({ success: false, code: 'SERVER_ERROR', message: '문장을 수정하지 못했습니다.' }, 500);
  }
}

// DELETE /api/admin/precheck/phrases/:id  (숨김 처리: is_active = 0)
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    const found = await loadPhrase(env, params);
    if (found.error) return found.error;

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE precheck_phrases SET is_active = 0, updated_by = ?, updated_at = ? WHERE id = ?')
      .bind(auth.admin.member_id, now, found.row.id).run();
    return jsonResponse({ success: true, message: '목록에서 삭제했습니다.', id: found.row.id });
  } catch (error) {
    console.error('precheck phrase delete error', error);
    return jsonResponse({ success: false, code: 'SERVER_ERROR', message: '문장을 삭제하지 못했습니다.' }, 500);
  }
}
