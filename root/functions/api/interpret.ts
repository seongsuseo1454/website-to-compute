// /functions/api/interpret.ts
export const onRequestPost: PagesFunction<{ GEMINI_API_KEY: string }> = async ({ request, env }) => {
  try {
    const { text, target } = await request.json<any>(); // target: 'ko','en',...
    if (!text || !target) return j({ ok: false, reason: 'BAD_ARGS' }, 400);

    const sys =
`You are a professional simultaneous interpreter.
Translate faithfully into ${target} ONLY the meaning of the user's text.
Rules:
- Output plain text only (no markdown, no notes).
- Keep proper nouns.
- If the text is already ${target}, return it verbatim.`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text }] }
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
    };

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=
' +
      encodeURIComponent(env.GEMINI_API_KEY);

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return j({ ok: false, reason: 'HTTP_' + r.status }, 502);
    const data = await r.json();
    const out =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('\n').trim() || '';

    return j({ ok: true, text: out });
  } catch (e: any) {
    return j({ ok: false, reason: 'EXCEPTION', detail: String(e?.message || e) }, 500);
  }
};
function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
