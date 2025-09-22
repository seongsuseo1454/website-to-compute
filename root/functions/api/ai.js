// /functions/api/ai.js
// - Cloudflare Pages Functions: Gemini API 호출 엔드포인트
// - 입력: { prompt: string }
// - 출력: { text: string }

export async function onRequest({ request, env }) {
  try {
    // 1) 허용 메서드 확인
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2) 입력 JSON 파싱
    const body = await request.json().catch(() => ({}));
    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3) 환경 변수에서 API 키 가져오기
    const key = env?.GEMINI_API_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ text: 'AI 키가 설정되지 않았습니다.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4) Gemini API 호출 URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;

    // 5) Gemini API 요청
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    // 6) API 실패 처리
    if (!res.ok) {
      return new Response(
        JSON.stringify({ text: `AI 응답 오류 (status=${res.status})` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7) JSON 응답 파싱
    const data = await res.json().catch(() => ({}));
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '응답 없음';

    // 8) 최종 응답 반환
    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    // 9) 예외 처리
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
