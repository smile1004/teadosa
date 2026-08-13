import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const publicKey = String(env.VAPID_PUBLIC_KEY || '').trim();
  return jsonResponse({ success:true, configured:Boolean(publicKey), publicKey });
}
function method(){return jsonResponse({success:false,message:'GET 방식으로 요청해 주세요.'},405,{Allow:'GET'});} export function onRequestPost(){return method();} export function onRequestPut(){return method();} export function onRequestPatch(){return method();} export function onRequestDelete(){return method();}
