(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const accessMessage = document.getElementById('admin-access-message');
  const protectedContent = document.getElementById('admin-protected-content');
  const adminName = document.getElementById('admin-user-name');
  const logoutButton = document.getElementById('admin-logout');

  window.addEventListener('teadosa:adminready', initNotifications, { once: true });

  init();

  async function init() {
    try {
      const member = await auth.requireAuth({ redirect: false });
      if (!member) return redirectToLogin('login-required');
      if (member.role !== 'admin') {
        showAccessError('관리자 권한이 없는 계정입니다.');
        window.setTimeout(function () { window.location.replace('/mypage/'); }, 1500);
        return;
      }

      if (adminName) adminName.textContent = (member.name || member.username || '관리자') + '님';
      if (accessMessage) accessMessage.hidden = true;
      if (protectedContent) protectedContent.hidden = false;
      markActiveMenu();
      window.dispatchEvent(new CustomEvent('teadosa:adminready', { detail: { member: member } }));
    } catch (error) {
      showAccessError(error.message || '관리자 권한을 확인하지 못했습니다.');
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async function () {
      logoutButton.disabled = true;
      try { await auth.logout(); } finally { window.location.replace('/login/'); }
    });
  }

  function markActiveMenu() {
    const currentPath = window.location.pathname.replace(/\/+$/, '/') || '/';
    document.querySelectorAll('[data-admin-path]').forEach(function (link) {
      const path = link.getAttribute('data-admin-path');
      const active = path === '/admin/' ? currentPath === '/admin/' : currentPath.startsWith(path);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function redirectToLogin(reason) {
    const params = new URLSearchParams({ next: window.location.pathname + window.location.search, reason: reason });
    window.location.replace('/login/?' + params.toString());
  }

  function showAccessError(message) {
    if (!accessMessage) return;
    accessMessage.hidden = false;
    accessMessage.textContent = message;
    accessMessage.classList.add('error');
  }

  function initNotifications() {
    const account = document.querySelector('.admin-account');
    if (!account || document.getElementById('admin-notification-button')) return;
    const center = document.createElement('div');
    center.className = 'admin-notification-center';
    center.innerHTML = '<button id="admin-notification-button" class="admin-notification-button" type="button" aria-label="관리자 알림" aria-expanded="false"><svg class="admin-notification-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg><b id="admin-notification-count" hidden>0</b></button><section id="admin-notification-panel" class="admin-notification-panel" hidden><div class="admin-notification-head"><div><strong>알림센터</strong><small>최근 알림 100건</small></div><button id="admin-notification-read-all" type="button">전체 읽음</button></div><p id="admin-notification-message" class="admin-notification-message">알림을 확인하고 있습니다.</p><div id="admin-notification-list" class="admin-notification-list"></div></section>';
    account.insertBefore(center, account.firstChild);
    const button = center.querySelector('#admin-notification-button');
    const panel = center.querySelector('#admin-notification-panel');
    button.addEventListener('click', function () { const open=panel.hidden; panel.hidden=!open; button.setAttribute('aria-expanded',String(open)); if(open)loadNotifications(); });
    center.querySelector('#admin-notification-read-all').addEventListener('click', readAllNotifications);
    document.addEventListener('click', function (event) { if (!center.contains(event.target)) { panel.hidden=true; button.setAttribute('aria-expanded','false'); } });
    loadNotifications();
    window.setInterval(loadNotifications, 30000);
  }

  async function loadNotifications() {
    const list=document.getElementById('admin-notification-list'); const message=document.getElementById('admin-notification-message'); if(!list)return;
    try {
      const outcome=await auth.request('/api/admin/notifications',{method:'GET'}); const result=outcome.result||{};
      if(!outcome.response.ok||!result.success)throw new Error(result.message||'알림을 불러오지 못했습니다.');
      renderNotificationCount(result.unreadCount||0);
      const rows=result.notifications||[];
      list.innerHTML=rows.length?rows.map(notificationHtml).join(''):'<p class="admin-notification-empty">새로운 알림이 없습니다.</p>';
      message.hidden=true;
      list.querySelectorAll('[data-notification-link]').forEach(function(link){link.addEventListener('click',openNotification);});
      list.querySelectorAll('[data-notification-delete]').forEach(function(button){button.addEventListener('click',deleteNotification);});
    } catch(error){message.hidden=false;message.textContent=error.message||'알림을 불러오지 못했습니다.';message.classList.add('error');}
  }

  function notificationHtml(item) {
    return '<article class="admin-notification-item'+(item.readAt?'':' unread')+'"><button class="admin-notification-link" type="button" data-notification-link data-id="'+Number(item.id)+'" data-url="'+escapeAttribute(item.linkUrl)+'"><span class="admin-notification-type">'+escapeHtml(notificationType(item.type))+'</span><strong>'+escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.message)+'</p><time>'+escapeHtml(formatNotificationDate(item.createdAt))+'</time></button><button class="admin-notification-delete" type="button" data-notification-delete data-id="'+Number(item.id)+'" aria-label="알림 삭제">×</button></article>';
  }

  async function openNotification(event) { const target=event.currentTarget; await auth.request('/api/admin/notifications/'+encodeURIComponent(target.dataset.id),{method:'PATCH'}); window.location.href=target.dataset.url||'/admin/'; }
  async function deleteNotification(event) { event.stopPropagation(); const button=event.currentTarget; button.disabled=true; const outcome=await auth.request('/api/admin/notifications/'+encodeURIComponent(button.dataset.id),{method:'DELETE'}); if(outcome.response.ok)loadNotifications(); else button.disabled=false; }
  async function readAllNotifications() { const outcome=await auth.request('/api/admin/notifications',{method:'PATCH'}); if(outcome.response.ok)loadNotifications(); }
  function renderNotificationCount(count){const badge=document.getElementById('admin-notification-count');if(!badge)return;badge.textContent=count>99?'99+':String(count);badge.hidden=count<1;}
  function notificationType(type){return({member_signup:'회원가입',precheck_request:'사전검토',license_request:'발전사업허가'})[type]||'알림';}
  function formatNotificationDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'-':new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function escapeAttribute(value){return escapeHtml(value||'');}
})(window, document);
