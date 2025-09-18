export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, gemini: !!env.GEMINI_API_KEY, weather: !!env.KMA_API_KEY });
    }

    if (url.pathname === "/api/chat") {
      const body = await req.json();
      const text = body.text || "안녕하세요";

      if (!env.GEMINI_API_KEY) {
        return Response.json({ ok: true, reply: `[데모 응답] ${text}` });
      }

      // Gemini API 호출
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text }]}] }),
      });
      const j = await r.json();
      return Response.json({ ok: true, reply: j?.candidates?.[0]?.content?.parts?.[0]?.text || "응답 없음" });
    }

    if (url.pathname === "/api/weather") {
      if (!env.KMA_API_KEY) {
        return Response.json({ ok: false, error: "KMA_API_KEY 없음" }, { status: 500 });
      }
      // 기상청 단기예보 예시 (nx, ny 좌표 필요)
      const endpoint = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${env.KMA_API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&base_date=20250918&base_time=0500&nx=55&ny=127`;
      const r = await fetch(endpoint);
      const j = await r.json();
      return Response.json({ ok: true, weather: j });
    }

    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}
