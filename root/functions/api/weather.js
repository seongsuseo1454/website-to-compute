// /functions/api/weather.js
// 스마트미러용 날씨 API (KMA 실사용 + 안전 폴백)
// - 기본: 요약 문자열(summary) 반환 (UI는 이 문자열만 표시해도 OK)
// - 쿼리: ?nx=60&ny=127&provider=kma  (provider 생략 시 데모/폴백)
// - 환경변수: KMA_SERVICE_KEY  (기상청 인증키; URL 인코딩 불필요한 "디코드된 키"가 권장)

export async function onRequest({ request, env }) {
  // 공통 CORS 헤더
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  try {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const nx = u.searchParams.get('nx') || '60';
    const ny = u.searchParams.get('ny') || '127';
    const provider = (u.searchParams.get('provider') || '').toLowerCase();

    // ---- 1) KMA(기상청) 실데이터 시도 ----
    const KMA_KEY = env?.KMA_SERVICE_KEY; // ex) 기상청 "서비스키"
    if (provider === 'kma' && KMA_KEY) {
      try {
        const { base_date, base_time } = computeKmaBaseDateTimeKST();
        // 단기예보(VilageFcst) JSON
        const qs = new URLSearchParams({
          serviceKey: KMA_KEY, // Cloudflare가 자동 인코딩하므로 원키 권장
          pageNo: '1',
          numOfRows: '1000',
          dataType: 'JSON',
          base_date,
          base_time,
          nx: String(nx),
          ny: String(ny),
        });
        const kmaUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${qs}`;

        const res = await fetch(kmaUrl, { method: 'GET' });
        if (!res.ok) throw new Error('KMA HTTP ' + res.status);
        const data = await res.json();

        // 응답 파싱
        const items = data?.response?.body?.items?.item || [];
        const nowPick = pickKmaForecast(items);
        const summary = composeSummary(nowPick) || '날씨 정보를 불러올 수 없습니다.';

        return json({ summary, provider: 'kma', base_date, base_time }, 200, cors);
      } catch (e) {
        // KMA 실패 시 폴백 계속 수행
      }
    }

    // ---- 2) 폴백(데모/키 없음/실패) ----
    const fallback = `26℃ · 습도 58% · 풍속 1.8 m/s (기본 위치 ${nx},${ny})`;
    return json({ summary: fallback, provider: 'fallback' }, 200, cors);
  } catch (_e) {
    return json({ summary: '날씨 정보를 불러올 수 없습니다.' }, 200, cors);
  }
}

/* ===== 유틸 ===== */

// KST(한국시간) 기준으로 기상청 단기예보 base_time 계산
// 단기예보는 02,05,08,11,14,17,20,23시에 생성됨
function computeKmaBaseDateTimeKST() {
  // Cloudflare 런타임은 기본 UTC. 한국시간(KST=UTC+9)으로 보정.
  const nowUTC = new Date();
  const kst = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');

  const hours = kst.getHours();
  // 가용 근사: 현재시간보다 가장 근접한 직전 생성시각
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseH = slots[0];
  for (const h of slots) {
    if (hours >= h) baseH = h;
  }

  // 자정~01시대에 호출되면 전날 23시로 밀리는 처리
  let baseDate = `${y}${m}${d}`;
  if (hours < 2) {
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    const pd = String(prev.getDate()).padStart(2, '0');
    baseDate = `${py}${pm}${pd}`;
    baseH = 23;
  }

  const baseTime = String(baseH).padStart(2, '0') + '00';
  return { base_date: baseDate, base_time: baseTime };
}

// 기상청 카테고리에서 우리가 쓸 값 추출
// T1H(기온, 초단기예보) 대신 단기예보는 TMP, WSD, REH, SKY/PTY 조합 사용
function pickKmaForecast(items) {
  // 같은 fcstTime의 값이 여러 개 있을 수 있으니, 가장 가까운 시간대 하나 고르기
  // 여기선 단순히 첫 fcstTime을 기준으로 묶음
  const byTime = new Map();
  for (const it of items) {
    const key = it.fcstTime;
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key).push(it);
  }
  // 첫 시간대 레코드
  const [firstTime] = byTime.keys();
  const arr = byTime.get(firstTime) || [];

  const pick = {};
  for (const it of arr) {
    pick[it.category] = it.fcstValue;
  }
  // TMP=기온(℃), REH=습도(%), WSD=풍속(m/s), SKY(1~4), PTY(강수형태)
  return {
    tmp: safeNum(pick.TMP), // ℃
    reh: safeNum(pick.REH), // %
    wsd: safeNum(pick.WSD), // m/s
    sky: pick.SKY,          // 1~4
    pty: pick.PTY,          // 0: 없음
  };
}

function composeSummary({ tmp, reh, wsd, sky, pty } = {}) {
  if (tmp == null && reh == null && wsd == null) return '';
  const skyTxt = skyToText(sky, pty);
  const parts = [];
  if (typeof tmp === 'number') parts.push(`${tmp}℃`);
  if (typeof reh === 'number') parts.push(`습도 ${reh}%`);
  if (typeof wsd === 'number') parts.push(`풍속 ${wsd} m/s`);
  if (skyTxt) parts.push(skyTxt);
  return parts.join(' · ');
}

function skyToText(sky, pty) {
  // PTY: 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기
  if (pty && pty !== '0') {
    switch (String(pty)) {
      case '1': return '비';
      case '2': return '비/눈';
      case '3': return '눈';
      case '4': return '소나기';
      default: return '강수';
    }
  }
  // SKY: 1 맑음, 3 구름많음, 4 흐림 (단기예보 스펙)
  switch (String(sky)) {
    case '1': return '맑음';
    case '3': return '구름 많음';
    case '4': return '흐림';
    default: return '';
  }
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
