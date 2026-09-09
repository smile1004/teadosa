import { requireAdmin } from '../../_lib/admin-auth.js';
import { queryKepco } from '../../../common/js/kepco-query.mjs';

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;
  let input;
  try { input = await request.json(); } catch { return Response.json({ message: '입력 형식을 확인해 주세요.' }, { status: 400 }); }
  const result = await queryKepco(input, env.KEPCO_API_KEY);
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
