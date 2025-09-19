// functions/api/ai.ts
// Cloudflare Pages Functions (TypeScript)
// Google Gemini 프록시: 텍스트 입력 → 텍스트/툴스트립 응답
// - CORS 허용
// - 표준 에러 포맷
// - 모델/시스템프롬프트/온도/토큰/JSON 출력 모드 지원

type Ctx = {
  request: Request;
  env: { GEMINI_API_KEY?: string };
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const j = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });

const bad = (msg: string, status = 400, extra?: Record<string, any>) => j({ ok: false, error: msg, ...extra }, status);

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction = async (ctx: Ctx) => handle(ctx);
export const onRequestPost: PagesFunction = async (ctx: Ctx) => handle(ctx);

async function handle({ request, env }: Ctx): Promise<Response> {
  try {
    const key = env.GEMINI_API_KEY;
    if (!key) return bad("Missing env.GEMINI_API_KEY. Cloudflare Pages 환경변수에 등록하세요.", 500);

    // ---- 입력 수집 (GET 쿼리 또는 POST JSON) ----
    const url = new URL(request.url);
    const isPost = request.method === "POST";
    const body = isPost ? await safeJson(request) : {};
    const qp = url.searchParams;

    const model =
      (qp.get("model") || (body as any)?.model || "gemini-2.0-flash") as string;

    const prompt =
      (qp.get("prompt") || (body as any)?.prompt || "").toString();

    const system =
      (qp.get("system") || (body as any)?.system || "").toString();

    const temperature = asNum(qp.get("temperature"), (body as any)?.temperature, 0.7);
    const maxTokens = asInt(qp.get("maxTokens"), (body as any)?.maxTokens, 1024);
    const jsonMode = asBool(qp.get("json"), (body as any)?.json, false);

    if (!prompt) return bad("prompt is required");

    // ---- Gemini REST 요청 페이로드 구성 ----
    // Google AI Studio REST:
    // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(key)}`;

    // system 프롬프트는 "system_instruction" 또는 첫 메시지에 주입
    const contents: any[] = [];
    if (system) {
      contents.push({
        role: "user",
        parts: [{ text: `SYSTEM:\n${system}` }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const genConfig: Record<string, any> = {
      temperature,
      maxOutputTokens: maxTokens,
    };
    if (jsonMode) {
      genConfig.responseMimeType = "application/json";
    }

    const payload = {
      contents,
      generationConfig: genConfig,
    };

    // ---- 호출 ----
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text(); // 우선 문자열로
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON 파싱 실패 시 원문 그대로 반환
      return j(
        {
          ok: false,
          error: "Gemini response is not JSON",
          status: res.status,
          model,
          request: { promptSample: prompt.slice(0, 140), temperature, maxTokens, jsonMode },
          raw: text.slice(0, 2000),
        },
        res.ok ? 200 : 502
      );
    }

    if (!res.ok) {
      return j(
        {
          ok: false,
          error: "Gemini HTTP error",
          status: res.status,
          model,
          request: { temperature, maxTokens, jsonMode },
          response: parsed,
        },
        502
      );
    }

    // ---- 텍스트 추출 (일반 텍스트 모드) ----
    // v1beta 응답: candidates[0].content.parts[].text
    let combinedText = "";
    try {
      const cand = parsed.candidates?.[0];
      const parts = cand?.content?.parts || [];
      combinedText = parts.map((p: any) => p.text || "").join("");
    } catch {
      /* noop */
    }

    return j({
      ok: true,
      model,
      used: { temperature, maxTokens, jsonMode },
      text: combinedText || null,
      response: parsed, // 원문도 함께 (디버깅/고급용)
    });
  } catch (e: any) {
    return bad(`Unhandled error: ${e?.message || String(e)}`, 500);
  }
}

async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
function asNum(...vals: any[]) {
  for (const v of vals) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
function asInt(...vals: any[]) {
  const n = asNum(...vals);
  return typeof n === "number" ? Math.floor(n) : undefined;
}
function asBool(...vals: any[]) {
  for (const v of vals) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (["1", "true", "yes", "y"].includes(s)) return true;
      if (["0", "false", "no", "n"].includes(s)) return false;
    }
  }
  return false;
        }

   
