/* ====== KMA 날씨 업데이트 ====== */
// 논산(예시) 격자
const NX = 60;
const NY = 127;
// 화면 레이블 (원하는 지명)
const LOCATION_LABEL = '논산시';

function setWeatherLabel() {
  const $label = document.getElementById('weatherLabel');
  if ($label) $label.textContent = `${LOCATION_LABEL} 현재 날씨`;
}

// KMA 카테고리 -> DOM id 매핑
const CAT_TO_ID = {
  T1H: 't1h', // 기온(℃)
  REH: 'reh', // 습도(%)
  RN1: 'rn1', // 1시간 강수량(mm)
  WSD: 'wsd', // 풍속(m/s)
};

async function fetchWeatherKMA(nx, ny) {
  // functions/api/weather 을 프록시로 사용 (키는 서버에서 보관)
  // 서버가 date/time을 알아서 최근 가용 시각으로 보정하도록 구현되어 있다면
  // 아래처럼 심플 호출이 가장 안전합니다.
  const res = await fetch(`/api/weather?nx=${nx}&ny=${ny}&type=JSON`);
  if (!res.ok) throw new Error('날씨 API 실패');
  return res.json();
}

function renderWeatherFromItems(items = []) {
  // 모든 값을 기본 '-'로 초기화
  Object.values(CAT_TO_ID).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '-';
  });

  // 카테고리별 최신 값 채우기
  for (const it of items) {
    const id = CAT_TO_ID[it.category];
    if (!id) continue;
    const el = document.getElementById(id);
    if (!el) continue;
    // 표시값 정리
    let v = it.obsrValue ?? it.fcstValue ?? '-';
    if (it.category === 'RN1' && (v === '0' || v === 0)) v = '없음';
    el.textContent = v;
  }
}

async function updateWeather() {
  try {
    setWeatherLabel();
    const data = await fetchWeatherKMA(NX, NY);

    // 서버 구현에 따라 형태가 조금 다를 수 있습니다.
    // 1) { items: [...] } 형태
    // 2) { response: { body: { items: { item: [...] }}}} 형태
    let items = [];
    if (Array.isArray(data?.items)) {
      items = data.items
;
    } else if (Array.isArray(data?.response?.body?.items?.item
)) {
      items = data.response.body.items.item
;
    }

    renderWeatherFromItems(items);
  } catch (e) {
    console.warn('날씨 업데이트 실패:', e);
    // 실패 시 화면은 '-'로 유지
  }
}

/* ===== STT (보다 견고하게) ===== */
let rec;

async function ensureMicPermission() {
  // 일부 환경에서 Recognition 시작 전에 권한 프롬프트가 안 뜨는 경우가 있어 선요청
  try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { /* 사용자가 취소할 수도 있음 */ }
}

function initSTT() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) {
    micBtn.disabled = true;
    micBtn.title = '이 브라우저는 음성 입력(STT)을 지원하지 않습니다. Chrome/Edge를 사용하세요.';
    return;
  }
  rec = new R();
  rec.lang = 'ko-KR';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onresult = (e) => {
    const txt = e.results?.[0]?.[0]?.transcript || '';
    if (txt) {
      input.value = txt;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };
  rec.onerror = (ev) => {
    alert('음성 인식 오류: ' + (ev?.error || '알 수 없음') + '\n마이크 권한/네트워크를 확인하세요.');
  };

  micBtn.onclick = async () => {
    try {
      await ensureMicPermission();
      rec.start();
    } catch (_) {}
  };
}

initSTT();

// 최초 1회 + 버튼
document.getElementById('btnWeather')?.addEventListener('click', updateWeather);
updateWeather();
