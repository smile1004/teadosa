const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const SESSION_COOKIE_NAME = "teadosa_session";

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return jsonResponse(
        {
          success: false,
          authenticated: false,
          code: "DATABASE_NOT_CONFIGURED",
          message: "회원 데이터베이스 연결이 설정되지 않았습니다.",
        },
        500
      );
    }

    const sessionToken = getCookie(
      request.headers.get("cookie"),
      SESSION_COOKIE_NAME
    );

    if (!sessionToken) {
      return unauthenticatedResponse();
    }

    const tokenHash = await sha256(sessionToken);
    const nowIso = new Date().toISOString();

    const session = await env.DB.prepare(
      `
        SELECT
          sessions.id AS session_id,
          sessions.expires_at,
          members.id AS member_id,
          members.member_type,
          members.username,
          members.email,
          members.name,
          members.company_name,
          members.approval_status
        FROM sessions
        INNER JOIN members
          ON members.id = sessions.member_id
        WHERE sessions.token_hash = ?
        LIMIT 1
      `
    )
      .bind(tokenHash)
      .first();

    if (!session) {
      return unauthenticatedResponse(true, 'INVALID_SESSION');
    }

    if (session.expires_at <= nowIso) {
      await env.DB.prepare(
        `
          DELETE FROM sessions
          WHERE id = ?
        `
      )
        .bind(session.session_id)
        .run();

      return unauthenticatedResponse(true, 'SESSION_EXPIRED');
    }

    if (session.approval_status !== "approved") {
      await env.DB.prepare(
        `
          DELETE FROM sessions
          WHERE id = ?
        `
      )
        .bind(session.session_id)
        .run();

      return unauthenticatedResponse(true, 'ACCOUNT_NOT_APPROVED');
    }

    /*
     * 마지막 사용 시간 갱신
     * 매 요청마다 만료 기간을 연장하지는 않습니다.
     */
    await env.DB.prepare(
      `
        UPDATE sessions
        SET last_used_at = ?
        WHERE id = ?
      `
    )
      .bind(nowIso, session.session_id)
      .run();

    return jsonResponse(
      {
        success: true,
        authenticated: true,
        code: "AUTHENTICATED",
        member: {
          id: session.member_id,
          memberType: session.member_type,
          username: session.username,
          email: session.email,
          name: session.name,
          companyName: session.company_name,
          approvalStatus: session.approval_status,
        },
      },
      200
    );
  } catch (error) {
    console.error("로그인 상태 확인 오류:", error);

    return jsonResponse(
      {
        success: false,
        authenticated: false,
        code: "INTERNAL_SERVER_ERROR",
        message:
          "로그인 상태를 확인하는 중 오류가 발생했습니다.",
      },
      500
    );
  }
}

export function onRequestPost() {
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

function getCookie(cookieHeader, name) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie
      .slice(0, separatorIndex)
      .trim();

    if (cookieName !== name) {
      continue;
    }

    return cookie
      .slice(separatorIndex + 1)
      .trim();
  }

  return null;
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function unauthenticatedResponse(clearCookie = false, code = "UNAUTHENTICATED") {
  const additionalHeaders = clearCookie
    ? {
        "Set-Cookie": clearSessionCookie(),
      }
    : {};

  return jsonResponse(
    {
      success: false,
      authenticated: false,
      code,
      message: code === "SESSION_EXPIRED"
        ? "로그인 시간이 만료되었습니다."
        : "로그인이 필요합니다.",
    },
    401,
    additionalHeaders
  );
}

function clearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

function methodNotAllowed() {
  return jsonResponse(
    {
      success: false,
      authenticated: false,
      code: "METHOD_NOT_ALLOWED",
      message: "GET 방식으로 요청해 주세요.",
    },
    405,
    {
      Allow: "GET",
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