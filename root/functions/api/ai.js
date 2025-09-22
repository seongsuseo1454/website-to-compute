// functions/api/ai.js
// Cloudflare Pages Functions (POST /api/ai) - Google Gemini 1.5 Flash

export async function onRequest(context) {
  const { request, env } = context;

  // 1) 메서드 가드: POST만 허용
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 2) 프롬프트 파싱
    const body = await request.json().catch(() => ({}));
    const prompt = body && body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "no prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3) API 키 확인 (Cloudflare Pages > Settings > Environment Variables)
    const key = env && env.GEMINI_API_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ text: "AI 키가 설정되지 않았습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) 안전한 URL 조합 (백틱/템플릿리터럴/줄바꿈 없음)
    const base = "https://generativelanguage.googleapis.com/v1beta/models/";
    const model = "gemini-1.5-flash:generateContent";
    const url =
      base + model + "?key=" + encodeURIComponent(String(key));

    // 5) Google Gemini 호출
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ text: "AI 응답 오류: " + res.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6) 응답 파싱 (방어적 체이닝)
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e || "unknown") }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
