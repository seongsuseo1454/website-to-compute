export const onRequest: PagesFunction = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = body?.prompt;
    if (!prompt) return json({ error: 'no prompt' }, 400);

    const key = env?.GEMINI_API_KEY;
    if (!key) return json({ text: 'AI 키가 설정되지 않았습니다.' }, 500);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: String(prompt) }] }],
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ text: 'AI 응답 오류 · 상태코드 ' + res.status, detail }, res.status);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((p: any) => p?.text).filter(Boolean).join('\n')
      : '응답 없음';

    return json({ text });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
