// /functions/api/reports.js
export async function onRequest({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const licensed = String(env?.LIC_REPORTS || '0') === '1';
  if (!licensed) {
    return new Response(JSON.stringify({ error: 'reports feature not licensed' }), { status: 403, headers: cors });
  }

  // 데모 스토리지(무상태). 실제 운영 시 KV/D1 로 교체.
  if (request.method === 'GET') {
    const sample = [
      { time: '09:30', dept: '복지과', title: '주간 업무계획 보고', author: '과장', status: '접수' },
      { time: '14:00', dept: '경제과', title: '지역상권 활성화 추진', author: '팀장', status: '검토' }
    ];
    return new Response(JSON.stringify(sample), { headers: cors });
  }

  if (request.method === 'POST') {
    // 관리자 보호 (선택): Authorization: Bearer <ADMIN_TOKEN>
    const adminToken = env?.ADMIN_TOKEN || '';
    const auth = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (adminToken && auth !== adminToken) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors });
    }

    const body = await request.json().catch(() => ({}));
    // 실제 저장대신 echo
    return new Response(JSON.stringify({ ok: true, saved: body || null }), { headers: cors });
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: cors });
}
