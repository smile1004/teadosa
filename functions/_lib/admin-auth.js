const SESSION_COOKIE_NAME = 'teadosa_session';

export async function requireAdmin(request, env) {
  if (!env.DB) {
    return { error: jsonResponse({ success: false, code: 'DATABASE_NOT_CONFIGURED', message: '회원 데이터베이스 연결이 설정되지 않았습니다.' }, 500) };
  }

  const sessionToken = getCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return { error: jsonResponse({ success: false, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' }, 401) };
  }

  const tokenHash = await sha256(sessionToken);
  const nowIso = new Date().toISOString();
  const session = await env.DB.prepare(`
    SELECT
      sessions.id AS session_id,
      sessions.expires_at,
      members.id AS member_id,
      members.username,
      members.name,
      members.role,
      members.approval_status
    FROM sessions
    INNER JOIN members ON members.id = sessions.member_id
    WHERE sessions.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!session) {
    return { error: jsonResponse({ success: false, code: 'INVALID_SESSION', message: '로그인이 필요합니다.' }, 401, { 'Set-Cookie': clearSessionCookie() }) };
  }

  if (session.expires_at <= nowIso) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.session_id).run();
    return { error: jsonResponse({ success: false, code: 'SESSION_EXPIRED', message: '로그인 시간이 만료되었습니다.' }, 401, { 'Set-Cookie': clearSessionCookie() }) };
  }

  if (session.approval_status !== 'approved') {
    return { error: jsonResponse({ success: false, code: 'ACCOUNT_NOT_APPROVED', message: '승인된 계정만 이용할 수 있습니다.' }, 403) };
  }

  if (session.role !== 'admin') {
    return { error: jsonResponse({ success: false, code: 'ADMIN_REQUIRED', message: '관리자 권한이 필요합니다.' }, 403) };
  }

  await env.DB.prepare('UPDATE sessions SET last_used_at = ? WHERE id = ?').bind(nowIso, session.session_id).run();
  return { admin: session };
}

export function jsonResponse(payload, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...additionalHeaders,
    },
  });
}

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(';')) {
    const index = cookie.indexOf('=');
    if (index === -1) continue;
    if (cookie.slice(0, index).trim() === name) return cookie.slice(index + 1).trim();
  }
  return null;
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function clearSessionCookie() {
  return [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'Secure', 'SameSite=Lax'].join('; ');
}
