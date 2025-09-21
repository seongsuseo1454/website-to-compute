// /functions/api/weather.ts (Cloudflare Pages Functions)
export const onRequestGet: PagesFunction<{
  KMA_KEY: string;
}> = async ({ request, env }) => {
  try {
    const { searchParams } = new URL(request.url);
    const nx = searchParams.get('nx') || '60';
    const ny = searchParams.get('ny') || '127';
    const type = (searchParams.get('type') || 'JSON').toUpperCase();

    // 1) 기상청 발표 시각(3시간 간격) 자동 보정
    const now = new Date();
    // KMA 발표는 02,05,08,11,14,17,20,23 시 정각 기준
    const candidates = [23, 20, 17, 14, 11, 8, 5, 2];
    let baseDate = formatDateYYYYMMDD(now);
    let baseTime = pickLatestBaseTime(now.getHours(), candidates);

    // 자정 직후(00~01시)는 전날 23:00으로 내려가야 함
    if (baseTime === '23:00' && now.getHours() < 2) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      baseDate = formatDateYYYYMMDD(yesterday);
    }

    const base_date = baseDate.replace(/-/g, '');
    const base_time = baseTime.replace(':', '').padStart(4, '0'); // "0500" 형식

    const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst');
    url.searchParams.set('serviceKey', env.KMA_KEY);
    url.searchParams.set('numOfRows', '1000');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('dataType', type);  // JSON
    url.searchParams.set('base_date', base_date);
    url.searchParams.set('base_time', base_time);
    url.searchParams.set('nx', String(nx));
    url.searchParams.set('ny', String(ny));

    const r = await fetch(url.toString
());
    if (!r.ok) {
      return json({ ok: false, reason: 'HTTP_' + r.status, url: url.toString
() }, 502);
    }
    const data = await r.json();

    // 응답 구조 방어
    const items =
      data?.response?.body?.items?.item
 ||
      data?.response?.body?.items ||
      data?.response?.body ||
      [];

    if (!Array.isArray(items) || items.length === 0) {
      return json({ ok: false, reason: 'EMPTY', base_date, base_time, url: url.toString
() }, 200);
    }

    // 간단 요약(기온/강수/하늘상태)
    const summary = summarizeKma(items);
    return json({ ok: true, base_date, base_time, ...summary });
  } catch (e: any) {
    return json({ ok: false, reason: 'EXCEPTION', detail: String(e?.message || e) }, 500);
  }
};

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// 현재 시(hour) 기준으로 직전(또는 같은) 발표시각 선택
function pickLatestBaseTime(currHour: number, cands: number[]) {
  for (const h of cands) {
    if (currHour >= h) return `${String(h).padStart(2, '0')}:00`;
  }
  return '23:00'; // 새벽 0~1시는 전날 23시
}

function summarizeKma(items: any[]) {
  // 기온(T1H), 강수형태(PTY), 하늘상태(SKY)
  const pick = (cat: string) => items.find((it) => it.category === cat)?.fcstValue;

  const t1h = pick('T1H'); // °C
  const pty = pick('PTY'); // 0없음 1비 2비/눈 3눈 4소나기 5빗방울 6빗방울눈날림 7눈날림
  const sky = pick('SKY'); // 1맑음 3구름많음 4흐림

  return {
    tempC: t1h ? Number(t1h) : null,
    pty: pty ?? null,
    sky: sky ?? null,
  };
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
