import bcrypt from "bcryptjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const SESSION_COOKIE_NAME = "teadosa_session";

export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return jsonResponse({ success: false, code: "DATABASE_NOT_CONFIGURED", message: "회원 데이터베이스 연결이 설정되지 않았습니다." }, 500);
    }

    if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      return jsonResponse({ success: false, code: "INVALID_CONTENT_TYPE", message: "요청 형식이 올바르지 않습니다." }, 415);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 10_000) {
      return jsonResponse({ success: false, code: "PAYLOAD_TOO_LARGE", message: "요청 데이터가 너무 큽니다." }, 413);
    }

    const auth = await authenticate(request, env);
    if (!auth.ok) return auth.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, code: "INVALID_JSON", message: "비밀번호 정보를 읽을 수 없습니다." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ success: false, code: "INVALID_REQUEST", message: "비밀번호 정보가 올바르지 않습니다." }, 400);
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const newPasswordConfirm = typeof body.newPasswordConfirm === "string" ? body.newPasswordConfirm : "";

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return jsonResponse({ success: false, code: "PASSWORD_FIELDS_REQUIRED", message: "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요." }, 400);
    }

    if (newPassword !== newPasswordConfirm) {
      return jsonResponse({ success: false, code: "PASSWORD_CONFIRM_MISMATCH", field: "newPasswordConfirm", message: "새 비밀번호 확인이 일치하지 않습니다." }, 400);
    }

    if (!isValidPassword(newPassword)) {
      return jsonResponse({ success: false, code: "INVALID_NEW_PASSWORD", field: "newPassword", message: "새 비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다." }, 400);
    }

    if (new TextEncoder().encode(currentPassword).length > 72 || new TextEncoder().encode(newPassword).length > 72) {
      return jsonResponse({ success: false, code: "PASSWORD_TOO_LONG", message: "비밀번호가 너무 깁니다." }, 400);
    }

    let currentMatches = false;
    try {
      currentMatches = await bcrypt.compare(currentPassword, auth.member.password_hash);
    } catch (error) {
      console.error("현재 비밀번호 비교 오류:", error);
      return internalErrorResponse();
    }

    if (!currentMatches) {
      return jsonResponse({ success: false, code: "CURRENT_PASSWORD_INCORRECT", field: "currentPassword", message: "현재 비밀번호가 일치하지 않습니다." }, 400);
    }

    let sameAsCurrent = false;
    try {
      sameAsCurrent = await bcrypt.compare(newPassword, auth.member.password_hash);
    } catch (error) {
      console.error("새 비밀번호 비교 오류:", error);
      return internalErrorResponse();
    }

    if (sameAsCurrent) {
      return jsonResponse({ success: false, code: "PASSWORD_REUSE_NOT_ALLOWED", field: "newPassword", message: "현재 비밀번호와 다른 새 비밀번호를 입력해 주세요." }, 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const nowIso = new Date().toISOString();

    const updateResult = await env.DB.prepare(
      `UPDATE members SET password_hash = ?, updated_at = ? WHERE id = ?`
    ).bind(newPasswordHash, nowIso, auth.member.id).run();

    if (!updateResult.success) {
      throw new Error("비밀번호 저장에 실패했습니다.");
    }

    // 현재 세션은 유지하고, 다른 기기와 브라우저의 세션은 모두 종료합니다.
    await env.DB.prepare(
      `DELETE FROM sessions WHERE member_id = ? AND id <> ?`
    ).bind(auth.member.id, auth.member.session_id).run();

    return jsonResponse({
      success: true,
      code: "PASSWORD_CHANGED",
      message: "비밀번호가 변경되었습니다. 다른 기기의 로그인은 모두 종료되었습니다.",
    }, 200);
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    return internalErrorResponse();
  }
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPost() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

async function authenticate(request, env) {
  const token = getCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return { ok: false, response: unauthorized("UNAUTHENTICATED", "로그인이 필요합니다.") };

  const tokenHash = await sha256(token);
  const nowIso = new Date().toISOString();
  const member = await env.DB.prepare(
    `SELECT members.id, members.member_type, members.approval_status, members.password_hash,
            sessions.id AS session_id, sessions.expires_at
     FROM sessions
     INNER JOIN members ON members.id = sessions.member_id
     WHERE sessions.token_hash = ?
     LIMIT 1`
  ).bind(tokenHash).first();

  if (!member) return { ok: false, response: unauthorized("INVALID_SESSION", "로그인이 필요합니다.", true) };

  if (member.expires_at <= nowIso) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(member.session_id).run();
    return { ok: false, response: unauthorized("SESSION_EXPIRED", "로그인 시간이 만료되었습니다.", true) };
  }

  if (member.approval_status !== "approved") {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(member.session_id).run();
    return { ok: false, response: unauthorized("ACCOUNT_NOT_APPROVED", "승인되지 않은 회원입니다.", true) };
  }

  return { ok: true, member };
}

function isValidPassword(value) {
  return value.length >= 8 && value.length <= 64 && /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";")) {
    const index = cookie.indexOf("=");
    if (index === -1) continue;
    if (cookie.slice(0, index).trim() === name) return cookie.slice(index + 1).trim();
  }
  return null;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unauthorized(code, message, clearCookie = false) {
  return jsonResponse({ success: false, authenticated: false, code, message }, 401,
    clearCookie ? { "Set-Cookie": clearSessionCookie() } : {});
}

function clearSessionCookie() {
  return [`${SESSION_COOKIE_NAME}=`, "Path=/", "Max-Age=0", "HttpOnly", "Secure", "SameSite=Lax"].join("; ");
}

function methodNotAllowed() {
  return jsonResponse({ success: false, code: "METHOD_NOT_ALLOWED", message: "PUT 방식으로 요청해 주세요." }, 405, { Allow: "PUT" });
}

function internalErrorResponse() {
  return jsonResponse({ success: false, code: "INTERNAL_SERVER_ERROR", message: "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...additionalHeaders } });
}
