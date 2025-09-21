// /functions/api/ai.ts
export const onRequestPost: PagesFunction<{ GEMINI_API_KEY: string }> = async ({ request, env }) => {
  try {
    const { prompt } = await request.json<any>();
    if (!prompt) return j({ ok: false, reason: 'NO_PROMPT' }, 400);

    const body = {
      contents: [{ parts: [{ text: String(prompt) }]}],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    };

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=
' +
      encodeURIComponent(env.GEMINI_API_KEY);

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return j({ ok: false, reason: 'HTTP_' + r.status }, 502);
    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('\n').trim() || '';

    return j({ ok: true, text });
  } catch (e: any) {
    return j({ ok: false, reason: 'EXCEPTION', detail: String(e?.message || e) }, 500);
  }
};
function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
