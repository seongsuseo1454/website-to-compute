// /functions/api/weather.ts
export const onRequestGet: PagesFunction<{ KMA_KEY: string }> = async ({ request, env }) => {
  try {
    const { searchParams } = new URL(request.url);
    const nx = searchParams.get('nx') || '60';   // 논산 기본
    const ny = searchParams.get('ny') || '127';
    const type = (searchParams.get('type') || 'JSON').toUpperCase();

    const now = new Date();
    const base = pickBase(now);
    let base_date = fmtDate(base.date);
    let base_time = base.time.replace(':', '').padStart(4, '0');

    const url = new URL(
      'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst
'
    );
    url.searchParams.set('serviceKey', env.KMA_KEY);
    url.searchParams.set('numOfRows', '1000');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('dataType', type);
    url.searchParams.set('base_date', base_date);
    url.searchParams.set('base_time', base_time);
    url.searchParams.set('nx', nx);
    url.searchParams.set('ny', ny);

    const r = await fetch(url.toString
());
    if (!r.ok) return j({ ok: false, reason: 'HTTP_' + r.status }, 502);
    const data = await r.json();
    const items = data?.response?.body?.items?.item
 ?? [];
    if (!Array.isArray(items) || items.length === 0)
      return j({ ok: false, reason: 'EMPTY', base_date, base_time }, 200);

    const s = summarize(items);
    return j({ ok: true, base_date, base_time, ...s });
  } catch (e: any) {
    return j({ ok: false, reason: 'EXCEPTION', detail: String(e?.message || e) }, 500);
  }
};

function pickBase(now: Date) {
  // 발표시각 02,05,08,11,14,17,20,23
  const cand = [23, 20, 17, 14, 11, 8, 5, 2];
  const h = now.getHours();
  for (const x of cand) if (h >= x) return { date: now, time: `${pad2(x)}:00` };
  // 0~1시는 전날 23:00
  const y = new Date(now.getTime() - 86400000);
  return { date: y, time: '23:00' };
}
function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
function summarize(items: any[]) {
  const pick = (cat: string) => items.find((it) => it.category === cat)?.fcstValue;
  const tempC = pick('T1H'); const pty = pick('PTY'); const sky = pick('SKY');
  return { tempC: tempC ? Number(tempC) : null, pty: pty ?? null, sky: sky ?? null };
}
function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

