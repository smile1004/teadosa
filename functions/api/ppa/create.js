import { requireMember, jsonResponse } from '../../_lib/member-auth.js';
import { createAdminNotification } from '../../_lib/admin-notification.js';

export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireMember(request, env);
    if (auth.error) return auth.error;
    if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return error('요청 형식이 올바르지 않습니다.', 415);
    if (Number(request.headers.get('content-length') || 0) > 50_000) return error('신청 내용이 너무 큽니다.', 413);

    let body;
    try { body = await request.json(); } catch { return error('신청 정보를 읽을 수 없습니다.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('신청 정보가 올바르지 않습니다.');

    const applicantName = text(body.applicantName, 100);
    const phone = String(body.applicantPhone || '').replace(/\D/g, '');
    const email = text(body.applicantEmail, 254);
    const siteAddress = text(body.siteAddress, 250);
    const applicantType = enumValue(body.applicantType, ['personal','business']);
    const userType = enumValue(body.userType, ['existing','new']);
    const businessRegNumber = String(body.businessRegNumber || '').replace(/\D/g, '');
    if (!applicantType) return error('신청인 구분을 선택해 주세요.');
    if (!applicantName) return error('성명 또는 법인명을 입력해 주세요.');
    if (!/^\d{9,11}$/.test(phone)) return error('연락처를 정확하게 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('이메일 형식을 확인해 주세요.');
    if (applicantType === 'business' && businessRegNumber.length !== 10) return error('법인사업자는 사업자등록번호 10자리를 정확하게 입력해 주세요.');
    if (businessRegNumber && businessRegNumber.length !== 10) return error('사업자등록번호는 10자리로 입력해 주세요.');
    if (!siteAddress) return error('사업지 주소를 입력해 주세요.');
    if (!userType) return error('태도사 서비스 이용 구분을 선택해 주세요.');
    if (body.privacyConsent !== true || body.applicationConfirmed !== true) return error('필수 확인 및 동의 항목을 확인해 주세요.');

    const duplicate = await env.DB.prepare(`
      SELECT id, request_no FROM ppa_requests
      WHERE member_id = ? AND site_address = ? AND status NOT IN ('completed','cancelled') LIMIT 1
    `).bind(auth.member.member_id, siteAddress).first();
    if (duplicate) return jsonResponse({ success:false, code:'DUPLICATE_PPA_REQUEST', message:'같은 사업지 주소로 진행 중인 한전PPA 신청이 있습니다.', request:{ id:duplicate.id, requestNo:duplicate.request_no } }, 409);

    const now = new Date();
    const nowIso = now.toISOString();
    const temporaryNo = `TMP-${crypto.randomUUID()}`;
    const safeBody = sanitize(body);
    const result = await env.DB.prepare(`
      INSERT INTO ppa_requests (
        request_no, member_id, applicant_name, phone, email, site_address,
        form_version, form_data, privacy_consented_at, status, submitted_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).bind(temporaryNo, auth.member.member_id, applicantName, phone, email, siteAddress,
      text(body.formVersion, 40) || 'PPA_APPLY_V1', JSON.stringify(safeBody), nowIso, nowIso, nowIso).run();
    const id = Number(result?.meta?.last_row_id || 0);
    if (!result.success || !id) throw new Error('저장 결과를 확인할 수 없습니다.');
    const requestNo = createRequestNo(now, id);
    const updated = await env.DB.prepare('UPDATE ppa_requests SET request_no = ?, updated_at = ? WHERE id = ? AND member_id = ?')
      .bind(requestNo, nowIso, id, auth.member.member_id).run();
    if (!updated.success || Number(updated.meta?.changes || 0) !== 1) throw new Error('신청번호 생성에 실패했습니다.');
    await env.DB.prepare(`INSERT INTO ppa_status_history (request_id, from_status, to_status, customer_notice, changed_by, changed_at) VALUES (?, NULL, 'received', ?, ?, ?)`)
      .bind(id, '한전PPA 접수 서비스 신청이 정상적으로 접수되었습니다.', auth.member.member_id, nowIso).run();

    await createAdminNotification(env, {
      type:'ppa_request', title:'새 한전PPA 신청',
      message:applicantName + '님의 한전PPA 신청이 접수되었습니다. (' + requestNo + ')',
      linkUrl:'/admin/ppa/detail/?id=' + encodeURIComponent(id),
      entityType:'ppa', entityId:id, createdAt:nowIso
    });
    return jsonResponse({ success:true, code:'PPA_REQUEST_CREATED', message:'한전PPA 접수 서비스 신청이 완료되었습니다.', request:{ id, requestNo, status:'received', submittedAt:nowIso } }, 201);
  } catch (err) {
    console.error('한전PPA 신청 저장 오류:', err);
    return jsonResponse({ success:false, code:'INTERNAL_SERVER_ERROR', message:'신청을 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}

function sanitize(body) {
  return {
    applicantType:enumValue(body.applicantType,['personal','business']),
    applicantName:text(body.applicantName,100), applicantPhone:String(body.applicantPhone||'').replace(/\D/g,''),
    applicantEmail:text(body.applicantEmail,254), businessRegNumber:String(body.businessRegNumber||'').replace(/\D/g,''),
    siteAddress:text(body.siteAddress,250), licenseNumber:text(body.licenseNumber,60), capacity:text(body.capacity,40),
    userType:enumValue(body.userType,['existing','new']), requestNote:text(body.requestNote,1500),
    privacyConsent:true, applicationConfirmed:true
  };
}
function text(v,max=2000){return String(v??'').normalize('NFKC').trim().slice(0,max);}
function enumValue(v,allowed){const value=String(v||'');return allowed.includes(value)?value:'';}
function createRequestNo(date,id){const k=new Date(date.getTime()+32400000);return `PPA-${k.getUTCFullYear()}${String(k.getUTCMonth()+1).padStart(2,'0')}${String(k.getUTCDate()).padStart(2,'0')}-${String(id).padStart(6,'0')}`;}
function error(message,status=400){return jsonResponse({success:false,code:'INVALID_PPA_REQUEST',message},status);}
function method(){return jsonResponse({success:false,code:'METHOD_NOT_ALLOWED',message:'POST 방식으로 요청해 주세요.'},405,{Allow:'POST'});}
export function onRequestGet(){return method();} export function onRequestPut(){return method();} export function onRequestPatch(){return method();} export function onRequestDelete(){return method();}
