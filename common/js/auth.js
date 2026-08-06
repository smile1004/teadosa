(function (window) {
  'use strict';

  const JSON_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  async function request(path, options) {
    const config = Object.assign({
      method: 'GET',
      credentials: 'same-origin',
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

    return { response, result };
  }

  async function signup(payload) {
    return request('/api/auth/signup', { method: 'POST', body: payload });
  }

  async function login(payload) {
    return request('/api/auth/login', { method: 'POST', body: payload });
  }

  async function logout() {
    return request('/api/auth/logout', { method: 'POST' });
  }

  async function getSession() {
    return request('/api/auth/me', { method: 'GET' });
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
    checkDuplicate: checkDuplicate
  });
})(window);
