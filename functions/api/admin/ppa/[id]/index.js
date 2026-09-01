import { requireAdmin, jsonResponse } from '../../../../_lib/admin-auth.js';

export async function onRequestGet({request,env,params}){
  try{
    const auth=await requireAdmin(request,env);if(auth.error)return auth.error;const id=Number.parseInt(params.id,10);if(!id)return invalid();
    const row=await env.DB.prepare(`SELECT r.*,m.username,m.member_type FROM ppa_requests r LEFT JOIN members m ON m.id=r.member_id WHERE r.id=? LIMIT 1`).bind(id).first();
    if(!row)return jsonResponse({success:false,code:'NOT_FOUND',message:'신청내역을 찾을 수 없습니다.'},404);
    const history=await env.DB.prepare(`SELECT h.id,h.from_status,h.to_status,h.customer_notice,h.changed_at,m.name changed_by_name FROM ppa_status_history h LEFT JOIN members m ON m.id=h.changed_by WHERE h.request_id=? ORDER BY h.changed_at DESC,h.id DESC`).bind(id).all();
    let formData={};try{formData=JSON.parse(row.form_data||'{}');}catch{}
    return jsonResponse({success:true,code:'ADMIN_PPA_DETAIL_LOADED',request:{id:row.id,requestNo:row.request_no,memberId:row.member_id,username:row.username,memberType:row.member_type,applicantName:row.applicant_name,phone:row.phone,email:row.email,siteAddress:row.site_address,formVersion:row.form_version,formData,status:row.status,customerNotice:row.customer_notice||'',internalMemo:row.internal_memo||'',privacyConsentedAt:row.privacy_consented_at,submittedAt:row.submitted_at,updatedAt:row.updated_at},history:(history.results||[]).map(h=>({id:h.id,fromStatus:h.from_status,toStatus:h.to_status,customerNotice:h.customer_notice||'',changedAt:h.changed_at,changedByName:h.changed_by_name||''}))});
  }catch(err){console.error('관리자 한전PPA 상세 오류:',err);return jsonResponse({success:false,code:'INTERNAL_SERVER_ERROR',message:'신청 상세정보를 불러오는 중 오류가 발생했습니다.'},500);}
}
function invalid(){return jsonResponse({success:false,code:'INVALID_ID',message:'올바른 신청 ID가 아닙니다.'},400);}function method(){return jsonResponse({success:false,code:'METHOD_NOT_ALLOWED',message:'GET 방식으로 요청해 주세요.'},405,{Allow:'GET'});}export function onRequestPost(){return method();}export function onRequestPut(){return method();}export function onRequestPatch(){return method();}export function onRequestDelete(){return method();}
