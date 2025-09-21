// Cloudflare Pages Functions
// 예: /api/weather?nx=60&ny=127&date=20250918&time=063000&type=JSON
export const onRequestGet = async ({ env, request }) => {
  const url = new URL(request.url);
  const nx = url.searchParams.get('nx') || '60';
  const ny = url.searchParams.get('ny') || '127';
  const baseDate = url.searchParams.get('date');
  const baseTime = url.searchParams.get('time');
  const dataType = (url.searchParams.get('type') || 'JSON').toUpperCase();

  const key = env.KMA_SERVICE_KEY; // (일반인증키)
  if (!key){
    return new Response(JSON.stringify({ error:'KMA_SERVICE_KEY missing' }), { status:500 });
  }

  if (!baseDate || !baseTime){
    return new Response(JSON.stringify({ error:'date/time required' }), { status:400 });
  }

  // 초단기예보(1시간 이내): getUltraSrtFcst
  const endpoint = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst';

  const params = new URLSearchParams({
    serviceKey: key,
    pageNo: '1',
    numOfRows: '1000',
    dataType,
    base_date: baseDate,
    base_time: baseTime.slice(0,4), // HHMM만 사용
    nx, ny
  });

  const apiUrl = `${endpoint}?${params.toString
()}`;

  try{
    const res = await fetch(apiUrl, { headers:{ 'Accept':'application/json' }});
    if (!res.ok){
      const t = await res.text();
      return new Response(JSON.stringify({ error:t||res.statusText }), { status:res.status });
    }
    // KMA는 XML/JSON을 dataType에 따라 반환
    const text = await res.text();
    if (dataType === 'JSON'){
      // 그대로 JSON으로 전달
      return new Response(text, { headers:{ 'Content-Type':'application/json' }});
    } else {
      return new Response(text, { headers:{ 'Content-Type':'application/xml' }});
    }
  }catch(e){
    return new Response(JSON.stringify({ error:e.message }), { status:500 });
  }
};

