export async function onRequest({ request, env }: { request: Request; env: any }) {
  try {
    if (request.method
 === 'GET') return new Response('ok'); // ping
    const body = await request.json();
    // 필요 시 로그/알림 연동
    await env.MIRROR_KV.put('LAST_ERROR', JSON.stringify({ at: Date.now(), ...body }).slice(0, 8000));
    return Response.json({ ok: true });
  } catch {
    return new Response('bad', { status: 400 });
  }
}
