// /functions/api/translate.ts
export async function onRequestPost({ request, env }) {
  try {
    const { text, source, target } = await request.json();

    // ❶ OpenAI / GPT 번역 (선호)
    if (env.OPENAI_API_KEY) {
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a translation engine. Translate the user text precisely.' },
          { role: 'user', content: `from ${source} to ${target}\n\n${text}` }
        ]
      };
      const r = await fetch('https://api.openai.com/v1/chat/completions
', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) return new Response('openai_fail', { status: 502 });
      const j = await r.json();
      const out = j.choices?.[0]?.message?.content
?.trim() || '';
      return Response.json({ text: out });
    }

    // ❷ Google Gemini 번역 (대안)
    if (env.GOOGLE
_API_KEY) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=
${env.GOOGLE
_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Translate from ${source} to ${target}:\n${text}` }]
            }]
          })
        }
      );
      if (!r.ok) return new Response('gemini_fail', { status: 502 });
      const j = await r.json();
      const out = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      return Response.json({ text: out });
    }

    // ❸ 키가 없으면 에러
    return new Response('no_translation_backend', { status: 500 });
  } catch (e) {
    return new Response('bad_request', { status: 400 });
  }
}
