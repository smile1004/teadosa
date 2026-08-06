(function (window) {
  'use strict';

  const JSON_HEADERS = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  async function request(path, options) {
    const config = Object.assign({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    }, options || {});

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
      config.headers = Object.assign({}, JSON_HEADERS, config.headers || {});
    }

    let response;
    try {
      response = await fetch(path, config);
    } catch (cause) {
      const error = new Error('서버와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      error.code = 'NETWORK_ERROR';
      error.cause = cause;
      throw error;
    }

    let result;
    try {
      result = await response.json();
    } catch (cause) {
      result = {
        success: false,
        code: 'INVALID_RESPONSE',
        message: '서버 응답을 확인할 수 없습니다.'
      };
    }

    return { response: response, result: result };
  }

  window.TaeDoSAApi = Object.freeze({ request: request });
})(window);
