// /functions/api/ai.js
export async function onRequest({ request, env }) {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
    }
    const body = await request.json().catch(() => ({}));
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'no prompt' }), { status: 400 });
    }

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ text: 'AI 키가 설정되지 않았습니다.' }), { status: 200 });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
      + 'gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }]}] })
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ text: 'AI 응답 오류: ' + res.status }), { status: 200 });
    }
    const data = await res.json();
    const text = (data && data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts
      && data.candidates[0].content.parts[0]
      && data.candidates[0].content.parts[0].text) || '응답 없음';
    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
