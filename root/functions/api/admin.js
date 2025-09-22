// /functions/api/admin.js
// GET /api/admin?list=SCHEDULE:TODAY (NEWS, DEPT 지원)
// GET /api/admin?seed=1 -> 데모 데이터 즉시 제공

const DEMO = {
  "SCHEDULE:TODAY": [
    { time: "10:00", title: "간부 회의", location: "본관 3층 상황실" },
    { time: "14:00", title: "지역 기업 대표 면담", location: "시장 집무실" },
    { time: "17:00", title: "청소년 진로 간담회", location: "시립도서관" }
  ],
  "NEWS": [
    { title: "논산시, AI 스마트미러 시범 운영", source: "시정홍보과", time: "09:00" },
    { title: "도시재생 뉴딜 공모 선정", source: "도시전략과", time: "11:00" }
  ],
  "DEPT": [
    { title: "복지과 주간업무 보고 완료", time: "08:40" },
    { title: "안전총괄과 태풍 대비 점검", time: "13:20" }
  ]
};

export async function onRequest({ request }) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("seed") === "1") {
      return new Response(JSON.stringify(DEMO), { status: 200 });
    }
    const key = url.searchParams.get("list") || "SCHEDULE:TODAY";
    const list = DEMO[key] || [];
    return new Response(JSON.stringify(list), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
}
