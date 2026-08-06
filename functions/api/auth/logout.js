const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

const SESSION_COOKIE_NAME = "teadosa_session";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const sessionToken = getCookie(
      request.headers.get("cookie"),
      SESSION_COOKIE_NAME
    );

    if (env.DB && sessionToken) {
      const tokenHash = await sha256(sessionToken);

      await env.DB.prepare(
        `
          DELETE FROM sessions
          WHERE token_hash = ?
        `
      )
        .bind(tokenHash)
        .run();
    }

    return jsonResponse(
      {
        success: true,
        code: "LOGOUT_SUCCESS",
        message: "로그아웃되었습니다.",
      },
      200,
      {
        "Set-Cookie": clearSessionCookie(),
      }
    );
  } catch (error) {
    console.error("로그아웃 오류:", error);

    /*
     * DB 삭제에 실패해도 브라우저 쿠키는 제거합니다.
     */
    return jsonResponse(
      {
        success: true,
        code: "LOGOUT_SUCCESS",
        message: "로그아웃되었습니다.",
      },
      200,
      {
        "Set-Cookie": clearSessionCookie(),
      }
    );
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