// functions/api/weather.ts
export const onRequest: PagesFunction = async ({ request, env }) => {
  try {
    const urlObj = new URL(request.url);
    const nx = urlObj.searchParams.get("nx");         // 예: "62"
    const ny = urlObj.searchParams.get("ny");         // 예: "120"
    const base_date = urlObj.searchParams.get("date"); // 예: "20250918"
    const base_time = urlObj.searchParams.get("time"); // 예: "0600"
    const type = urlObj.searchParams.get("type") || "JSON"; // JSON or XML

    if (!nx || !ny || !base_date || !base_time) {
      return new Response(JSON.stringify({ error: "nx, ny, date, time are required" }), { status: 400 });
    }

    const serviceKey = env.KMA_API_KEY; // ← 환경변수(URLEncoded 권장)
    // 초단기예보(또는 동네예보) 엔드포인트 중 하나 선택
    const endpoint =
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

    const q = new URLSearchParams({
      serviceKey,           // 이미 인코딩된 키 사용 권장
      pageNo: "1",
      numOfRows: "60",
      dataType: type,
      base_date,
      base_time,
      nx,
      ny,
    });

    const apiUrl = `${endpoint}?${q.toString()}`;
    const res = await fetch(apiUrl, { method: "GET" });
    const text = await res.text(); // JSON/CSV/XML 모두 대응

    // JSON이라면 파싱해서 필요한 항목만 추려 반환해도 됩니다.
    return new Response(text, {
      headers: { "Content-Type": type === "JSON" ? "application/json" : "application/xml" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), { status: 500 });
  }
};
