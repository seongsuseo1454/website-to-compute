// functions/api/weather.ts
// GET /api/weather?nx=60&ny=127&date=20250918&time=0600&type=JSON

export const onRequest: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const nx = url.searchParams.get("nx");
    const ny = url.searchParams.get("ny");
    const base_date = url.searchParams.get("date");
    const base_time = url.searchParams.get("time");
    const type = (url.searchParams.get("type") || "JSON").toUpperCase(); // JSON/XML

    if (!nx || !ny || !base_date || !base_time) {
      return new Response(
        JSON.stringify({ error: "nx, ny, date, time are required" }),
        { status: 400, headers: corsJson(type) }
      );
    }

    // 초단기예보 API (원하면 동네예보로 교체 가능)
    const endpoint =
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

    const q = new URLSearchParams({
      serviceKey: env.KMA_API_KEY,     // URL-encoded 키 권장
      pageNo: "1",
      numOfRows: "60",
      dataType: type,
      base_date,
      base_time,
      nx,
      ny,
    });

    const apiUrl = `${endpoint}?${q.toString()}`;
    const res = await fetch(apiUrl);
    const payload = await res.text();

    return new Response(payload, {
      status: res.status,
      headers: corsJson(type),
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: corsJson("JSON"),
    });
  }
};

function corsJson(type?: string) {
  const ct = type === "XML" ? "application/xml" : "application/json";
  return {
    "Content-Type": ct,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
