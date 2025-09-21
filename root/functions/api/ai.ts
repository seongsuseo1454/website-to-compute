export async function onRequest({ request, env }: { request: Request; env: any }) {
  try {
    const { prompt } = await request.json();
    if (!prompt) return new Response(JSON.stringify({ error: 'no prompt' }), { status: 400 });

    const key = env.GEMINI_API_KEY;
    if (!key) return Response.json({ text: 'AI 키가 설정되지 않았습니다.' });

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=
' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }]}] })
    });
    if (!res.ok) return Response.json({ text: 'AI 응답 오류: ' + res.status });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답 없음';
    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
