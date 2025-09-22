// /functions/api/translate.ts — FINAL (Cloudflare Pages Functions, 14언어)
export const onRequest: PagesFunction = async (ctx) => {
  try {
    if (ctx.request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
    }

    const { q, source, target } = await ctx.request.json<any>();
    if (!q || !target) {
      return new Response(JSON.stringify({ error: 'missing q/target' }), { status: 400 });
    }

    const key = ctx.env?.GOOGLE_API_KEY || ctx.env?.AI_STUDIO_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: 'MISSING_GOOGLE_API_KEY' }), { status: 500 });
    }

    // Gemini 번역 프롬프트
    const prompt = [
      'You are a professional translator. Preserve meaning and tone. Return only the translated text.',
      `Source language (hint, may be empty): ${source || 'auto'}`,
      `Target language (BCP-47 or ISO 639-1): ${target}`,
      `Text: """${q}"""`,
    ].join('\n');

     const resp = await fetch(
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
     {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
      }
    );


    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'GEMINI_FAIL', detail: t }), { status: 502 });
    }

    const json = await resp.json();
    const text =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join(' ').trim() || '';

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'SERVER_ERROR', detail: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
