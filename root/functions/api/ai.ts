// functions/api/ai.ts
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), { status: 400 });
    }

    const apiKey = env.GEMINI_API_KEY; // ← 환경변수
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: "Gemini API error", detail: text }), { status: 500 });
    }

    const data = await res.json();
    // 응답에서 텍스트 추출 (구글 응답 포맷 기준)
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), { status: 500 });
  }
};
