(function (window) {
  'use strict';

  if (!window.TaeDoSAAuth) return;

  window.TaeDoSASession = Object.freeze({
    get: function (options) { return window.TaeDoSAAuth.getSession(options); },
    require: function (options) { return window.TaeDoSAAuth.requireAuth(options); },
    logout: function () { return window.TaeDoSAAuth.logout(); },
    current: function () { return window.TaeDoSAAuth.getCurrentMember(); },
    onChange: function (handler) {
      if (typeof handler !== 'function') return function () {};
      window.addEventListener('teadosa:authchange', handler);
      return function () { window.removeEventListener('teadosa:authchange', handler); };
    }
  });
})(window);
