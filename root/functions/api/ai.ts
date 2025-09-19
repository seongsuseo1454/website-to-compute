// functions/api/ai.ts
// Cloudflare Pages Functions (Node-style) — Gemini 2.0 Flash / 2.5 Flash 호출 프록시
// 필요 환경변수: GEMINI_API_KEY
export const onRequestPost: PagesFunction = async (ctx) => {
  try {
    const { request, env } = ctx;
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Gemini 2.0/2.5 Flash text endpoint (non-stream)
    const model = "gemini-2.0-flash"; // 필요시 "gemini-2.5-flash"로 교체 가능
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        safetySettings: [
          // 보수적 기본값
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "Gemini call failed", detail: t }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n").trim() ||
      data?.candidates?.[0]?.output_text ||
      "(응답이 비어있습니다)";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};

   
