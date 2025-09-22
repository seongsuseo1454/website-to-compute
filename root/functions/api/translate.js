// /functions/api/translate.js
export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
    }

    const { text, src = 'auto', dst = 'ko' } = await request.json().catch(() => ({}));
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'no text' }), { status: 400 });
    }

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: 'no api key' }), { status: 500 });
    }

    const api = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
      + '?key=' + encodeURIComponent(key);

    // 번역 전용 시스템 프롬프트: 결과는 순수 텍스트 한 줄
    const sys = [
      'You are a translation engine.',
      'Translate the user text from {{SRC}} to {{DST}}.',
      'Return ONLY the translated sentence. No notes, no code block, no emojis.'
    ].join(' ');
    const prompt = sys.replace('{{SRC}}', src).replace('{{DST}}', dst);

    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'user', parts: [{ text }] }
        ]
      })
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream ' + res.status }), { status: 200 });
    }
    const data = await res.json().catch(() => ({}));
    const translated =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '';

    return new Response(JSON.stringify({ translated }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
