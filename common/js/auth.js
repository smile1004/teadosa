(function (window) {
  'use strict';

  const JSON_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  let sessionPromise = null;
  let currentMember = null;

  async function request(path, options) {
    const config = Object.assign({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    }, options || {});

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
      config.headers = Object.assign({}, JSON_HEADERS, config.headers || {});
    }

    let response;
    try {
      response = await fetch(path, config);
    } catch (error) {
      const networkError = new Error('서버와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      networkError.code = 'NETWORK_ERROR';
      networkError.cause = error;
      throw networkError;
    }

    let result = null;
    try {
      result = await response.json();
    } catch (error) {
      result = { success: false, code: 'INVALID_RESPONSE', message: '서버 응답을 확인할 수 없습니다.' };
    }

    return { response: response, result: result };
  }

  function announce(member, reason) {
    currentMember = member || null;
    window.dispatchEvent(new CustomEvent('teadosa:authchange', {
      detail: {
        authenticated: Boolean(member),
        member: member || null,
        reason: reason || null
      }
    }));
  }

  async function signup(payload) {
    return request('/api/auth/signup', { method: 'POST', body: payload });
  }

  async function login(payload) {
    const outcome = await request('/api/auth/login', { method: 'POST', body: payload });
    if (outcome.response.ok && outcome.result && outcome.result.success) {
      sessionPromise = null;
    }
    return outcome;
  }

  async function logout() {
    const outcome = await request('/api/auth/logout', { method: 'POST' });
    sessionPromise = null;
    announce(null, 'LOGOUT');
    return outcome;
  }

  function getSession(options) {
    const force = Boolean(options && options.force);
    if (!force && sessionPromise) return sessionPromise;

    sessionPromise = request('/api/auth/me', { method: 'GET' })
      .then(function (outcome) {
        const result = outcome.result || {};
        if (outcome.response.ok && result.authenticated && result.member) {
          announce(result.member, 'AUTHENTICATED');
        } else {
          announce(null, result.code || 'UNAUTHENTICATED');
        }
        return outcome;
      })
      .catch(function (error) {
        sessionPromise = null;
        throw error;
      });

    return sessionPromise;
  }

  async function requireAuth(options) {
    const settings = Object.assign({
      loginPath: '/login/',
      nextPath: window.location.pathname + window.location.search,
      redirect: true
    }, options || {});

    const outcome = await getSession({ force: true });
    const result = outcome.result || {};

    if (outcome.response.ok && result.authenticated && result.member) {
      return result.member;
    }

    if (settings.redirect) {
      const params = new URLSearchParams();
      params.set('next', settings.nextPath);
      params.set('reason', result.code === 'SESSION_EXPIRED' ? 'session-expired' : 'login-required');
      window.location.replace(settings.loginPath + '?' + params.toString());
    }

    return null;
  }

  async function checkDuplicate(field, value) {
    return request('/api/auth/check-duplicate', {
      method: 'POST',
      body: { field: field, value: value }
    });
  }

  window.TaeDoSAAuth = Object.freeze({
    request: request,
    signup: signup,
    login: login,
    logout: logout,
    getSession: getSession,
    requireAuth: requireAuth,
    getCurrentMember: function () { return currentMember; },
    checkDuplicate: checkDuplicate
  });
})(window);
