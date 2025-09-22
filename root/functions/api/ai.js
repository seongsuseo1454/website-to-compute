// functions/api/ai.js
// Cloudflare Pages Functions - Google Gemini 1.5 Flash 호출 (POST 전용)

export async function onRequest(context) {
  const { request, env } = context;

  // POST 전용
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 요청 바디 파싱
    const body = await request.json().catch(() => ({}));
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "no prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // API 키 확인
    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ text: "AI 키가 설정되지 않았습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // URL (문자열 연결만 사용, 백틱 금지)
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(String(key));

    // Gemini API 호출
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ text: "AI 응답 오류: " + res.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json().catch(() => ({}));
    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ text: text || "응답 없음" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
