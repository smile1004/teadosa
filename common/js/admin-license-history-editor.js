(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const container = document.getElementById('license-status-history');
  const requestId = Number(new URLSearchParams(window.location.search).get('id'));
  if (!auth || !container || !requestId) return;

  let decorating = false;
  const observer = new MutationObserver(scheduleDecorate);
  observer.observe(container, { childList: true });
  scheduleDecorate();

  function scheduleDecorate() {
    if (decorating || !container.querySelector('article:not([data-history-editor])')) return;
    window.setTimeout(decorate, 0);
  }

  async function decorate() {
    if (decorating) return;
    decorating = true;
    try {
      const outcome = await auth.getAdminLicenseDetail(requestId);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) return;
      const articles = Array.from(container.querySelectorAll('article'));
      (result.history || []).forEach(function (history, index) {
        const article = articles[index];
        if (!article || article.dataset.historyEditor) return;
        article.dataset.historyEditor = 'true';
        article.dataset.historyId = history.id;
        const summary = article.querySelector(':scope > div');
        if (!summary) return;
        summary.classList.add('license-history-summary');
        const actions = document.createElement('div');
        actions.className = 'license-history-actions';
        actions.innerHTML = '<button class="history-edit-button" type="button">수정</button><button class="history-delete-button" type="button">삭제</button>';
        summary.appendChild(actions);
        article.appendChild(createEditForm(history));
        actions.querySelector('.history-edit-button').addEventListener('click', function () { toggleForm(article, true); });
        actions.querySelector('.history-delete-button').addEventListener('click', function () { deleteHistory(article, history); });
      });
    } finally {
      decorating = false;
    }
  }

  function createEditForm(history) {
    const form = document.createElement('form');
    form.className = 'license-history-edit-form';
    form.hidden = true;
    form.innerHTML = '<label><span>처리상태</span><select name="status">' + statusOptions(history.toStatus) + '</select></label>' +
      '<label><span>처리일시</span><input name="changedAt" type="datetime-local" required value="' + escapeHtml(toDateTimeLocal(history.changedAt)) + '"></label>' +
      '<label><span>고객 안내</span><textarea name="customerNotice" rows="4" maxlength="2000">' + escapeHtml(history.customerNotice || '') + '</textarea></label>' +
      '<p class="license-history-edit-message" hidden></p><div class="license-history-form-actions"><button class="admin-button primary" type="submit">수정 저장</button><button class="admin-button secondary history-cancel-button" type="button">취소</button></div>';
    form.addEventListener('submit', function (event) { updateHistory(event, history.id); });
    form.querySelector('.history-cancel-button').addEventListener('click', function () { form.hidden = true; });
    return form;
  }

  async function updateHistory(event, historyId) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveButton = form.querySelector('[type="submit"]');
    const message = form.querySelector('.license-history-edit-message');
    saveButton.disabled = true;
    saveButton.textContent = '저장 중...';
    showMessage(message, '수정 내용을 저장하고 있습니다.');
    try {
      const localDate = form.elements.changedAt.value;
      const payload = { status: form.elements.status.value, changedAt: new Date(localDate).toISOString(), customerNotice: form.elements.customerNotice.value.trim() };
      const outcome = await auth.request('/api/admin/license/' + encodeURIComponent(requestId) + '/history/' + encodeURIComponent(historyId), { method:'PUT', body:payload });
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '처리이력을 수정하지 못했습니다.');
      window.location.reload();
    } catch (error) {
      showMessage(message, error.message || '처리이력 수정 중 오류가 발생했습니다.', true);
      saveButton.disabled = false;
      saveButton.textContent = '수정 저장';
    }
  }

  async function deleteHistory(article, history) {
    if (!window.confirm(label(history.toStatus) + ' 처리이력을 삭제하시겠습니까?\n삭제하면 마이페이지에서도 해당 기록이 사라집니다.')) return;
    const button = article.querySelector('.history-delete-button');
    button.disabled = true;
    button.textContent = '삭제 중...';
    try {
      const outcome = await auth.request('/api/admin/license/' + encodeURIComponent(requestId) + '/history/' + encodeURIComponent(history.id), { method:'DELETE' });
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '처리이력을 삭제하지 못했습니다.');
      window.location.reload();
    } catch (error) {
      window.alert(error.message || '처리이력 삭제 중 오류가 발생했습니다.');
      button.disabled = false;
      button.textContent = '삭제';
    }
  }

  function toggleForm(article, show) { const form = article.querySelector('.license-history-edit-form'); if (form) { form.hidden = !show; if (show) form.querySelector('select').focus(); } }
  function statusOptions(selected) { return [['received','접수'],['consulting','상담중'],['contracted','계약완료'],['documents','서류준비'],['submitted','허가접수'],['supplement_required','보완요청'],['completed','허가완료'],['cancelled','취소']].map(function (item) { return '<option value="' + item[0] + '"' + (item[0] === selected ? ' selected' : '') + '>' + item[1] + '</option>'; }).join(''); }
  function label(status) { return ({received:'접수',consulting:'상담중',contracted:'계약완료',documents:'서류준비',submitted:'허가접수',supplement_required:'보완요청',completed:'허가완료',cancelled:'취소'})[status] || status; }
  function toDateTimeLocal(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0,16); }
  function showMessage(element, text, error) { element.hidden = false; element.textContent = text; element.classList.toggle('error', Boolean(error)); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (character) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]; }); }
})(window, document);
