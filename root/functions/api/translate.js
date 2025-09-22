// /functions/api/translate.js
export async function onRequest({ request, env }) {
  try {
    const { method } = request;

    // CORS/프리플라이트 (필요시)
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        }
      });
    }

    // 헬스체크: GET /api/translate?ping=1
    if (method === 'GET') {
      const url = new URL(request.url);
      if (url.searchParams.get('ping')) {
        return json({ ok: true, hasKey: !!env?.GEMINI_API_KEY });
      }
      return json({ error: 'method not allowed' }, 405);
    }

    if (method !== 'POST') return json({ error: 'method not allowed' }, 405);

    const { text, src = 'auto', dst = 'ko' } = await request.json().catch(() => ({}));
    if (!text || typeof text !== 'string') return json({ error: 'no text' }, 400);

    const key = env && env.GEMINI_API_KEY;
    if (!key) return json({ error: 'no api key (GEMINI_API_KEY missing)' }, 500);

    const api = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
      + '?key=' + encodeURIComponent(key);

    // 번역 전용 프롬프트 (결과는 순수 텍스트만)
    const sys = [
      'You are a translation engine.',
      `Translate from ${src} to ${dst}.`,
      'Return ONLY the translated sentence. No notes, no markdown, no code block.'
    ].join(' ');

    const res = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: sys }] },
          { role: 'user', parts: [{ text }] }
        ]
      })
    });

    if (!res.ok) {
      return json({ error: `upstream ${res.status}` }, 200);
    }

    const data = await res.json().catch(() => ({}));
    const translated =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!translated) {
      return json({ error: 'empty response from model' }, 200);
    }

    return json({ translated }, 200);

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
