const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_NUMBER_REGEX = /^[0-9]{10}$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return jsonResponse({ success: false, code: "DATABASE_NOT_CONFIGURED", message: "회원 데이터베이스 연결이 설정되지 않았습니다." }, 500);
    }

    if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      return jsonResponse({ success: false, code: "INVALID_CONTENT_TYPE", message: "요청 형식이 올바르지 않습니다." }, 415);
    }

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ success: false, code: "INVALID_JSON", message: "확인 정보를 읽을 수 없습니다." }, 400); }

    const field = typeof body?.field === "string" ? body.field.trim() : "";
    let value = typeof body?.value === "string" ? body.value.normalize("NFKC").trim() : "";

    const settings = {
      username: {
        column: "username",
        normalize: (v) => v.toLowerCase(),
        valid: (v) => USERNAME_REGEX.test(v),
        invalidMessage: "아이디는 영문, 숫자, 밑줄, 하이픈을 사용하여 6~20자로 입력해 주세요.",
        availableMessage: "사용 가능한 아이디입니다.",
        duplicateMessage: "이미 사용 중인 아이디입니다.",
      },
      email: {
        column: "email",
        normalize: (v) => v.toLowerCase(),
        valid: (v) => v.length <= 254 && EMAIL_REGEX.test(v),
        invalidMessage: "올바른 이메일 주소를 입력해 주세요.",
        availableMessage: "사용 가능한 이메일입니다.",
        duplicateMessage: "이미 가입된 이메일입니다.",
      },
      businessNumber: {
        column: "business_number",
        normalize: (v) => v.replace(/\D/g, ""),
        valid: (v) => BUSINESS_NUMBER_REGEX.test(v) && isValidBusinessNumber(v),
        invalidMessage: "사업자등록번호 10자리를 정확하게 입력해 주세요.",
        availableMessage: "등록 가능한 사업자등록번호입니다.",
        duplicateMessage: "이미 등록된 사업자등록번호입니다.",
      },
    };

    const setting = settings[field];
    if (!setting) {
      return jsonResponse({ success: false, code: "INVALID_FIELD", message: "확인할 항목이 올바르지 않습니다." }, 400);
    }

    value = setting.normalize(value);
    if (!setting.valid(value)) {
      return jsonResponse({ success: false, available: false, code: "INVALID_VALUE", field, message: setting.invalidMessage }, 400);
    }

    const found = await env.DB.prepare(`SELECT id FROM members WHERE ${setting.column} = ? LIMIT 1`).bind(value).first();

    if (found) {
      return jsonResponse({ success: true, available: false, code: "DUPLICATE", field, message: setting.duplicateMessage }, 200);
    }

    return jsonResponse({ success: true, available: true, code: "AVAILABLE", field, normalizedValue: value, message: setting.availableMessage }, 200);
  } catch (error) {
    console.error("중복확인 API 오류:", error);
    return jsonResponse({ success: false, available: false, code: "INTERNAL_SERVER_ERROR", message: "중복확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }
}

export function onRequestGet() { return methodNotAllowed(); }
export function onRequestPut() { return methodNotAllowed(); }
export function onRequestPatch() { return methodNotAllowed(); }
export function onRequestDelete() { return methodNotAllowed(); }

function isValidBusinessNumber(value) {
  const digits = value.split("").map(Number);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3];
  let sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
  const ninth = digits[8] * 5;
  sum += Math.floor(ninth / 10) + (ninth % 10);
  return ((10 - (sum % 10)) % 10) === digits[9];
}

function methodNotAllowed() {
  return jsonResponse({ success: false, code: "METHOD_NOT_ALLOWED", message: "POST 방식으로 요청해 주세요." }, 405, { Allow: "POST" });
}

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...additionalHeaders } });
}
