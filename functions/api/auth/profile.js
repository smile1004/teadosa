const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const SESSION_COOKIE_NAME = "teadosa_session";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{9,11}$/;

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
    if (contentLength > 20_000) {
      return jsonResponse({ success: false, code: "PAYLOAD_TOO_LARGE", message: "요청 데이터가 너무 큽니다." }, 413);
    }

    const auth = await authenticate(request, env);
    if (!auth.ok) return auth.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, code: "INVALID_JSON", message: "회원정보를 읽을 수 없습니다." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ success: false, code: "INVALID_REQUEST", message: "회원정보가 올바르지 않습니다." }, 400);
    }

    const member = auth.member;
    const isBusiness = member.member_type === "business";

    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const phone = normalizeDigits(body.phone);
    const postalCode = normalizeText(body.postalCode);
    const address = normalizeText(body.address);
    const addressDetail = normalizeText(body.addressDetail);

    if (!name || !email || !phone) {
      return jsonResponse({ success: false, code: "REQUIRED_FIELDS_MISSING", message: "필수 입력 항목을 모두 입력해 주세요." }, 400);
    }

    if (name.length < 2 || name.length > 50) {
      return jsonResponse({ success: false, code: "INVALID_NAME", field: "name", message: "이름은 2~50자로 입력해 주세요." }, 400);
    }

    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      return jsonResponse({ success: false, code: "INVALID_EMAIL", field: "email", message: "올바른 이메일 주소를 입력해 주세요." }, 400);
    }

    if (!PHONE_REGEX.test(phone)) {
      return jsonResponse({ success: false, code: "INVALID_PHONE", field: "phone", message: "휴대전화번호를 정확하게 입력해 주세요." }, 400);
    }

    if (postalCode.length > 10 || address.length > 200 || addressDetail.length > 200) {
      return jsonResponse({ success: false, code: "INVALID_ADDRESS", field: "address", message: "주소 입력값이 너무 깁니다." }, 400);
    }

    if (isBusiness && (!postalCode || !address)) {
      return jsonResponse({ success: false, code: "BUSINESS_ADDRESS_REQUIRED", field: "address", message: "사업장 주소를 검색해 입력해 주세요." }, 400);
    }

    const duplicateEmail = await env.DB.prepare(
      `SELECT id FROM members WHERE email = ? AND id <> ? LIMIT 1`
    ).bind(email, member.id).first();

    if (duplicateEmail) {
      return jsonResponse({ success: false, code: "EMAIL_ALREADY_EXISTS", field: "email", message: "이미 가입된 이메일입니다." }, 409);
    }

    const nowIso = new Date().toISOString();

    if (isBusiness) {
      const companyName = normalizeText(body.companyName);
      const ceoName = normalizeText(body.ceoName);
      const businessType = normalizeText(body.businessType);
      const businessItem = normalizeText(body.businessItem);
      const department = normalizeText(body.department);
      const officePhone = normalizePhone(body.officePhone);

      if (!companyName) {
        return jsonResponse({ success: false, code: "COMPANY_NAME_REQUIRED", field: "companyName", message: "기업명을 입력해 주세요." }, 400);
      }

      if (companyName.length > 100 || ceoName.length > 50 || businessType.length > 100 || businessItem.length > 100 || department.length > 100 || officePhone.length > 20) {
        return jsonResponse({ success: false, code: "INVALID_BUSINESS_PROFILE", message: "기업정보 입력 길이를 확인해 주세요." }, 400);
      }

      await env.DB.prepare(
        `UPDATE members
         SET name = ?, email = ?, phone = ?, postal_code = ?, address = ?, address_detail = ?,
             company_name = ?, ceo_name = ?, business_type = ?, business_item = ?, department = ?, office_phone = ?, updated_at = ?
         WHERE id = ? AND member_type = 'business'`
      ).bind(
        name, email, phone, postalCode, address, addressDetail,
        companyName, ceoName || null, businessType || null, businessItem || null,
        department || null, officePhone || null, nowIso, member.id
      ).run();
    } else {
      await env.DB.prepare(
        `UPDATE members
         SET name = ?, email = ?, phone = ?, postal_code = ?, address = ?, address_detail = ?, updated_at = ?
         WHERE id = ? AND member_type = 'personal'`
      ).bind(name, email, phone, postalCode || null, address || null, addressDetail || null, nowIso, member.id).run();
    }

    const updated = await getMember(env, member.id);

    return jsonResponse({
      success: true,
      code: "PROFILE_UPDATED",
      message: "회원정보가 수정되었습니다.",
      member: serializeMember(updated),
    }, 200);
  } catch (error) {
    console.error("회원정보 수정 오류:", error);
    return jsonResponse({ success: false, code: "INTERNAL_SERVER_ERROR", message: "회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 500);
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
    `SELECT members.*, sessions.id AS session_id, sessions.expires_at
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

async function getMember(env, memberId) {
  return env.DB.prepare(
    `SELECT id, member_type, username, email, name, phone, company_name, business_number,
            postal_code, address, address_detail, ceo_name, business_type, business_item,
            department, office_phone, approval_status, created_at, updated_at
     FROM members WHERE id = ? LIMIT 1`
  ).bind(memberId).first();
}

function serializeMember(member) {
  return {
    id: member.id,
    memberType: member.member_type,
    username: member.username,
    email: member.email,
    name: member.name,
    phone: member.phone,
    companyName: member.company_name,
    businessNumber: member.business_number,
    postalCode: member.postal_code,
    address: member.address,
    addressDetail: member.address_detail,
    ceoName: member.ceo_name,
    businessType: member.business_type,
    businessItem: member.business_item,
    department: member.department,
    officePhone: member.office_phone,
    approvalStatus: member.approval_status,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };
}

function normalizeText(value) { return String(value || "").normalize("NFKC").trim(); }
function normalizeDigits(value) { return String(value || "").replace(/\D/g, ""); }
function normalizePhone(value) { return String(value || "").replace(/[^0-9-]/g, "").slice(0, 20); }

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

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...additionalHeaders } });
}
