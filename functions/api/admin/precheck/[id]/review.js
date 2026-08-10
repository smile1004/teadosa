import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

const INSTALLATION_STATUS = ['undetermined', 'possible', 'conditional', 'not_possible'];
const ITEM_STATUS = ['info', 'ok', 'conditional', 'hold', 'not_possible'];
const DEFAULT_CUSTOMER_NOTICE = "1. 인허가 및 지자체 조례 검토\n• 본 검토는 검토 시점에 확인 가능한 지자체 도시계획 조례 및 관련 법령을 기준으로 작성되었습니다.\n• 실제 사업 진행 시 관계기관 협의, 개발행위 심의, 민원 발생 등에 따라 검토 결과가 변경될 수 있습니다.\n• 최종 허가 여부는 해당 행정기관의 심사 결과를 기준으로 결정됩니다.\n\n2. 한국전력 계통연계 검토\n• 본 검토는 한국전력에서 제공하는 계통정보와 검토 시점에 확인 가능한 자료를 기준으로 작성되었습니다.\n• 계통연계 가능 여부와 여유 용량은 다른 접수 건, 전력계통 운영 상황 및 설비계획 변경 등에 따라 실제 접수 시 변경될 수 있습니다.\n• 최종 계통연계 가능 여부 및 연계 조건은 한국전력의 계통연계 검토 결과를 기준으로 결정됩니다.";

export async function onRequestPut(context) {
  const { request, env, params } = context;

  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const requestId = Number.parseInt(params.id, 10);
    if (!Number.isInteger(requestId) || requestId < 1) {
      return jsonResponse({ success: false, code: 'INVALID_REQUEST_ID', message: '올바른 신청번호가 아닙니다.' }, 400);
    }

    let body;
    try { body = await request.json(); }
    catch {
      return jsonResponse({ success: false, code: 'INVALID_JSON', message: '입력 내용을 확인해 주세요.' }, 400);
    }

    const target = await env.DB.prepare('SELECT id, request_no FROM precheck_requests WHERE id = ? LIMIT 1')
      .bind(requestId).first();

    if (!target) {
      return jsonResponse({ success: false, code: 'PRECHECK_NOT_FOUND', message: '사전검토 신청을 찾을 수 없습니다.' }, 404);
    }

    const installationPossible = enumValue(body?.installationPossible, INSTALLATION_STATUS, 'undetermined');
    const expectedCapacity = nullableNumber(body?.expectedCapacity);
    const overallOpinion = textValue(body?.overallOpinion, 5000);
    const customerNotice = textValue(body?.customerNotice, 5000) || DEFAULT_CUSTOMER_NOTICE;
    const internalMemo = textValue(body?.internalMemo, 5000);
    const items = normalizeItems(body?.items);
    const publish = Boolean(body?.publish);

    if (publish && installationPossible === 'undetermined') {
      return jsonResponse({ success: false, code: 'RESULT_NOT_READY', message: '회원 공개 전 종합 판정을 선택해 주세요.' }, 400);
    }
    if (publish && !overallOpinion) {
      return jsonResponse({ success: false, code: 'RESULT_NOT_READY', message: '회원 공개 전 종합 의견을 입력해 주세요.' }, 400);
    }

    const nowIso = new Date().toISOString();
    const resultVersion = 'PRECHECK_RESULT_V2';
    const resultData = JSON.stringify({ items });

    const existingReview = await env.DB.prepare('SELECT id, published_at FROM precheck_reviews WHERE request_id = ? LIMIT 1')
      .bind(requestId).first();

    const publishedAt = publish ? nowIso : (existingReview?.published_at || null);

    if (existingReview) {
      await env.DB.prepare(`
        UPDATE precheck_reviews
        SET installation_possible = ?,
            expected_capacity = ?,
            overall_opinion = ?,
            customer_notice = ?,
            internal_memo = ?,
            result_version = ?,
            result_data = ?,
            reviewed_by = ?,
            reviewed_at = ?,
            published_at = ?,
            updated_at = ?
        WHERE request_id = ?
      `).bind(
        installationPossible,
        expectedCapacity,
        overallOpinion || null,
        customerNotice || null,
        internalMemo || null,
        resultVersion,
        resultData,
        auth.admin.member_id,
        nowIso,
        publishedAt,
        nowIso,
        requestId
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO precheck_reviews (
          request_id,
          installation_possible,
          expected_capacity,
          overall_opinion,
          customer_notice,
          internal_memo,
          result_version,
          result_data,
          reviewed_by,
          reviewed_at,
          published_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestId,
        installationPossible,
        expectedCapacity,
        overallOpinion || null,
        customerNotice || null,
        internalMemo || null,
        resultVersion,
        resultData,
        auth.admin.member_id,
        nowIso,
        publishedAt,
        nowIso
      ).run();
    }

    const nextStatus = publish ? 'completed' : 'reviewing';
    await env.DB.prepare('UPDATE precheck_requests SET status = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, nowIso, requestId).run();

    return jsonResponse({
      success: true,
      code: publish ? 'PRECHECK_RESULT_PUBLISHED' : 'PRECHECK_REVIEW_SAVED',
      message: publish ? '검토결과가 저장되고 회원에게 공개되었습니다.' : '검토결과가 임시 저장되었습니다.',
      request: {
        id: requestId,
        requestNo: target.request_no,
        status: nextStatus
      },
      review: {
        installationPossible,
        expectedCapacity,
        overallOpinion,
        customerNotice,
        internalMemo,
        resultVersion,
        resultData: { items },
        reviewedAt: nowIso,
        publishedAt
      }
    });
  } catch (error) {
    console.error('관리자 사전검토 결과 저장 오류:', error);
    return jsonResponse({ success: false, code: 'INTERNAL_SERVER_ERROR', message: '검토결과를 저장하는 중 오류가 발생했습니다.' }, 500);
  }
}

function textValue(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function enumValue(value, allowed, fallback) {
  const v = typeof value === 'string' ? value.trim() : '';
  return allowed.includes(v) ? v : fallback;
}
function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 30).map((item, index) => ({
    id: textValue(item?.id, 60) || `item-${index + 1}`,
    title: textValue(item?.title, 100),
    status: enumValue(item?.status, ITEM_STATUS, 'info'),
    content: textValue(item?.content, 3000)
  })).filter((item) => item.title || item.content);
}
function methodNotAllowed() {
  return jsonResponse({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'PUT 방식으로 요청해 주세요.' }, 405, { Allow: 'PUT' });
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }
