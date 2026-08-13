import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

export async function onRequestPatch({ request, env, params }) {
  try {
    const auth=await requireAdmin(request,env); if(auth.error)return auth.error; const id=Number(params.id); if(!id)return invalid();
    await env.DB.prepare('UPDATE admin_notifications SET read_at = COALESCE(read_at, ?) WHERE id = ?').bind(new Date().toISOString(),id).run();
    return jsonResponse({success:true});
  } catch(error){return jsonResponse({success:false,message:'알림을 읽음 처리하지 못했습니다.'},500);}
}
export async function onRequestDelete({ request, env, params }) {
  try {
    const auth=await requireAdmin(request,env); if(auth.error)return auth.error; const id=Number(params.id); if(!id)return invalid();
    await env.DB.prepare('DELETE FROM admin_notifications WHERE id = ?').bind(id).run();
    return jsonResponse({success:true,message:'알림이 삭제되었습니다.'});
  } catch(error){return jsonResponse({success:false,message:'알림을 삭제하지 못했습니다.'},500);}
}
function invalid(){return jsonResponse({success:false,message:'올바른 알림 ID가 아닙니다.'},400);} function method(){return jsonResponse({success:false,message:'PATCH 또는 DELETE 방식으로 요청해 주세요.'},405,{Allow:'PATCH, DELETE'});} export function onRequestGet(){return method();} export function onRequestPost(){return method();} export function onRequestPut(){return method();}
