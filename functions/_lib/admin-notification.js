import { sendNotification } from 'web-push-neo';

export async function createAdminNotification(env, notification) {
  try {
    await env.DB.prepare(`INSERT INTO admin_notifications (notification_type,title,message,link_url,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(notification.type, notification.title, notification.message, notification.linkUrl, notification.entityType || null, notification.entityId || null, notification.createdAt || new Date().toISOString()).run();
    await sendAdminPushNotifications(env, notification);
  } catch (error) {
    console.error('관리자 알림 저장 오류:', error);
  }
}

async function sendAdminPushNotifications(env, notification) {
  const publicKey=String(env.VAPID_PUBLIC_KEY||'').trim(); const privateKey=String(env.VAPID_PRIVATE_KEY||'').trim(); const subject=String(env.VAPID_SUBJECT||'').trim();
  if(!publicKey||!privateKey||!subject)return;
  const subscriptions=await env.DB.prepare('SELECT id,endpoint,p256dh,auth FROM admin_push_subscriptions').all();
  const payload=JSON.stringify({title:notification.title,body:notification.message,url:notification.linkUrl,tag:'teadosa-'+notification.type+'-'+(notification.entityId||Date.now())});
  await Promise.allSettled((subscriptions.results||[]).map(async function(subscription){
    try {
      await sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},payload,{vapidDetails:{subject,publicKey,privateKey},TTL:3600,urgency:'high'});
    } catch(error) {
      if(error?.statusCode===404||error?.statusCode===410)await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE id = ?').bind(subscription.id).run();
      else console.error('관리자 PC 푸시 발송 오류:',error);
    }
  }));
}
