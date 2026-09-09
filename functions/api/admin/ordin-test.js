import { requireAdmin } from '../../_lib/admin-auth.js';
import { queryOrdin } from '../../../common/js/ordin-query.mjs';
export async function onRequestPost({request,env}) {
  const auth=await requireAdmin(request,env);
  if(auth.error) return auth.error;
  let input;
  try {input=await request.json();} catch {return Response.json({message:'입력 형식을 확인해 주세요.'},{status:400});}
  const result=await queryOrdin(input,env.LAW_API_OC);
  return Response.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
}
