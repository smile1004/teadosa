(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  window.addEventListener('teadosa:adminready', loadDashboard, { once: true });

  async function loadDashboard() {
    const message = document.getElementById('dashboard-message');
    try {
      const outcome = await auth.getAdminSummary();
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '관리 현황을 불러오지 못했습니다.');

      setText('dashboard-total-members', result.summary.totalMembers);
      setText('dashboard-personal-members', result.summary.personalMembers);
      setText('dashboard-business-members', result.summary.businessMembers);
      setText('dashboard-pending-members', result.summary.pendingBusinessMembers);
      renderServices(result.services || {});
      if (message) message.hidden = true;
    } catch (error) {
      if (message) {
        message.hidden = false;
        message.classList.add('error');
        message.textContent = error.message || '관리 현황을 불러오지 못했습니다.';
      }
    }
  }

  const SERVICE_FIELDS = {
    cs: [['total', 'total'], ['waiting', 'waiting'], ['inprogress', 'inProgress'], ['done', 'done']],
    precheck: [['total', 'total'], ['received', 'received'], ['reviewing', 'reviewing'], ['supplement', 'supplementRequired'], ['completed', 'completed']],
    license: [['total', 'total'], ['received', 'received'], ['consulting', 'consulting'], ['active', 'active'], ['completed', 'completed']],
    development: [['total', 'total'], ['received', 'received'], ['consulting', 'consulting'], ['active', 'active'], ['completed', 'completed']],
    ppa: [['total', 'total'], ['received', 'received'], ['consulting', 'consulting'], ['active', 'active'], ['completed', 'completed']],
    constructionPlan: [['total', 'total'], ['received', 'received'], ['consulting', 'consulting'], ['active', 'active'], ['completed', 'completed']],
  };

  function renderServices(services) {
    Object.keys(SERVICE_FIELDS).forEach(function (key) {
      const data = services[key] || {};
      const slug = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      SERVICE_FIELDS[key].forEach(function (pair) {
        setText('dashboard-svc-' + slug + '-' + pair[0], data[pair[1]]);
      });
    });
  }

  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = Number(value || 0).toLocaleString('ko-KR'); }
})(window, document);
