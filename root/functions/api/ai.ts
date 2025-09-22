// Cloudflare Pages Functions - /api/ai
// Google Gemini 1.5 Flash 호출 (POST only)

export async function onRequest({ request, env }: { request: Request; env: any }) {
  try {
    // 1) 입력 파싱
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'no prompt' }), { status: 400 });
    }

    // 2) API 키 확인
    const key = env.GEMINI_API_KEY; // Pages > Settings > Environment variables
    if (!key) {
      return Response.json({ text: 'AI 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 3) Google Gemini 호출 (백틱/줄바꿈/템플릿 제거: 안전한 문자열 결합)
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      'gemini-1.5-flash:generateContent?key=' +
      encodeURIComponent(key);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }]}]
      })
    });

    if (!res.ok) {
      return Response.json({ text: 'AI 응답 오류: ' + res.status }, { status: 500 });
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.output_text ??
      '응답 없음';

    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
