export async function createAdminNotification(env, notification) {
  try {
    await env.DB.prepare(`INSERT INTO admin_notifications (notification_type,title,message,link_url,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(notification.type, notification.title, notification.message, notification.linkUrl, notification.entityType || null, notification.entityId || null, notification.createdAt || new Date().toISOString()).run();
  } catch (error) {
    console.error('관리자 알림 저장 오류:', error);
  }
}
