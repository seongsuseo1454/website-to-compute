// _worker.js — Cloudflare Pages Functions (single file)
// /api/chat  : Gemini 대화(없으면 데모 응답)
// /api/weather : 기상청 단기예보(키 없으면 에러 반환)
// /api/health  : 키 보유 상태 헬스체크

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    // 공통 CORS (필요 시)
    if (req.method
 === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
      });
    }

    // 헬스체크
    if (url.pathname === '/api/health') {
      return json({ ok: true, gemini: !!env.GEMINI_API_KEY, kma: !!env.KMA_API_KEY });
    }

    // Gemini 채팅
    if (url.pathname === '/api/chat' && req.method
 === 'POST') {
      try {
        const body = await safeJson(req);
        const text = String(body?.text || body?.message || '안녕하세요');

        // 키 없으면 데모 응답
        if (!env.GEMINI_API_KEY) {
          return json({ ok: true, reply: `🔧(데모) ${text}` });
        }

        const r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=
' + env.GEMINI_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text }]}],
            }),
          },
        );

        if (!r.ok) {
          const err = await safeText(r);
          return json({ ok: false, error: 'Gemini API error', detail: err }, { status: 502 });
        }

        const j = await r.json();
        const reply = j?.candidates?.[0]?.content?.parts?.[0]?.text || '응답이 없습니다.';
        return json({ ok: true, reply });
      } catch (e) {
        return json({ ok: false, error: String(e?.message || e) }, { status: 500 });
      }
    }

    // 기상청 초단기실황/단기예보 샘플 (nx, ny, base_date/time 필요)
    // 클라이언트에서 /api/weather?nx=55&ny=127&base_date=20250918&base_time=0500 처럼 호출
    if (url.pathname === '/api/weather' && req.method
 === 'GET') {
      if (!env.KMA_API_KEY) {
        return json({ ok: false, error: 'KMA_API_KEY 없음' }, { status: 500 });
      }

      // 기본값(서울 중구 근처 좌표 예시)
      const nx = url.searchParams.get('nx') ?? '60';
      const ny = url.searchParams.get('ny') ?? '127';
      const base_date = url.searchParams.get('base_date') ?? yyyymmddKST();
      const base_time = url.searchParams.get('base_time') ?? nearestBaseTimeKST(); // 0500, 0800 등 3시간 단위

      const endpoint =
        'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst'
        + '?serviceKey=' + encodeURIComponent(env.KMA_API_KEY)
        + '&numOfRows=60&pageNo=1&dataType=JSON'
        + `&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;

      const r = await fetch(endpoint);
      if (!r.ok) {
        const err = await safeText(r);
        return json({ ok: false, error: 'KMA API error', detail: err }, { status: 502 });
      }

      const j = await r.json();
      return json({ ok: true, weather: j });
    }

    // 정적 파일/페이지는 Pages가 처리
    return new Response('Not found', { status: 404 });
  },
};

// ---------- helpers ----------
function json(obj, init = {}) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
  return new Response(JSON.stringify(obj), { ...init
, headers: { ...headers, ...(init.headers || {}) } });
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '(no text)';
  }
}

// 한국 기준 YYYYMMDD
function yyyymmddKST(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}
// 초단기 예보 base_time(매 정시 기준 가장 가까운 과거 정시)
function nearestBaseTimeKST(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const h = kst.getUTCHours();
  // 보통 00, 01, 02 ... 단위도 있으나 예시로 최근 시간의 두 자리 분해
  return String(h).padStart(2, '0') + '00';
}
