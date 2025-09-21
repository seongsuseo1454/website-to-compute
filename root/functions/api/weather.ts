// /functions/api/weather.ts
export interface Env { KMA_KEY: string }

function toGrid(lat: number, lon: number) {
  // (논산 대략 좌표 → 기상청 격자 변환) 간단히 고정 격자 사용 원하시면 nx=60, ny=127 사용
  return { nx: 60, ny: 127 };
}

function fmtBase(){
  const d = new Date();
  // 기상청 초단기실황은 10분 단위, 발표시각 00/10/20/30/40/50분
  const mm = d.getMinutes();
  const base = new Date(d);
  base.setMinutes(Math.floor(mm/10)*10 - 10, 0, 0); // 직전 발표시각
  const y = base.getFullYear();
  const m = (base.getMonth()+1).toString().padStart(2,'0');
  const day = base.getDate().toString().padStart(2,'0');
  const hh = base.getHours().toString().padStart(2,'0');
  const min = base.getMinutes().toString().padStart(2,'0');
  return { base_date: `${y}${m}${day}`, base_time: `${hh}${min}` };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const nx = url.searchParams.get('nx');   // 지정 시 우선
    const ny = url.searchParams.get('ny');

    const { base_date, base_time } = fmtBase();
    const grid = nx && ny ? { nx, ny } : toGrid(36.187, 127.098); // 논산 대략 위경도
    const key = ctx.env.KMA_KEY;
    const api = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
    const qs = new URLSearchParams({
      serviceKey: key,
      pageNo: '1',
      numOfRows: '60',
      dataType: 'JSON',
      base_date, base_time,
      nx: String(grid.nx), ny: String(grid.ny)
    });

    const res = await fetch(`${api}?${qs.toString()}`);
    if (!res.ok) throw new Error('KMA HTTP '+res.status);
    const json: any = await res.json();

    const items = json?.response?.body?.items?.item
 || [];
    const map: Record<string,string> = {};
    for (const it of items) map[it.category] = it.obsrValue;

    const tempC = map.T1H ? Number(map.T1H) : undefined;   // 기온(℃)
    const reh   = map.REH ? Number(map.REH) : undefined;   // 습도(%)
    const wsd   = map.WSD ? Number(map.WSD) : undefined;   // 풍속(m/s)
    const rn1   = map.RN1 ? (map.RN1 === '강수없음' ? 0 : Number(map.RN1)) : 0; // 1시간 강수(mm)

    return new Response(JSON.stringify({ ok:true, tempC, reh, wsd, rn1 }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), {
      status: 200, headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
};

