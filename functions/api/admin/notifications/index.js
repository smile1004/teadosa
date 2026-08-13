import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
    const rows = await env.DB.prepare(`SELECT id,notification_type,title,message,link_url,entity_type,entity_id,created_at,read_at FROM admin_notifications ORDER BY created_at DESC,id DESC LIMIT 100`).all();
    const unread = await env.DB.prepare('SELECT COUNT(*) count FROM admin_notifications WHERE read_at IS NULL').first();
    return jsonResponse({ success:true, notifications:(rows.results||[]).map(mapRow), unreadCount:Number(unread?.count||0) });
  } catch (error) {
    console.error('관리자 알림 조회 오류:', error);
    return jsonResponse({ success:false, message:'관리자 알림을 불러오지 못했습니다.' }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE admin_notifications SET read_at = ? WHERE read_at IS NULL').bind(now).run();
    return jsonResponse({ success:true, message:'모든 알림을 읽음 처리했습니다.', readAt:now });
  } catch (error) { return jsonResponse({ success:false, message:'알림을 읽음 처리하지 못했습니다.' }, 500); }
}

function mapRow(row) { return { id:row.id, type:row.notification_type, title:row.title, message:row.message, linkUrl:row.link_url, entityType:row.entity_type, entityId:row.entity_id, createdAt:row.created_at, readAt:row.read_at }; }
function method(){return jsonResponse({success:false,message:'GET 또는 PATCH 방식으로 요청해 주세요.'},405,{Allow:'GET, PATCH'});}
export function onRequestPost(){return method();} export function onRequestPut(){return method();} export function onRequestDelete(){return method();}
