// functions/api/ai.ts
// Cloudflare Pages Functions - Gemini 1.5 Flash 프록시

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  // 기본 CORS 헤더
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, system } = (await request.json()) || {};
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
      encodeURIComponent(apiKey);

    // Google Generative Language API payload
    const body = {
      // system 지시가 있으면 함께 전달
      ...(system
        ? { systemInstruction: { parts: [{ text: String(system) }] } }
        : {}),
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await upstream.json();

    if (!upstream.ok) {
      // 구글 에러 그대로 전달
      return new Response(
        JSON.stringify({
          error: 'Gemini API error',
          detail: json,
        }),
        {
          status: upstream.status,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    // text 추출
    const candidates = json?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    const text =
      parts
        .map((p: any) => ('text' in p ? p.text : ''))
        .join('')
        .trim() || '(empty response)';

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'server error', detail: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
};


   
