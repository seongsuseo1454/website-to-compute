// /functions/api/translate.js
export async function onRequest({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    let text = '', to = 'en', from = '';
    if (request.method === 'GET') {
      const u = new URL(request.url);
      text = u.searchParams.get('text') || '';
      to = u.searchParams.get('to') || 'en';
      from = u.searchParams.get('from') || '';
    } else if (request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      text = b.text || ''; to = b.to || 'en'; from = b.from || '';
    } else {
      return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: cors });
    }
    if (!text) {
      return new Response(JSON.stringify({ error: 'no text' }), { status: 400, headers: cors });
    }

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      // 키 없으면 에코(데모)
      return new Response(JSON.stringify({ translated: '[' + to + '] ' + text }), { headers: cors });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
      + 'gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);
    const prompt = 'Translate the following text to ' + to + (from ? ' from ' + from : '') + ':\n' + text;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }]}] })
    });
    const data = await res.json().catch(() => ({}));
    const out = (data && data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0]
      && data.candidates[0].content.parts[0].text) || '';
    return new Response(JSON.stringify({ translated: out || '[' + to + '] ' + text }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
}
