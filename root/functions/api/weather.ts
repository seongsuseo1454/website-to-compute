// /functions/api/weather.ts
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  const u = new URL(request.url);

  const nx = u.searchParams.get('nx') ?? '60';
  const ny = u.searchParams.get('ny') ?? '127';
  const type = (u.searchParams.get('type') ?? 'JSON').toUpperCase();

  // ① 날짜/시간이 없으면 기상청 유효 시각으로 자동 계산
  const now = new Date();
  // 초단기실황(30분 간격) 기준으로 최근 유효 시각으로 보정
  const m = now.getMinutes() >= 30 ? '30' : '00';
  const hh = String(now.getHours()).padStart(2, '0');
  let baseDate = u.searchParams.get('date');
  let baseTime = u.searchParams.get('time');

  if (!baseDate || !baseTime) {
    // 기준시각이 미래로 잡히는 경우 30분 이전으로 롤백
    const base = new Date(now);
    if (m === '00') base.setHours(base.getHours() - 1);
    const bd = base.toISOString
().slice(0, 10).replaceAll('-', '');
    const bt = `${String(base.getHours()).padStart(2, '0')}${m}`;
    baseDate = baseDate ?? bd;
    baseTime = baseTime ?? bt;
  }

  // ② API 키 인코딩 이슈 방어(이미 인코딩돼 있든 아니든 정상화)
  const rawKey = env.WEATHER_API_KEY || '';
  const serviceKey = (() => {
    try {
      // 이미 인코딩된 키면 decode → encode 순으로 정규화
      return encodeURIComponent(decodeURIComponent(rawKey));
    } catch {
      // 디코드 실패 시 원본을 인코딩
      return encodeURIComponent(rawKey);
    }
  })();

  // 초단기 실황(현재값). 예보를 원하면 getVilageFcst로 바꾸세요.
  const endpoint =
    'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst
';

  const qs = new URLSearchParams({
    serviceKey,
    pageNo: '1',
    numOfRows: '1000',
    dataType: type,
    base_date: baseDate!,
    base_time: baseTime!,
    nx, ny,
  });

  const url = `${endpoint}?${qs.toString()}`;

  try {
    const res = await fetch(url);
    const text = await res.text(); // 가끔 JSON인데 text로 와서 방어
    let data: any = text;

    try { data = JSON.parse(text); } catch {/* 그대로 text 유지 */}

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: 'KMA API error',
        status: res.status,
        detail: data,
        hint: '키/시간/좌표를 확인하세요.',
      }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(
      typeof data === 'string' ? data : JSON.stringify(data),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({
      error: '서버 호출 실패',
      detail: String(e),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
