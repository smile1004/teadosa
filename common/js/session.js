(function (window) {
  'use strict';
  window.TaeDoSASession = Object.freeze({
    get: function () { return window.TaeDoSAAuth.getSession(); },
    logout: function () { return window.TaeDoSAAuth.logout(); }
  });
})(window);
