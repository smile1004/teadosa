import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  try {
    const auth=await requireAdmin(request,env); if(auth.error)return auth.error;
    const body=await request.json(); const endpoint=clean(body.endpoint,2000); const p256dh=clean(body.keys?.p256dh,500); const keyAuth=clean(body.keys?.auth,500);
    if(!endpoint||!p256dh||!keyAuth)return jsonResponse({success:false,message:'PC 알림 구독정보가 올바르지 않습니다.'},400);
    const now=new Date().toISOString(); const userAgent=clean(request.headers.get('user-agent'),500);
    await env.DB.prepare(`INSERT INTO admin_push_subscriptions(admin_member_id,endpoint,p256dh,auth,user_agent,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET admin_member_id=excluded.admin_member_id,p256dh=excluded.p256dh,auth=excluded.auth,user_agent=excluded.user_agent,updated_at=excluded.updated_at`)
      .bind(auth.admin.member_id,endpoint,p256dh,keyAuth,userAgent,now,now).run();
    return jsonResponse({success:true,message:'이 PC의 알림이 등록되었습니다.'});
  }catch(error){console.error('PC 알림 등록 오류:',error);return jsonResponse({success:false,message:'PC 알림을 등록하지 못했습니다.'},500);}
}

export async function onRequestDelete({ request, env }) {
  try {
    const auth=await requireAdmin(request,env); if(auth.error)return auth.error; const body=await request.json(); const endpoint=clean(body.endpoint,2000); if(!endpoint)return jsonResponse({success:false,message:'구독정보를 확인해 주세요.'},400);
    await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint = ? AND admin_member_id = ?').bind(endpoint,auth.admin.member_id).run();
    return jsonResponse({success:true,message:'이 PC의 알림이 해제되었습니다.'});
  }catch(error){return jsonResponse({success:false,message:'PC 알림을 해제하지 못했습니다.'},500);}
}
function clean(value,max){return String(value??'').trim().slice(0,max);} function method(){return jsonResponse({success:false,message:'POST 또는 DELETE 방식으로 요청해 주세요.'},405,{Allow:'POST, DELETE'});} export function onRequestGet(){return method();} export function onRequestPut(){return method();} export function onRequestPatch(){return method();}
