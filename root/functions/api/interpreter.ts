// functions/api/interpreter.ts
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { text, source = "ko", target = "en" } = (await request.json()
      .catch(() => ({}))) as { text?: string; source?: string; target?: string };

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "no_text" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 기본 공개 인스턴스(데모). 트래픽 많으면 env로 교체:
    // LIBRE_URL, LIBRE_API_KEY
    const base = (env.LIBRE_URL as string) || "https://libretranslate.com";
    const key  = (env.LIBRE_API_KEY as string) || undefined;

    const r = await fetch(base.replace(/\/$/,"") + "/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text",
        api_key: key,
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: "upstream", code: r.status }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    const j = await r.json();
    return new Response(JSON.stringify({ translated: j?.translatedText ?? "" }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "server", detail: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
