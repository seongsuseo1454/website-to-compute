// functions/api/ai.ts
// Cloudflare Pages Functions (TypeScript) — Gemini 1.5 Flash 호출
// ENV: GOOGLE_API_KEY (Cloudflare Pages → Settings → Environment variables)

export interface Env {
  GOOGLE_API_KEY: string;
}

// 공통 CORS 헤더
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS
 },
  });
}

// Gemini 호출
async function callGemini(prompt: string, env: Env): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=
${env.GOOGLE_API_KEY}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status} ${res.statusText} ${errText}`);
  }

  const data = await res.json<any>();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join("\n")
      ?.trim() ?? "";

  if (!text) throw new Error("No text in Gemini response");
  return text;
}

// CORS 프리플라이트
export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: CORS });

// POST /api/ai
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const req = ctx.request;
    const { prompt } = (await req.json().catch(() => ({}))) as {
      prompt?: string;
    };

    const q = (prompt ?? "").toString().trim();
    if (!q) return json({ error: "prompt is required" }, 400);

    if (!ctx.env.GOOGLE_API_KEY)
      return json({ error: "GOOGLE_API_KEY is not set" }, 500);

    const reply = await callGemini(q, ctx.env);

    return json({ ok: true, text: reply });
  } catch (err: any) {
    return json({ ok: false, error: String(err?.message ?? err) }, 500);
  }
};

// (선택) GET 테스트 핑
export const onRequestGet: PagesFunction<Env> = async () =>
  json({ ok: true, ping: "ai" }, 200);
