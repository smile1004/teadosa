import bcrypt from "bcryptjs";
import { createAdminNotification } from '../../_lib/admin-notification.js';

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{9,11}$/;
const BUSINESS_NUMBER_REGEX = /^[0-9]{10}$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    /*
     * 1. D1 Binding 확인
     */
    if (!env.DB) {
      console.error("D1 Binding DB가 설정되지 않았습니다.");

      return jsonResponse(
        {
          success: false,
          code: "DATABASE_NOT_CONFIGURED",
          message: "회원 데이터베이스 연결이 설정되지 않았습니다.",
        },
        500
      );
    }

    /*
     * 2. JSON 요청인지 확인
     */
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_CONTENT_TYPE",
          message: "요청 형식이 올바르지 않습니다.",
        },
        415
      );
    }

    /*
     * 비정상적으로 큰 요청 차단
     */
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > 20_000) {
      return jsonResponse(
        {
          success: false,
          code: "PAYLOAD_TOO_LARGE",
          message: "요청 데이터가 너무 큽니다.",
        },
        413
      );
    }

    /*
     * 3. JSON 읽기
     */
    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_JSON",
          message: "회원가입 정보를 읽을 수 없습니다.",
        },
        400
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_REQUEST",
          message: "회원가입 정보가 올바르지 않습니다.",
        },
        400
      );
    }

    /*
     * 4. 입력값 정리
     *
     * 회원가입 HTML의 name 값이 조금 달라도 받을 수 있도록
     * 여러 이름을 함께 지원합니다.
     */
    const memberType = normalizeText(
      body.memberType ?? body.member_type ?? body.userType
    ).toLowerCase();

    const username = normalizeText(
      body.username ?? body.userId ?? body.user_id ?? body.loginId
    ).toLowerCase();

    const email = normalizeText(body.email).toLowerCase();

    const password =
      typeof body.password === "string" ? body.password : "";

    const passwordConfirm =
      typeof body.passwordConfirm === "string"
        ? body.passwordConfirm
        : typeof body.password_confirm === "string"
          ? body.password_confirm
          : "";

    const name = normalizeText(
      body.name ?? body.userName ?? body.user_name
    );

    const phone = normalizeDigits(
      body.phone ?? body.mobile ?? body.phoneNumber
    );

    const companyName = normalizeText(
      body.companyName ?? body.company_name
    );

    const businessNumber = normalizeDigits(
      body.businessNumber ??
        body.business_number ??
        body.businessRegistrationNumber
    );

    const postalCode = normalizeText(body.postalCode ?? body.postcode);
    const address = normalizeText(body.address);
    const addressDetail = normalizeText(body.addressDetail ?? body.address_detail);
    const ceoName = normalizeText(body.ceoName ?? body.ceo_name);
    const businessType = normalizeText(body.businessType ?? body.business_type);
    const businessItem = normalizeText(body.businessItem ?? body.business_item);
    const department = normalizeText(body.department);
    const officePhone = normalizeText(body.officePhone ?? body.office_phone)
      .replace(/[^0-9-]/g, "")
      .slice(0, 20);

    /*
     * 5. 개인회원 / 기업회원 구분
     */
    if (!["personal", "business"].includes(memberType)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_MEMBER_TYPE",
          message: "회원 유형을 확인해 주세요.",
        },
        400
      );
    }

    /*
     * 6. 공통 필수값 검사
     */
    if (!username || !email || !password || !name || !phone) {
      return jsonResponse(
        {
          success: false,
          code: "REQUIRED_FIELDS_MISSING",
          message: "필수 입력 항목을 모두 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 7. 아이디 검사
     */
    if (!USERNAME_REGEX.test(username)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_USERNAME",
          message:
            "아이디는 영문, 숫자, 밑줄, 하이픈을 사용하여 6~20자로 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 8. 이메일 검사
     */
    if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_EMAIL",
          message: "올바른 이메일 주소를 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 9. 이름 검사
     */
    if (name.length < 2 || name.length > 50) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_NAME",
          message: "이름은 2~50자로 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 10. 휴대전화번호 검사
     */
    if (!PHONE_REGEX.test(phone)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_PHONE",
          message: "휴대전화번호를 정확하게 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 11. 비밀번호 검사
     *
     * bcrypt는 72바이트까지만 안전하게 처리하므로
     * UTF-8 기준으로 길이를 함께 제한합니다.
     */
    if (!isValidPassword(password)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_PASSWORD",
          message:
            "비밀번호는 영문, 숫자, 특수문자를 포함하여 8~64자로 입력해 주세요.",
        },
        400
      );
    }

    if (passwordConfirm && password !== passwordConfirm) {
      return jsonResponse(
        {
          success: false,
          code: "PASSWORD_MISMATCH",
          message: "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
        },
        400
      );
    }

    /*
     * 12. 기업회원 추가 검사
     */
    if (memberType === "business") {
      if (!companyName) {
        return jsonResponse(
          {
            success: false,
            code: "COMPANY_NAME_REQUIRED",
            message: "기업명을 입력해 주세요.",
          },
          400
        );
      }

      if (companyName.length > 100) {
        return jsonResponse(
          {
            success: false,
            code: "INVALID_COMPANY_NAME",
            message: "기업명은 100자 이내로 입력해 주세요.",
          },
          400
        );
      }

      if (!BUSINESS_NUMBER_REGEX.test(businessNumber) || !isValidBusinessNumber(businessNumber)) {
        return jsonResponse(
          {
            success: false,
            code: "INVALID_BUSINESS_NUMBER",
            field: "businessNumber",
            message: "사업자등록번호 10자리를 정확하게 입력해 주세요.",
          },
          400
        );
      }

      if (!postalCode || !address) {
        return jsonResponse(
          { success: false, code: "BUSINESS_ADDRESS_REQUIRED", field: "address", message: "사업장 주소를 검색해 입력해 주세요." },
          400
        );
      }
    }

    if (postalCode.length > 10 || address.length > 200 || addressDetail.length > 200) {
      return jsonResponse({ success: false, code: "INVALID_ADDRESS", field: "address", message: "주소 입력값이 너무 깁니다." }, 400);
    }

    /*
     * 개인회원은 사업자 정보를 저장하지 않음
     */
    const savedCompanyName =
      memberType === "business" ? companyName : null;

    const savedBusinessNumber =
      memberType === "business" ? businessNumber : null;

    /*
     * 13. 중복 검사
     */
    const duplicateMember = await env.DB.prepare(
      `
        SELECT
          username,
          email,
          business_number
        FROM members
        WHERE username = ?
           OR email = ?
           OR (
             ? IS NOT NULL
             AND business_number = ?
           )
        LIMIT 1
      `
    )
      .bind(
        username,
        email,
        savedBusinessNumber,
        savedBusinessNumber
      )
      .first();

    if (duplicateMember) {
      if (duplicateMember.username === username) {
        return jsonResponse(
          {
            success: false,
            code: "USERNAME_ALREADY_EXISTS",
            field: "username",
            message: "이미 사용 중인 아이디입니다.",
          },
          409
        );
      }

      if (duplicateMember.email === email) {
        return jsonResponse(
          {
            success: false,
            code: "EMAIL_ALREADY_EXISTS",
            field: "email",
            message: "이미 가입된 이메일입니다.",
          },
          409
        );
      }

      if (
        savedBusinessNumber &&
        duplicateMember.business_number === savedBusinessNumber
      ) {
        return jsonResponse(
          {
            success: false,
            code: "BUSINESS_NUMBER_ALREADY_EXISTS",
            field: "businessNumber",
            message: "이미 등록된 사업자등록번호입니다.",
          },
          409
        );
      }
    }

    /*
     * 14. 비밀번호 해시 생성
     *
     * 원문 비밀번호는 데이터베이스에 저장하지 않습니다.
     */
    const passwordHash = await bcrypt.hash(password, 10);

    /*
     * 개인회원: 즉시 승인
     * 기업회원: 관리자 승인 대기
     */
    const approvalStatus =
      memberType === "personal" ? "approved" : "pending";

    const createdAt = new Date().toISOString();

    /*
     * 15. D1 저장
     *
     * prepare + bind 방식으로 SQL Injection을 방지합니다.
     */
    const insertResult = await env.DB.prepare(
      `
        INSERT INTO members (
          member_type,
          username,
          email,
          password_hash,
          name,
          phone,
          company_name,
          business_number,
          postal_code,
          address,
          address_detail,
          ceo_name,
          business_type,
          business_item,
          department,
          office_phone,
          approval_status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        memberType,
        username,
        email,
        passwordHash,
        name,
        phone,
        savedCompanyName,
        savedBusinessNumber,
        postalCode || null,
        address || null,
        addressDetail || null,
        memberType === "business" ? (ceoName || null) : null,
        memberType === "business" ? (businessType || null) : null,
        memberType === "business" ? (businessItem || null) : null,
        memberType === "business" ? (department || null) : null,
        memberType === "business" ? (officePhone || null) : null,
        approvalStatus,
        createdAt,
        createdAt
      )
      .run();

    if (!insertResult.success) {
      throw new Error("회원정보 저장에 실패했습니다.");
    }

    const memberId = Number(insertResult.meta?.last_row_id || 0);
    await createAdminNotification(env, {
      type: 'member_signup',
      title: memberType === 'business' ? '새 기업회원 가입' : '새 개인회원 가입',
      message: (name || username) + ' 회원이 가입했습니다.',
      linkUrl: '/admin/members/detail/?id=' + encodeURIComponent(memberId),
      entityType: 'member', entityId: memberId
    });

    /*
     * 비밀번호 해시 등 민감한 정보는 응답하지 않습니다.
     */
    return jsonResponse(
      {
        success: true,
        code: "SIGNUP_SUCCESS",
        message:
          memberType === "personal"
            ? "회원가입이 완료되었습니다."
            : "기업회원 가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
        member: {
          id: memberId || null,
          memberType,
          username,
          email,
          name,
          approvalStatus,
        },
      },
      201
    );
  } catch (error) {
    console.error("회원가입 API 오류:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    /*
     * 동시 요청으로 사전 중복 검사를 통과한 경우에도
     * DB UNIQUE 제약조건으로 최종 차단합니다.
     */
    if (
      errorMessage.includes("UNIQUE constraint failed") ||
      errorMessage.includes("SQLITE_CONSTRAINT")
    ) {
      return jsonResponse(
        {
          success: false,
          code: "DUPLICATE_MEMBER",
          message:
            "이미 등록된 아이디, 이메일 또는 사업자등록번호가 있습니다.",
        },
        409
      );
    }

    return jsonResponse(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message:
          "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      500
    );
  }
}

/*
 * POST 이외의 요청 차단
 */
export function onRequestGet() {
  return jsonResponse(
    {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "POST 방식으로 요청해 주세요.",
    },
    405,
    {
      Allow: "POST",
    }
  );
}

export function onRequestPut() {
  return methodNotAllowed();
}

export function onRequestPatch() {
  return methodNotAllowed();
}

export function onRequestDelete() {
  return methodNotAllowed();
}

function methodNotAllowed() {
  return jsonResponse(
    {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "허용되지 않은 요청 방식입니다.",
    },
    405,
    {
      Allow: "POST",
    }
  );
}

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...additionalHeaders,
    },
  });
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDigits(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).replace(/\D/g, "");
}

function isValidBusinessNumber(value) {
  const digits = value.split("").map(Number);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3];
  let sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
  const ninth = digits[8] * 5;
  sum += Math.floor(ninth / 10) + (ninth % 10);
  return ((10 - (sum % 10)) % 10) === digits[9];
}

function isValidPassword(password) {
  if (typeof password !== "string") {
    return false;
  }

  if (password.length < 8 || password.length > 64) {
    return false;
  }

  const passwordByteLength =
    new TextEncoder().encode(password).length;

  if (passwordByteLength > 72) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialCharacter =
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  return hasLetter && hasNumber && hasSpecialCharacter;
}
