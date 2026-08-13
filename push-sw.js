self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title:'태양광도사 관리자 알림', body:event.data ? event.data.text() : '새로운 접수가 있습니다.' }; }
  event.waitUntil(self.registration.showNotification(data.title || '태양광도사 관리자 알림', {
    body: data.body || '새로운 접수가 있습니다.',
    icon: '/common/images/coming-character.png',
    badge: '/common/images/coming-character.png',
    tag: data.tag || 'teadosa-admin-notification',
    data: { url: data.url || '/admin/' },
    renotify: true
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/admin/', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(function (windows) {
    for (const client of windows) { if ('focus' in client) { client.navigate(target); return client.focus(); } }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
