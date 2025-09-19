// functions/api/ai.ts
// POST /api/ai  { "prompt": "..." }

export const onRequest: PagesFunction = async ({ request, env }) => {
  try {
    if (request.method
 !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { prompt } = await request.json().catch(() => ({}));
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/
` +
      `gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return new Response(JSON.stringify({ error: "Gemini API error", detail }), {
        status: 502,
        headers: corsJson(),
      });
    }

    const data = await upstream.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: corsJson(),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: corsJson(),
    });
  }
};

// 공통 헤더(브라우저 호출 편의용)
function corsJson() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}


   
