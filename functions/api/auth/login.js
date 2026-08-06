import bcrypt from "bcryptjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{6,20}$/;
const SESSION_COOKIE_NAME = "teadosa_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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

    const member = await env.DB.prepare(
      `
        SELECT
          id,
          member_type,
          username,
          email,
          password_hash,
          name,
          company_name,
          approval_status
        FROM members
        WHERE username = ?
        LIMIT 1
      `
    )
      .bind(username)
      .first();

    if (!member) {
      return invalidCredentialsResponse();
    }

    let passwordMatches = false;

    try {
      passwordMatches = await bcrypt.compare(
        password,
        member.password_hash
      );
    } catch (error) {
      console.error("비밀번호 해시 비교 오류:", error);

      return internalErrorResponse();
    }

    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    const statusResponse = approvalStatusResponse(member);

    if (statusResponse) {
      return statusResponse;
    }

    /*
     * 로그인 성공 시 기존 만료 세션 정리
     */
    const now = new Date();
    const nowIso = now.toISOString();

    await env.DB.prepare(
      `
        DELETE FROM sessions
        WHERE expires_at <= ?
      `
    )
      .bind(nowIso)
      .run();

    /*
     * 보안상 충분한 랜덤 세션 토큰 생성
     */
    const sessionToken = createSessionToken();
    const tokenHash = await sha256(sessionToken);

    const expiresAt = new Date(
      now.getTime() + SESSION_MAX_AGE_SECONDS * 1000
    ).toISOString();

    const userAgent = sanitizeHeaderValue(
      request.headers.get("user-agent"),
      500
    );

    const ipAddress = sanitizeHeaderValue(
      request.headers.get("cf-connecting-ip"),
      100
    );

    /*
     * 한 회원이 사용할 수 있는 활성 세션 수 제한
     * 오래된 세션부터 정리합니다.
     */
    await env.DB.prepare(
      `
        DELETE FROM sessions
        WHERE member_id = ?
          AND id NOT IN (
            SELECT id
            FROM sessions
            WHERE member_id = ?
              AND expires_at > ?
            ORDER BY created_at DESC
            LIMIT 4
          )
      `
    )
      .bind(member.id, member.id, nowIso)
      .run();

    const insertResult = await env.DB.prepare(
      `
        INSERT INTO sessions (
          member_id,
          token_hash,
          expires_at,
          created_at,
          last_used_at,
          user_agent,
          ip_address
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        member.id,
        tokenHash,
        expiresAt,
        nowIso,
        nowIso,
        userAgent,
        ipAddress
      )
      .run();

    if (!insertResult.success) {
      throw new Error("세션 저장에 실패했습니다.");
    }

    return jsonResponse(
      {
        success: true,
        code: "LOGIN_SUCCESS",
        message: "로그인되었습니다.",
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
      200,
      {
        "Set-Cookie": createSessionCookie(
          sessionToken,
          SESSION_MAX_AGE_SECONDS
        ),
      }
    );
  } catch (error) {
    console.error("로그인 API 오류:", error);

    return internalErrorResponse();
  }
}

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

function approvalStatusResponse(member) {
  if (member.approval_status === "approved") {
    return null;
  }

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

function createSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded
  );

  return bytesToHex(new Uint8Array(digest));
}

function createSessionCookie(token, maxAge) {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeHeaderValue(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }

  const sanitized = value
    .replace(/[\r\n\0]/g, "")
    .trim()
    .slice(0, maxLength);

  return sanitized || null;
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

function internalErrorResponse() {
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