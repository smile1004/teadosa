import bcrypt from "bcryptjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{4,20}$/;

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
     * 2. JSON 요청 확인
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
     * 3. 과도하게 큰 요청 차단
     */
    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (contentLength > 10_000) {
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
     * 4. JSON 읽기
     */
    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_JSON",
          message: "로그인 정보를 읽을 수 없습니다.",
        },
        400
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_REQUEST",
          message: "로그인 정보가 올바르지 않습니다.",
        },
        400
      );
    }

    /*
     * 5. 입력값 정리
     *
     * 로그인 화면의 name 값이 달라도 받을 수 있도록
     * 여러 필드명을 지원합니다.
     */
    const username = normalizeText(
      body.username ??
      body.userId ??
      body.user_id ??
      body.loginId
    ).toLowerCase();

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    /*
     * 6. 필수값 검사
     */
    if (!username || !password) {
      return jsonResponse(
        {
          success: false,
          code: "LOGIN_FIELDS_REQUIRED",
          message: "아이디와 비밀번호를 입력해 주세요.",
        },
        400
      );
    }

    /*
     * 비정상 입력은 DB 조회 전에 차단
     */
    if (!USERNAME_REGEX.test(username)) {
      return invalidCredentialsResponse();
    }

    if (
      password.length < 1 ||
      password.length > 64 ||
      new TextEncoder().encode(password).length > 72
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * 7. 회원 조회
     *
     * password_hash는 비밀번호 비교에만 사용하고
     * 응답에는 포함하지 않습니다.
     */
    const member = await env.DB.prepare(
      `
        SELECT
          id,
          member_type,
          username,
          email,
          password_hash,
          name,
          phone,
          company_name,
          business_number,
          approval_status,
          created_at,
          updated_at
        FROM members
        WHERE username = ?
        LIMIT 1
      `
    )
      .bind(username)
      .first();

    /*
     * 8. 아이디 존재 여부
     *
     * 존재하지 않는 아이디와 비밀번호 오류에
     * 같은 메시지를 반환하여 계정 존재 여부 노출을 줄입니다.
     */
    if (!member) {
      return invalidCredentialsResponse();
    }

    /*
     * 9. 비밀번호 비교
     */
    let passwordMatches = false;

    try {
      passwordMatches = await bcrypt.compare(
        password,
        member.password_hash
      );
    } catch (error) {
      console.error("비밀번호 해시 비교 오류:", error);

      return jsonResponse(
        {
          success: false,
          code: "INTERNAL_SERVER_ERROR",
          message:
            "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
        500
      );
    }

    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    /*
     * 10. 회원 승인 상태 확인
     */
    if (member.approval_status === "pending") {
      return jsonResponse(
        {
          success: false,
          code: "APPROVAL_PENDING",
          message:
            "기업회원 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.",
        },
        403
      );
    }

    if (member.approval_status === "rejected") {
      return jsonResponse(
        {
          success: false,
          code: "APPROVAL_REJECTED",
          message:
            "기업회원 가입 신청이 승인되지 않았습니다. 관리자에게 문의해 주세요.",
        },
        403
      );
    }

    if (member.approval_status === "suspended") {
      return jsonResponse(
        {
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "현재 이용이 제한된 계정입니다. 관리자에게 문의해 주세요.",
        },
        403
      );
    }

    if (member.approval_status !== "approved") {
      console.error(
        "알 수 없는 회원 승인 상태:",
        member.approval_status
      );

      return jsonResponse(
        {
          success: false,
          code: "ACCOUNT_NOT_AVAILABLE",
          message:
            "현재 로그인할 수 없는 계정입니다. 관리자에게 문의해 주세요.",
        },
        403
      );
    }

    /*
     * 11. 로그인 검증 성공
     *
     * 아직 세션 쿠키는 발급하지 않습니다.
     * 다음 단계에서 HttpOnly 세션을 연결합니다.
     */
    return jsonResponse(
      {
        success: true,
        code: "LOGIN_VERIFIED",
        message: "로그인 정보가 확인되었습니다.",
        member: {
          id: member.id,
          memberType: member.member_type,
          username: member.username,
          email: member.email,
          name: member.name,
          companyName: member.company_name,
          approvalStatus: member.approval_status,
        },
      },
      200
    );
  } catch (error) {
    console.error("로그인 API 오류:", error);

    return jsonResponse(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message:
          "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      500
    );
  }
}

/*
 * POST 이외 요청 차단
 */
export function onRequestGet() {
  return methodNotAllowed();
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

function invalidCredentialsResponse() {
  return jsonResponse(
    {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    },
    401
  );
}

function methodNotAllowed() {
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

function jsonResponse(
  data,
  status = 200,
  additionalHeaders = {}
) {
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
    .trim();
}