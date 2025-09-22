// /functions/api/weather.js
// GET /api/weather?nx=60&ny=127
// 실제 연동 전까지는 데모(서울 기준)와 키 미설정 폴백 제공

export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    const nx = url.searchParams.get("nx") || "60";
    const ny = url.searchParams.get("ny") || "127";

    // 실제 기상청/외부 API 연동을 원하면 여기에 구현.
    // 현재는 키 없이도 UI 확인 가능하도록 데모 응답 고정.
    const demo = {
      summary: "현재(서울, nx=" + nx + ", ny=" + ny + ") · 26°C · 습도 58% · 풍속 1.8 m/s",
      temp: 26, rh: 58, ws: 1.8, rain: 0
    };
    return new Response(JSON.stringify(demo), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ summary: "날씨 불러오기 실패" }), { status: 200 });
  }
}
