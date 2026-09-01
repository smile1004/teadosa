import { requireMember, jsonResponse } from '../../_lib/member-auth.js';
import { createAdminNotification } from '../../_lib/admin-notification.js';

export async function onRequestPost({request,env}){
  try{
    const auth=await requireMember(request,env);if(auth.error)return auth.error;
    if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))return error('요청 형식이 올바르지 않습니다.',415);
    if(Number(request.headers.get('content-length')||0)>50_000)return error('신청 내용이 너무 큽니다.',413);
    let body;try{body=await request.json();}catch{return error('신청 정보를 읽을 수 없습니다.');}
    if(!body||typeof body!=='object'||Array.isArray(body))return error('신청 정보가 올바르지 않습니다.');
    const applicantName=text(body.applicantName,100),phone=String(body.applicantPhone||'').replace(/\D/g,''),email=text(body.applicantEmail,254),siteAddress=text(body.siteAddress,250);
    if(!enumValue(body.applicantType,['personal','business']))return error('신청인 구분을 선택해 주세요.');
    if(!applicantName)return error('성명 또는 법인명을 입력해 주세요.');
    if(!/^\d{9,11}$/.test(phone))return error('연락처를 정확하게 입력해 주세요.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error('이메일 형식을 확인해 주세요.');
    if(!enumValue(body.precheckStatus,['owned','request','unknown']))return error('사전검토확인서 보유 여부를 선택해 주세요.');
    if(!enumValue(body.businessLicenseStatus,['owned','progress','before']))return error('발전사업허가증 보유 여부를 선택해 주세요.');
    if(!enumValue(body.lineCapacity,['done','request','unknown']))return error('한전선로 용량 확인 여부를 선택해 주세요.');
    if(!enumValue(body.siteRights,['done','progress','consult']))return error('부지 사용권원 확보 여부를 선택해 주세요.');
    if(!enumValue(body.siteType,['land','roof']))return error('사업 유형을 선택해 주세요.');
    if(!siteAddress)return error('사업지 주소를 입력해 주세요.');
    if(body.contractConfirm!==true)return error('전자계약 안내 확인 항목을 확인해 주세요.');
    if(body.privacyConsent!==true||body.applicationConfirmed!==true)return error('필수 확인 및 동의 항목을 확인해 주세요.');
    const duplicate=await env.DB.prepare(`SELECT id,request_no FROM development_permit_requests WHERE member_id=? AND site_address=? AND status NOT IN ('completed','cancelled') LIMIT 1`).bind(auth.member.member_id,siteAddress).first();
    if(duplicate)return jsonResponse({success:false,code:'DUPLICATE_DEVELOPMENT_REQUEST',message:'같은 사업지 주소로 진행 중인 개발행위허가 신청이 있습니다.',request:{id:duplicate.id,requestNo:duplicate.request_no}},409);
    const now=new Date(),nowIso=now.toISOString(),temporaryNo=`TMP-${crypto.randomUUID()}`,safeBody=sanitize(body);
    const result=await env.DB.prepare(`INSERT INTO development_permit_requests(request_no,member_id,applicant_name,phone,email,site_address,form_version,form_data,privacy_consented_at,status,submitted_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'received',?,?)`).bind(temporaryNo,auth.member.member_id,applicantName,phone,email,siteAddress,text(body.formVersion,50)||'DEVELOPMENT_PERMIT_APPLY_V1',JSON.stringify(safeBody),nowIso,nowIso,nowIso).run();
    const id=Number(result?.meta?.last_row_id||0);if(!result.success||!id)throw new Error('저장 결과를 확인할 수 없습니다.');
    const requestNo=createRequestNo(now,id),updated=await env.DB.prepare('UPDATE development_permit_requests SET request_no=?,updated_at=? WHERE id=? AND member_id=?').bind(requestNo,nowIso,id,auth.member.member_id).run();if(!updated.success||Number(updated.meta?.changes||0)!==1)throw new Error('신청번호 생성에 실패했습니다.');
    await env.DB.prepare(`INSERT INTO development_permit_status_history(request_id,from_status,to_status,customer_notice,changed_by,changed_at) VALUES(?,NULL,'received',?,?,?)`).bind(id,'개발행위허가 서비스 신청이 정상적으로 접수되었습니다.',auth.member.member_id,nowIso).run();
    await createAdminNotification(env,{type:'development_request',title:'새 개발행위허가 신청',message:applicantName+'님의 개발행위허가 신청이 접수되었습니다. ('+requestNo+')',linkUrl:'/admin/development/detail/?id='+encodeURIComponent(id),entityType:'development',entityId:id,createdAt:nowIso});
    return jsonResponse({success:true,code:'DEVELOPMENT_REQUEST_CREATED',message:'개발행위허가 서비스 신청이 완료되었습니다.',request:{id,requestNo,status:'received',submittedAt:nowIso}},201);
  }catch(err){console.error('개발행위허가 신청 저장 오류:',err);return jsonResponse({success:false,code:'INTERNAL_SERVER_ERROR',message:'신청을 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'},500);}
}
function sanitize(b){return{applicantType:enumValue(b.applicantType,['personal','business']),applicantName:text(b.applicantName,100),applicantPhone:String(b.applicantPhone||'').replace(/\D/g,''),applicantEmail:text(b.applicantEmail,254),precheckStatus:enumValue(b.precheckStatus,['owned','request','unknown']),businessLicenseStatus:enumValue(b.businessLicenseStatus,['owned','progress','before']),licenseNumber:text(b.licenseNumber,60),licenseDate:text(b.licenseDate,20),lineCapacity:enumValue(b.lineCapacity,['done','request','unknown']),siteRights:enumValue(b.siteRights,['done','progress','consult']),siteType:enumValue(b.siteType,['land','roof']),siteAddress:text(b.siteAddress,250),capacity:text(b.capacity,40),landUse:text(b.landUse,80),buildingUse:text(b.buildingUse,80),drawingStatus:enumValue(b.drawingStatus,['owned','none','unknown']),siteNotes:text(b.siteNotes,1500),preferredVisit:text(b.preferredVisit,100),siteContact:text(b.siteContact,100),visitNotes:text(b.visitNotes,1500),additionalRequest:text(b.additionalRequest,1500),contractConfirm:true,privacyConsent:true,applicationConfirmed:true};}
function text(v,n=2000){return String(v??'').normalize('NFKC').trim().slice(0,n);}function enumValue(v,a){const x=String(v||'');return a.includes(x)?x:'';}function createRequestNo(d,id){const k=new Date(d.getTime()+32400000);return `DEV-${k.getUTCFullYear()}${String(k.getUTCMonth()+1).padStart(2,'0')}${String(k.getUTCDate()).padStart(2,'0')}-${String(id).padStart(6,'0')}`;}function error(message,status=400){return jsonResponse({success:false,code:'INVALID_DEVELOPMENT_REQUEST',message},status);}function method(){return jsonResponse({success:false,code:'METHOD_NOT_ALLOWED',message:'POST 방식으로 요청해 주세요.'},405,{Allow:'POST'});}export function onRequestGet(){return method();}export function onRequestPut(){return method();}export function onRequestPatch(){return method();}export function onRequestDelete(){return method();}
