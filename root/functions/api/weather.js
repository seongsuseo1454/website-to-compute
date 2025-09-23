// /functions/api/weather.js
// 스마트미러용 종합 기상/재해 정보 API (KMA)
// v1.1 (stable): 무중단 대응(재시도, 캐시, 폴백), CORS/OPTIONS 대응
//
// 사용법:
//  - /api/weather?nx=60&ny=127                 → 현재예보 요약
//  - /api/weather?nx=60&ny=127&disaster=true   → + 재해 요약(지진/태풍/특보)
//  - /api/weather?debug=true                   → 디버그 필드 포함
//
// 환경변수:
//  - KMA_SERVICE_KEY (기상청 서비스키; URL 인코딩 금지, 원본 키 그대로)

export async function onRequest(context) {
  const { request, env } = context;

  // --- 공통 CORS ---
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const url = new URL(request.url);
    const nx = url.searchParams.get('nx') || '60';
    const ny = url.searchParams.get('ny') || '127';
    const includeDisaster = url.searchParams.get('disaster') === 'true';
    const debug = url.searchParams.get('debug') === 'true';

    // 0) 캐시 키 (좌표/옵션 단위로 캐시)
    const cacheKey = new Request(request.url, { method: 'GET' });
    const cached = await cacheGet(cacheKey);
    if (cached) return withCors(cached, cors);

    // 1) 기본 날씨 (에러여도 폴백 요약 보장)
    const weather = await getWeatherInfo(env, nx, ny, debug);

    // 2) (선택) 재해정보 (부분 실패 허용)
    const result = { weather, timestamp: new Date().toISOString() };
    if (includeDisaster) {
      const disasters = await getDisasterInfo(env, debug);
      result.disasters = disasters;

      if (disasters.active?.length > 0) {
        const alertSummary = disasters.active.map(d => d.type).join(', ');
        result.summary = `⚠️ ${alertSummary} | ${weather.summary}`;
      } else {
        result.summary = `✅ 특보 없음 | ${weather.summary}`;
      }
    } else {
      result.summary = weather.summary;
    }

    const response = json(result, 200);
    await cachePut(cacheKey, response.clone()); // 성공 시 캐시
    return withCors(response, cors);
  } catch (err) {
    // 절대 503/500로 죽이지 않음: 안전 폴백 200
    console.error('[Weather] FATAL:', err);
    const response = json({
      summary: '26℃ · 맑음 · 습도 58% · 풍속 1.8 m/s (폴백)',
      provider: 'fallback-fatal',
      error: String(err?.message || err),
      timestamp: new Date().toISOString(),
    }, 200);
    return withCors(response, cors);
  }
}

/* -------------------------
 * 1) 기본 날씨 (동네예보)
 * ------------------------- */
async function getWeatherInfo(env, nx, ny, debug) {
  const serviceKey = env?.KMA_SERVICE_KEY;
  if (!serviceKey) {
    return { summary: '26℃ · 맑음 · 습도 58% · 풍속 1.8 m/s', provider: 'fallback-no-key' };
  }

  try {
    const { base_date, base_time } = getKmaBaseDateTime();

    const apiUrl = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
    apiUrl.searchParams.set('serviceKey', serviceKey); // 원본키 그대로(인코딩 X)
    apiUrl.searchParams.set('pageNo', '1');
    apiUrl.searchParams.set('numOfRows', '1000');
    apiUrl.searchParams.set('dataType', 'JSON');
    apiUrl.searchParams.set('base_date', base_date);
    apiUrl.searchParams.set('base_time', base_time);
    apiUrl.searchParams.set('nx', nx);
    apiUrl.searchParams.set('ny', ny);

    const data = await fetchJSONWithRetry(apiUrl.toString(), {
      timeoutMs: 5000,
      retries: 3,
      backoffMs: 400,
      headers: { 'User-Agent': 'SmartMirror-Weather/1.1' },
    });

    if (data?.response?.header?.resultCode !== '00') {
      throw new Error(`Invalid weather response: ${data?.response?.header?.resultMsg || 'unknown'}`);
    }

    const items = data?.response?.body?.items?.item || [];
    const parsed = parseWeatherData(items);

    return {
      summary: createWeatherSummary(parsed),
      provider: 'kma',
      data: debug ? parsed : undefined,
    };
  } catch (e) {
    console.warn('[Weather] weather fetch degraded:', e?.message || e);
    return { summary: '26℃ · 맑음 · 습도 58% · 풍속 1.8 m/s (캐시/폴백)', provider: 'degraded', error: String(e?.message || e) };
  }
}

/* -------------------------
 * 2) 재해정보 (지진/태풍/특보)
 * ------------------------- */
async function getDisasterInfo(env, debug) {
  const serviceKey = env?.KMA_SERVICE_KEY;
  if (!serviceKey) return { active: [], provider: 'no_key' };

  const result = { active: [], earthquake: [], typhoon: [], warnings: [] };

  try {
    const [eq, ty, wr] = await Promise.allSettled([
      getEarthquakeInfo(serviceKey),
      getTyphoonInfo(serviceKey),
      getWeatherWarnings(serviceKey),
    ]);

    if (eq.status === 'fulfilled' && eq.value.length > 0) {
      result.earthquake = eq.value;
      result.active.push({ type: '지진', count: eq.value.length, latest: eq.value[0] });
    }
    if (ty.status === 'fulfilled' && ty.value.length > 0) {
      result.typhoon = ty.value;
      result.active.push({ type: '태풍', count: ty.value.length, latest: ty.value[0] });
    }
    if (wr.status === 'fulfilled' && wr.value.length > 0) {
      result.warnings = wr.value;
      for (const w of wr.value) result.active.push({ type: w.type, level: w.level, area: w.area });
    }

    return result;
  } catch (e) {
    console.warn('[Weather] disaster degraded:', e?.message || e);
    return { active: [], error: String(e?.message || e) };
  }
}

async function getEarthquakeInfo(serviceKey) {
  try {
    const url = new URL('https://apis.data.go.kr/1360000/EqkInfoService/getEqkMsg');
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    url.searchParams.set('dataType', 'JSON');

    const data = await fetchJSONWithRetry(url.toString(), { timeoutMs: 5000, retries: 3, backoffMs: 400 });
    const items = data?.response?.body?.items?.item || [];
    return items.map(it => ({
      time: it.tmEqk,
      location: it.loc,
      magnitude: it.mag,
      depth: it.dep,
      message: it.rem,
    }));
  } catch { return []; }
}

async function getTyphoonInfo(serviceKey) {
  try {
    const url = new URL('https://apis.data.go.kr/1360000/TyphoonInfoService/getTyphoonInfo');
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    url.searchParams.set('dataType', 'JSON');

    const data = await fetchJSONWithRetry(url.toString(), { timeoutMs: 5000, retries: 3, backoffMs: 400 });
    const items = data?.response?.body?.items?.item || [];
    return items.map(it => ({
      name: it.typnKor,
      number: it.typnSeq,
      status: it.typnSt,
      position: `${it.lat}, ${it.lon}`,
      pressure: it.pres,
      windSpeed: it.ws,
    }));
  } catch { return []; }
}

async function getWeatherWarnings(serviceKey) {
  try {
    const url = new URL('https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg');
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    url.searchParams.set('dataType', 'JSON');

    const data = await fetchJSONWithRetry(url.toString(), { timeoutMs: 5000, retries: 3, backoffMs: 400 });
    const items = data?.response?.body?.items?.item || [];
    return items.map(it => ({
      type: getWarningType(it.t1, it.t2),
      level: it.lvl,
      area: it.re,
      startTime: it.tmFc,
      endTime: it.tmSeq,
    }));
  } catch { return []; }
}

/* -------------------------
 * 유틸
 * ------------------------- */

// 타임아웃 + 재시도(fetch → JSON)
async function fetchJSONWithRetry(url, {
  timeoutMs = 5000,
  retries = 3,
  backoffMs = 400,
  headers = {}
} = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { headers, signal: ctrl.signal });
      clearTimeout(to);

      if (!res.ok) {
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
          await sleep(backoffMs * Math.pow(2, attempt) + jitter(200));
          attempt++;
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(backoffMs * Math.pow(2, attempt) + jitter(200));
        attempt++;
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error('Unknown fetch error');
}

function jitter(max) { return Math.floor(Math.random() * max); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getWarningType(t1, t2) {
  const map = { 강풍: '강풍', 호우: '호우', 대설: '대설', 한파: '한파', 폭염: '폭염', 태풍: '태풍', 해일: '해일' };
  return map[t1] || map[t2] || '기상특보';
}

function parseWeatherData(items) {
  // category: TMP, REH, WSD, PTY, SKY
  const byTime = {};
  for (const it of items) {
    const t = it.fcstTime;
    if (!byTime[t]) byTime[t] = {};
    byTime[t][it.category] = it.fcstValue;
  }
  const times = Object.keys(byTime).sort();
  const d = byTime[times[0]] || {};

  return {
    temperature: toNum(d.TMP),
    humidity: toNum(d.REH),
    windSpeed: toNum(d.WSD),
    skyCondition: d.SKY ?? null,
    precipitation: d.PTY ?? '0',
  };
}

function createWeatherSummary(d) {
  const parts = [];
  if (isNum(d.temperature)) parts.push(`${Math.round(d.temperature)}℃`);
  const cond = getWeatherCondition(d.skyCondition, d.precipitation);
  if (cond) parts.push(cond);
  if (isNum(d.humidity)) parts.push(`습도 ${Math.round(d.humidity)}%`);
  if (isNum(d.windSpeed)) parts.push(`풍속 ${Number(d.windSpeed).toFixed(1)} m/s`);
  return parts.join(' · ');
}

function getWeatherCondition(sky, pty) {
  if (pty && pty !== '0') {
    const types = { '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
    return types[pty] || '강수';
  }
  const skyTypes = { '1': '맑음', '3': '구름많음', '4': '흐림' };
  return skyTypes[sky] || '';
}

function getKmaBaseDateTime() {
  // KST 기준, 발표시각(02,05,08,11,14,17,20,23) 중 직전 값 사용
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  const h = kst.getHours();

  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseHour = 23;
  let baseDate = `${y}${m}${d}`;

  for (let i = slots.length - 1; i >= 0; i--) {
    if (h >= slots[i]) { baseHour = slots[i]; break; }
  }
  if (h < 2) {
    const yst = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    baseDate = `${yst.getFullYear()}${String(yst.getMonth() + 1).padStart(2, '0')}${String(yst.getDate()).padStart(2, '0')}`;
    baseHour = 23;
  }
  return { base_date: baseDate, base_time: String(baseHour).padStart(2, '0') + '00' };
}

// ---- 공용 응답/캐시 ----
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
function withCors(res, cors) {
  const r = new Response(res.body, res);
  Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

// Cloudflare(권장): caches.default, 기타: 메모리 캐시
const memCache = {};
const DEFAULT_TTL = 600; // 10분

async function cacheGet(req) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const hit = await caches.default.match(req);
      if (hit) return hit;
    } else {
      const key = req.url;
      const item = memCache[key];
      if (item && Date.now() < item.exp) return item.res.clone();
    }
  } catch (e) {
    console.warn('[Weather] cacheGet warn:', e?.message || e);
  }
  return null;
}

async function cachePut(req, res, ttlSec = DEFAULT_TTL) {
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const r = new Response(res.body, res);
      r.headers.set('Cache-Control', `public, max-age=${ttlSec}`);
      await caches.default.put(req, r);
    } else {
      const key = req.url;
      memCache[key] = { res: res.clone(), exp: Date.now() + ttlSec * 1000 };
    }
  } catch (e) {
    console.warn('[Weather] cachePut warn:', e?.message || e);
  }
}

function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
