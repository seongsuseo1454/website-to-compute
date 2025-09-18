/**
 * Cloudflare Worker - Minimal API for Smart Mirror
 * - CORS + 보안 헤더
 * - /api/health      : 헬스체크
 * - /api/chat (POST) : OpenAI 또는 Gemini 프록시 (키 없으면 데모 응답)
 *
 * 환경변수(Worker → Settings → Variables):
 *  - OPENAI_API_KEY   (선택)
 *  - GEMINI_API_KEY   (선택)
 *  - OPENAI_BASE_URL  (선택, 기본: https://api.openai.com/v1)
 *  - GEMINI_MODEL     (선택, 기본: gemini-1.5-flash)
 *  - OPENAI_MODEL     (선택, 기본: gpt-4o-mini)
 */

export default {
  async fetch(req, env, ctx) {
    try {
      // 라우팅
      const url = new URL(req.url);
      const { pathname } = url;

      // CORS 프리플라이트
      if (req.method === 'OPTIONS') {
        return cors(new Response(null, { status: 204 }));
      }

      if (pathname === '/api/health') {
        return cors(
          json({
            ok: true,
            worker: 'alive',
            time: new Date().toISOString(),
          })
        );
      }

      if (pathname === '/api/chat' && req.method === 'POST') {
        return cors(await handleChat(req, env));
      }

      // 기타 요청은 404
      return cors(json({ ok: false, error: 'Not Found' }, 404));
    } catch (err) {
      return cors(
        json(
          { ok: false, error: err?.message || 'Unhandled error' },
          500
        )
      );
    }
  },
};

/* ---------- Chat Handler ---------- */

async function handleChat(req, env) {
  const body = await safeJson(req);
  const provider = (body?.provider || 'openai').toLowerCase();
  const userText =
    body?.text ||
    body?.message ||
    (Array.isArray(body?.messages) ? extractText(body.messages) : '');

  if (!userText) {
    return json({ ok: false, error: 'No input text' }, 400);
  }

  // 키 여부 확인
  const hasOpenAI = Boolean(env.OPENAI_API_KEY);
  const hasGemini = Boolean(env.GEMINI_API_KEY);

  // 키 없으면 데모 응답
  if (!hasOpenAI && !hasGemini) {
    return json({
      ok: true,
      provider: 'demo',
      reply:
        `🔧 (데모) "${userText}" 요청을 받았습니다. ` +
        `실 운용을 위해서는 OPENAI_API_KEY 또는 GEMINI_API_KEY를 Worker 환경변수에 설정하세요.`,
    });
  }

  try {
    if (provider === 'gemini' && hasGemini) {
      // Gemini
      const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userText }] }],
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return json(
          { ok: false, provider: 'gemini', error: errText },
          resp.status
        );
      }

      const data = await resp.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '(응답 없음)';
      return json({ ok: true, provider: 'gemini', reply });
    }

    // OpenAI (기본)
    const base = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant for a smart mirror in a mayor office.' },
          { role: 'user', content: userText },
        ],
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json(
        { ok: false, provider: 'openai', error: errText },
        resp.status
      );
    }

    const data = await resp.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() || '(응답 없음)';
    return json({ ok: true, provider: 'openai', reply });
  } catch (e) {
    return json({ ok: false, error: e?.message || 'Chat error' }, 500);
  }
}

/* ---------- Helpers ---------- */

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...securityHeaders(),
      ...headers,
    },
  });
}

function cors(res) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return new Response(res.body, { status: res.status, headers: h });
}

function securityHeaders() {
  return {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function extractText(messages) {
  // [{role:'user', content:'...'}] or [{role, parts:[{text}]}]
  for (const m of messages) {
    if (typeof m?.content === 'string' && m.content.trim()) return m.content;
    const t = m?.parts?.find?.((p) => typeof p?.text === 'string')?.text;
    if (t) return t;
  }
  return '';
}
