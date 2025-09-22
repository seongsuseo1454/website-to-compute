// /functions/api/weather.js
export async function onRequest({ request, env }) {
  try {
    const u = new URL(request.url);
    const nx = u.searchParams.get('nx') || '60';
    const ny = u.searchParams.get('ny') || '127';
    const KEY = env && env.WEATHER_API_KEY;
    if (!KEY) {
      return new Response(JSON.stringify({ summary: '날씨 키 미설정 · 기본 위치(' + nx + ',' + ny + ')' }), { status: 200 });
    }
    // 여기는 실제 API 연결부(운영 시 교체)
    return new Response(JSON.stringify({ summary: '26℃ · 습도 58% · 풍속 1.8 m/s' }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ summary: '날씨 정보를 불러올 수 없습니다.' }), { status: 200 });
  }
}
