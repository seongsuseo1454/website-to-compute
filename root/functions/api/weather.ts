// functions/api/weather.ts
// Cloudflare Pages Functions (TypeScript)
// 기상청 단기예보/초단기예보 프록시 + CORS + 기본 유효성/기본값 처리

type Ctx = {
  request: Request;
  env: { KMA_API_KEY?: string };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });

const bad = (msg: string, status = 400) => json({ ok: false, error: msg }, status);

/** KST(UTC+9) 기준 현재 시각 */
const nowKST = () => {
  const now = new Date();
  // UTC+9 보정
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
};

/** 기상청 단기예보(base_time: 0200/0500/0800/1100/1400/1700/2000/2300)에서 가장 가까운 과거 슬롯 계산 */
function getNearestVillageBaseTimeKST(date: Date) {
  const slots = [200, 500, 800, 1100, 1400, 1700, 2000, 2300]; // HHmm 정수
  const hhmm = date.getHours() * 100 + (date.getMinutes() >= 30 ? 30 : 0); // 반올림 대신 00/30만 고려
  let chosen = slots[0];
  for (const s of slots) {
    if (hhmm >= s) chosen = s;
  }
  // 새벽 0~1시대는 전날 23:00 기준 사용
  const baseDate = new Date(date);
  if (hhmm < slots[0]) {
    baseDate.setDate(baseDate.getDate() - 1);
    return {
      base_date: fmtDateYYYYMMDD(baseDate),
      base_time: pad4(2300),
    };
  }
  return {
    base_date: fmtDateYYYYMMDD(baseDate),
    base_time: pad4(chosen),
  };
}

/** 초단기예보(base_time: 매 시각 30분 간격 권장) – 가장 최근 30분 단위로 내림 */
function getNearestUltraBaseTimeKST(date: Date) {
  const base = new Date(date);
  const m = base.getMinutes();
  base.setMinutes(m >= 30 ? 30 : 0, 0, 0);
  // 초단기는 보수적으로 30분 전 시각으로 한 번 더 내리기(배포 환경 시차 대비)
  if (m < 30) base.setHours(base.getHours() - 1);
  return {
    base_date: fmtDateYYYYMMDD(base),
    base_time: pad4(base.getHours() * 100 + base.getMinutes()),
  };
}

const pad2 = (n: number) => n.toString().padStart(2, "0");
const pad4 = (n: number) => n.toString().padStart(4, "0");
function fmtDateYYYYMMDD(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const onRequestGet: PagesFunction = async ({ request, env }: Ctx) => {
  try {
    const url = new URL(request.url);
    const q = url.searchParams;

    // 필수: KMA_API_KEY (Pages → Settings → Environment Variables에 설정)
    const KMA_API_KEY = env.KMA_API_KEY;
    if (!KMA_API_KEY) return bad("Missing env.KMA_API_KEY. Cloudflare Pages 환경변수에 등록하세요.", 500);

    // 입력 파라미터
    const nx = q.get("nx") ?? "60";
    const ny = q.get("ny") ?? "127";
    const type = (q.get("type") ?? "JSON").toUpperCase(); // JSON | RAW
    const model = (q.get("model") ?? "VIL").toUpperCase(); // VIL(단기예보) | ULTRA(초단기예보)

    let base_date = q.get("date") ?? "";
    let base_time = q.get("time") ?? "";

    // 기본 날짜/시간 자동 채움 (KST)
    const kst = nowKST();
    if (!base_date || !base_time) {
      if (model === "ULTRA") {
        const t = getNearestUltraBaseTimeKST(kst);
        base_date = base_date || t.base_date;
        base_time = base_time || t.base_time;
      } else {
        const t = getNearestVillageBaseTimeKST(kst);
        base_date = base_date || t.base_date;
        base_time = base_time || t.base_time;
      }
    }

    // 엔드포인트 선택
    const EP =
      model === "ULTRA"
        ? "UltraSrtFcst" // 초단기예보(예보)
        : "getVilageFcst"; // 단기예보

    // 기상청 OpenAPI URL
    const endpoint =
      model === "ULTRA"
        ? "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/UltraSrtFcst"
        : "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

    // 요청 쿼리 구성
    const params = new URLSearchParams({
      serviceKey: KMA_API_KEY, // 주의: Cloudflare에서 자체 인코딩 처리됨
      pageNo: "1",
      numOfRows: model === "ULTRA" ? "100" : "1000",
      dataType: "JSON",
      base_date,
      base_time,
      nx,
      ny,
    });

    const kmaUrl = `${endpoint}?${params.toString()}`;
    const res = await fetch(kmaUrl, { method: "GET" });

    if (!res.ok) {
      const txt = await res.text();
      return json(
        {
          ok: false,
          error: "KMA API HTTP error",
          status: res.status,
          endpoint: EP,
          base_date,
          base_time,
          nx,
          ny,
          raw: txt.slice(0, 500),
        },
        502
      );
    }

    // JSON/RAW 선택 반환
    if (type === "RAW") {
      return new Response(await res.text(), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
      });
    }

    const data = await res.json().catch(async () => {
      // 간혹 JSON 아닌 응답이 올 때 대비
      const txt = await res.text();
      return { parseError: true, raw: txt };
    });

    return json({
      ok: true,
      endpoint: EP,
      base_date,
      base_time,
      nx,
      ny,
      data,
    });
  } catch (e: any) {
    return bad(`Unhandled error: ${e?.message || String(e)}`, 500);
  }
};

// POST도 GET과 동일 동작(원하시면 제거 가능)
export const onRequestPost = onRequestGet;
