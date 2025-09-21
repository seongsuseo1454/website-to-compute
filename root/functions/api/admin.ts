export async function onRequest({ request, env }: { request: Request; env: any }) {
  const kv = env.MIRROR_KV as KVNamespace;
  if (request.method
 === 'GET') {
    const listKey = new URL(request.url).searchParams.get('list');
    if (!listKey) return Response.json([]);
    const raw = (await kv.get(listKey)) || '[]';
    return new Response(raw, { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method
 === 'POST') {
    const { token, kind, payload } = await request.json();
    if (!token || token !== env.ADMIN
_TOKEN) return new Response('forbidden', { status: 403 });
    const key = String(kind || 'NEWS');
    const arr = JSON.parse((await kv.get(key)) || '[]');
    arr.unshift(payload);
    await kv.put(key, JSON.stringify(arr.slice(0, 200)));
    return Response.json({ ok: true, msg: '저장되었습니다.' });
  }

  return new Response('method', { status: 405 });
}
