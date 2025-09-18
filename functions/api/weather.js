export async function onRequestGet({ request, env }) {
  // 쿼리 ?city=Seoul 같은 값 받기
  const url = new URL(request.url);
  const city = url.searchParams.get('city') || 'Seoul';
  // TODO: 기상청/공공데이터 API 호출 (env.KMA_API_KEY 사용)
  // 데모 데이터:
  return new Response(JSON.stringify({
    city, tempC: 27, humidity: 64, pm25: 18, pm10: 42, condition: '맑음'
  }), { headers: { 'Content-Type': 'application/json' } });
}
