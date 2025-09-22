// functions/api/ai.ts
// AI 비서용 API 엔드포인트 (Gemini API 연동)

export async function onRequest({ request, env }: { request: Request; env: any }) {
  try {
    // 1. 프롬프트 파싱
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'no prompt' }), { status: 400 });
    }

    // 2. API 키 확인
    const key = env.GEMINI_API_KEY;
    if (!key) {
      return Response.json({ text: 'AI 키가 설정되지 않았습니다.' }, { status: 500 });
    }

   const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ]
    })
  }
);

    if (!res.ok) {
      return Response.json({ text: 'AI 응답 오류 · 상태코드 ' + res.status }, { status: res.status });
    }

    // 4. 결과 파싱
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '응답 없음';

    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
