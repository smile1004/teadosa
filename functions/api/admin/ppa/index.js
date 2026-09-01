import { requireAdmin, jsonResponse } from '../../../_lib/admin-auth.js';

const STATUSES=['received','consulting','contracted','documents','submitted','supplement_required','completed','cancelled'];
export async function onRequestGet({request,env}){
  try{
    const auth=await requireAdmin(request,env);if(auth.error)return auth.error;
    const url=new URL(request.url),search=text(url.searchParams.get('search'),100),status=STATUSES.includes(url.searchParams.get('status'))?url.searchParams.get('status'):'';
    const page=clamp(url.searchParams.get('page'),1,100000,1),pageSize=clamp(url.searchParams.get('pageSize'),1,50,20),offset=(page-1)*pageSize;
    const conditions=[],bindings=[];
    if(search){const like=`%${search.replace(/[\\%_]/g,'\\$&')}%`;conditions.push(`(r.request_no LIKE ? ESCAPE '\\' OR r.applicant_name LIKE ? ESCAPE '\\' OR r.phone LIKE ? ESCAPE '\\' OR r.email LIKE ? ESCAPE '\\' OR r.site_address LIKE ? ESCAPE '\\')`);bindings.push(like,like,like,like,like);}
    if(status){conditions.push('r.status=?');bindings.push(status);}const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
    const count=await env.DB.prepare(`SELECT COUNT(*) total FROM ppa_requests r ${where}`).bind(...bindings).first();
    const summaries=await env.DB.prepare('SELECT status,COUNT(*) count FROM ppa_requests GROUP BY status').all();
    const rows=await env.DB.prepare(`SELECT r.id,r.request_no,r.applicant_name,r.phone,r.email,r.site_address,r.status,r.submitted_at,r.updated_at,m.username,m.member_type FROM ppa_requests r LEFT JOIN members m ON m.id=r.member_id ${where} ORDER BY r.submitted_at DESC,r.id DESC LIMIT ? OFFSET ?`).bind(...bindings,pageSize,offset).all();
    const total=Number(count?.total||0),summary={total:0};STATUSES.forEach(s=>summary[s]=0);(summaries.results||[]).forEach(x=>{summary[x.status]=Number(x.count||0);summary.total+=Number(x.count||0);});
    return jsonResponse({success:true,code:'ADMIN_PPA_REQUESTS_LOADED',requests:(rows.results||[]).map(r=>({id:r.id,requestNo:r.request_no,applicantName:r.applicant_name,phone:r.phone,email:r.email,siteAddress:r.site_address,status:r.status,submittedAt:r.submitted_at,updatedAt:r.updated_at,username:r.username,memberType:r.member_type})),summary,pagination:{page,pageSize,total,totalPages:Math.max(1,Math.ceil(total/pageSize))}});
  }catch(err){console.error('관리자 한전PPA 목록 오류:',err);return jsonResponse({success:false,code:'INTERNAL_SERVER_ERROR',message:'한전PPA 신청목록을 불러오는 중 오류가 발생했습니다.'},500);}
}
function text(v,n){return String(v??'').trim().slice(0,n);}function clamp(v,min,max,f){const n=Number.parseInt(v,10);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):f;}function method(){return jsonResponse({success:false,code:'METHOD_NOT_ALLOWED',message:'GET 방식으로 요청해 주세요.'},405,{Allow:'GET'});}export function onRequestPost(){return method();}export function onRequestPut(){return method();}export function onRequestPatch(){return method();}export function onRequestDelete(){return method();}
