(function () {
  'use strict';
  const types = ['precheck', 'license', 'development', 'ppa', 'construction-plan'];
  const admin = location.pathname.startsWith('/admin/');
  const api = window.TaeDoSAApi;
  if (!api) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  function buttons(type, id) {
    if (!types.includes(type) || !/^[1-9]\d*$/.test(String(id))) return '';
    return '<span class="application-actions"><button type="button" data-application-action="edit" data-type="' + type + '" data-id="' + id + '">수정</button><button type="button" class="application-delete" data-application-action="delete" data-type="' + type + '" data-id="' + id + '">삭제</button></span>';
  }
  window.TaeDoSAApplicationActions = { buttons };
  const dialog = document.createElement('dialog');
  dialog.className = 'application-dialog';
  dialog.setAttribute('aria-labelledby', 'application-dialog-title');
  document.body.append(dialog);
  let busy = false;
  let loadVersion = 0;
  dialog.addEventListener('close', () => { loadVersion++; });
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  document.addEventListener('click', async e => {
    const trigger = e.target.closest('[data-application-action]');
    if (!trigger || trigger.disabled || dialog.open) return;
    const version = ++loadVersion;
    const type = trigger.dataset.type, id = trigger.dataset.id, deleting = trigger.dataset.applicationAction === 'delete';
    const url = '/api/' + (admin ? 'admin/' : '') + 'applications/' + type + '/' + id;
    dialog.innerHTML = '<h2 id="application-dialog-title">신청' + (deleting ? ' 삭제' : '내용 수정') + '</h2><p role="status">신청내용을 불러오고 있습니다.</p><button type="button" data-close>닫기</button>';
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.showModal();
    try {
      const out = await api.request(url);
      if (!out.response.ok || !out.result.success) throw Error(out.result.message || '신청을 불러오지 못했습니다.');
      if (!dialog.open || version !== loadVersion) return;
      const item = out.result.request;
      const fields = out.result.fields;
      dialog.innerHTML = '<form><h2 id="application-dialog-title">신청' + (deleting ? ' 삭제' : '내용 수정') + '</h2><p class="application-number">' + esc(item.requestNo) + '</p>' +
        (deleting ? '<p>이 신청내역을 삭제하시겠습니까? 신청서와 처리이력·검토결과가 함께 삭제되며 복구할 수 없습니다.</p>' :
          '<div class="application-fields">' + fields.map(f => '<label><span>' + esc(f.label) + (f.required ? ' *' : '') + '</span>' +
            (f.type === 'textarea' ? '<textarea rows="4" name="' + f.key + '" maxlength="' + f.max + '">' + esc(item.values[f.key]) + '</textarea>' : '<input name="' + f.key + '" type="' + (f.type || 'text') + '" maxlength="' + f.max + '"' + (f.required ? ' required' : '') + ' value="' + esc(item.values[f.key]) + '">') + '</label>').join('') + '</div>') +
        '<p class="application-feedback" role="status" aria-live="polite"></p><div class="application-dialog-actions"><button type="button" data-close>취소</button><button type="submit" class="' + (deleting ? 'application-delete' : 'application-save') + '">' + (deleting ? '삭제' : '변경사항 저장') + '</button></div></form>';
      dialog.querySelector('[data-close]').onclick = () => dialog.close();
      dialog.querySelector(deleting ? '[data-close]' : 'input').focus();
      dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        if (busy) return;
        busy = true;
        const feedback = dialog.querySelector('.application-feedback');
        const controls = [...dialog.querySelectorAll('button')];
        controls.forEach(b => { b.disabled = true; });
        feedback.textContent = deleting ? '삭제하고 있습니다.' : '저장하고 있습니다.';
        try {
          const payload = { updatedAt: item.updatedAt };
          if (!deleting) payload.values = Object.fromEntries(new FormData(event.target));
          const saved = await api.request(url, { method: deleting ? 'DELETE' : 'PUT', body: payload });
          if (!saved.response.ok || !saved.result.success) throw Error(saved.result.message || '처리하지 못했습니다.');
          try { sessionStorage.setItem('application-action-notice', saved.result.message); } catch {}
          if (deleting && location.pathname.replace(/index\.html$/, '') === '/admin/' + type + '/detail/') location.assign('/admin/' + type + '/');
          else location.reload();
        } catch (error) {
          feedback.textContent = error.message;
          controls.forEach(b => { b.disabled = false; });
        } finally { busy = false; }
      };
    } catch (error) { if (dialog.open && version === loadVersion) dialog.querySelector('[role="status"]').textContent = error.message; }
  });
  let notice;
  try { notice = sessionStorage.getItem('application-action-notice'); sessionStorage.removeItem('application-action-notice'); } catch {}
  if (notice) {
    const banner = document.createElement('p');
    banner.className = 'application-toast'; banner.setAttribute('role', 'status'); banner.textContent = notice;
    document.body.append(banner); setTimeout(() => banner.remove(), 6000);
  }
  if (admin) {
    function attach() {
      document.querySelectorAll('a[href*="/admin/"][href*="/detail/?id="]').forEach(link => {
        if (link.dataset.applicationActionsAttached) return;
        const url = new URL(link.href), match = url.pathname.match(/^\/admin\/([^/]+)\/detail\/(?:index\.html)?$/);
        if (!match || !types.includes(match[1])) return;
        link.dataset.applicationActionsAttached = 'true';
        link.insertAdjacentHTML('afterend', buttons(match[1], url.searchParams.get('id')));
      });
      const match = location.pathname.match(/^\/admin\/([^/]+)\/detail\/(?:index\.html)?$/);
      const head = document.querySelector('#admin-protected-content .admin-page-head');
      if (match && head && !head.querySelector('.application-actions')) head.insertAdjacentHTML('beforeend', buttons(match[1], new URLSearchParams(location.search).get('id')));
    }
    attach();
    new MutationObserver(attach).observe(document.querySelector('.admin-main') || document.body, { childList: true, subtree: true });
  }
})();
