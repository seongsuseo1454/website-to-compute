// /functions/api/ai.js
// Cloudflare Pages Functions (POST /api/ai)
// -> Google Gemini 1.5 Flash 프록시 (키 없으면 안전한 폴백 메시지)

export async function onRequest({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "no prompt" }), { status: 400 });
    }

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      // 폴백(키 미설정 시에도 UI가 죽지 않도록)
      return new Response(JSON.stringify({ text: "AI 키가 설정되지 않았습니다." }), { status: 200 });
    }

    // 백틱 없이 URL 조립 (빌드기 에러 예방)
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(key);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }]}]
      })
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ text: "AI 응답 오류: " + res.status }), { status: 200 });
    }

    const data = await res.json();
    const text =
      (data && data.candidates && data.candidates[0] &&
       data.candidates[0].content && data.candidates[0].content.parts &&
       data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ||
      "응답 없음";
    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ text: "서버 오류: " + String(e) }), { status: 200 });
  }
}
