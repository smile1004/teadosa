(function (window) {
  'use strict';

  const api = window.TaeDoSAApi;
  if (!api) return;

  let sessionPromise = null;
  let currentMember = null;

  const request = api.request;

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

  async function updateProfile(payload) {
    const outcome = await request('/api/auth/profile', { method: 'PUT', body: payload });
    if (outcome.response.ok && outcome.result && outcome.result.success && outcome.result.member) {
      sessionPromise = null;
      announce(outcome.result.member, 'PROFILE_UPDATED');
    }
    return outcome;
  }

  async function changePassword(payload) {
    return request('/api/auth/password', { method: 'PUT', body: payload });
  }


  async function getAdminSummary() {
    return request('/api/admin/summary', { method: 'GET' });
  }

  async function getAdminMembers(params) {
    const query = new URLSearchParams(params || {});
    return request('/api/admin/members?' + query.toString(), { method: 'GET' });
  }

  async function getAdminMember(memberId) {
    return request('/api/admin/members/' + encodeURIComponent(memberId), { method: 'GET' });
  }

  async function updateMemberApproval(memberId, approvalStatus) {
    return request('/api/admin/members/' + encodeURIComponent(memberId) + '/approval', {
      method: 'PUT',
      body: { approvalStatus: approvalStatus }
    });
  }


  async function getAdminPrecheckRequests(params) {
    const query = new URLSearchParams(params || {});
    return request('/api/admin/precheck?' + query.toString(), { method: 'GET' });
  }

  async function updateAdminPrecheckStatus(requestId, status, supplementNote) {
    return request('/api/admin/precheck/' + encodeURIComponent(requestId) + '/status', {
      method: 'PUT',
      body: {
        status: status,
        supplementNote: supplementNote || ''
      }
    });
  }

  async function getAdminPrecheckDetail(requestId) {
    return request('/api/admin/precheck/' + encodeURIComponent(requestId), { method: 'GET' });
  }

  async function saveAdminPrecheckReview(requestId, payload) {
    return request('/api/admin/precheck/' + encodeURIComponent(requestId) + '/review', {
      method: 'PUT',
      body: payload
    });
  }

  async function getPrecheckResult(requestId) {
    const query = requestId ? ('?id=' + encodeURIComponent(requestId)) : '';
    return request('/api/precheck/result' + query, { method: 'GET' });
  }

  async function getMyPrecheckRequests() {
    return request('/api/precheck/my-requests', { method: 'GET' });
  }

  async function createPrecheckRequest(payload) {
    return request('/api/precheck/create', { method: 'POST', body: payload });
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
    updateProfile: updateProfile,
    changePassword: changePassword,
    getAdminSummary: getAdminSummary,
    getAdminMembers: getAdminMembers,
    getAdminMember: getAdminMember,
    updateMemberApproval: updateMemberApproval,
    getAdminPrecheckRequests: getAdminPrecheckRequests,
    updateAdminPrecheckStatus: updateAdminPrecheckStatus,
    getAdminPrecheckDetail: getAdminPrecheckDetail,
    saveAdminPrecheckReview: saveAdminPrecheckReview,
    getPrecheckResult: getPrecheckResult,
    getMyPrecheckRequests: getMyPrecheckRequests,
    createPrecheckRequest: createPrecheckRequest,
    checkDuplicate: checkDuplicate
  });
})(window);
