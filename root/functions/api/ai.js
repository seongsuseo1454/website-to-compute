// functions/api/ai.js
// Cloudflare Pages Functions (POST /api/ai) - 템플릿 리터럴 없음

export async function onRequest({ request, env }) {
  try {
    const body = await request.json();
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "no prompt" }), { status: 400 });
    }

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ text: "AI 키가 설정되지 않았습니다." }), { status: 500 });
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(key);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ text: "AI 응답 오류: " + res.status }), { status: 500 });
    }

    const data = await res.json();
    let text = "응답 없음";
    try {
      if (data && data.candidates
 && data.candidates
[0]) {
        const c0 = data.candidates
[0];
        if (c0.content && c0.content.parts && c0.content.parts[0]) {
          text = String(c0.content.parts[0].text || "응답 없음");
        } else if (c0.output_text) {
          text = String(c0.output_text);
        }
      }
    } catch (_) {}

    return new Response(JSON.stringify({ text }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
