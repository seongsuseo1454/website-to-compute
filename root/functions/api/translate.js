// /functions/api/translate.js
// POST { text, src, dst } -> { text }
// Gemini 프롬프트 기반 번역 (브라우저 CORS 피함)

export async function onRequest({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body && body.text;
    const src  = (body && body.src) || "auto";
    const dst  = (body && body.dst) || "en";
    if (!text) return new Response(JSON.stringify({ error: "no text" }), { status: 400 });

    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      // 키 없으면 간단 폴백(그대로 반환)
      return new Response(JSON.stringify({ text: text }), { status: 200 });
    }

    const prompt =
      "Translate the following text from " + src + " to " + dst +
      ". Only return the translation, no extra notes.\n\n" + text;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-1.5-flash:generateContent?key=" + encodeURIComponent(key);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }]}]
      })
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ text: text }), { status: 200 });
    }

    const data = await res.json();
    const out =
      (data && data.candidates && data.candidates[0] &&
       data.candidates[0].content && data.candidates[0].content.parts &&
       data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || text;

    return new Response(JSON.stringify({ text: out.trim() }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ text }), { status: 200 });
  }
}
