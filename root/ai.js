// ai.js
// AIDEV-NOTE: 브라우저 전용 모듈. 비서/통역/날씨를 모두 담당. API 실패 시 안전 폴백.

//// ===== 공통 =====
const $ = (sel) => document.querySelector(sel);
const chat = $('#chat');
const input = $('#msgInput');
const form = $('#chatForm');
const micBtn = $('#micBtn');
const ttsToggle = $('#ttsToggle');
const ttsPause = $('#ttsPause');
const ttsResume = $('#ttsResume');
const ttsStop = $('#ttsStop');

//// ===== TTS 유틸 (특수문자/이모지 제거) =====
export function sanitizeForTTS(input) {
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g, '');
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch (e) {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}
function speak(text, lang = 'ko-KR') {
  if (!ttsToggle.checked) return;
  const line = sanitizeForTTS(text);
  if (!line) return;
  window.speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = lang;
  u.rate = 1.0;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}
ttsPause?.addEventListener('click', ()=> speechSynthesis.pause());
ttsResume?.addEventListener('click', ()=> speechSynthesis.resume());
ttsStop?.addEventListener('click', ()=> speechSynthesis.cancel
());

//// ===== 채팅 UI =====
function pushMsg(role, text) {
  const div = document.createElement('div');
  div.className = role === 'user' ? 'user' : 'bot';
  div.textContent = text;
  chat.appendChild
(div);
  chat.scrollTop = chat.scrollHeight;
}

//// ===== AI 호출: /api/ai (Gemini) 있으면 사용, 없으면 폴백 =====
async function callAI(prompt) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.ok) {
      const data = await res.json().catch(()=> ({}));
      return data.text || data.reply || JSON.stringify(data);
    }
  } catch {}
  // 폴백: 서버가 없으면 에코
  return `(${new Date().toLocaleTimeString('ko-KR')}) ${prompt}`;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  pushMsg('user', q);
  try {
    const a = await callAI(q);
    pushMsg('bot', a);
    speak(a, 'ko-KR');
  } catch (err) {
    const msg = '에러가 발생했습니다. 곧 조치하겠습니다.';
    pushMsg('bot', msg);
    speak(msg, 'ko-KR');
  }
});

//// ===== 음성 인식(STT)로 채팅 입력 =====
let rec;
if ('webkitSpeechRecognition' in window) {
  const R = window.webkitSpeechRecognition;
  rec = new R();
  rec.lang = 'ko-KR';
  rec.continuous
 = false;
  rec.interimResults
 = false;
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    input.value = txt;
    form?.dispatchEvent(new Event('submit', { cancelable: true }));
  };
  rec.onerror = () => alert('음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.');
} else {
  micBtn.disabled = true;
  micBtn.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
}
micBtn?.addEventListener('click', ()=> { try { rec && rec.start(); } catch(_) {} });

//// ===== 날씨 (Open-Meteo: 키 필요 없음) =====
// 위치 허용: 현재좌표, 거부: 논산(36.187, 127.098)
const FALLBACK = { lat: 36.187, lon: 127.098, label: '논산시(기본)' };
const wxTemp = $('#wx-temp');
const wxDesc = $('#wx-desc');
const wxWhere = $('#wx-where');

function codeToDesc(code, isDay = 1) {
  const map = {
    0:'맑음', 1:'대체로 맑음', 2:'부분적 구름', 3:'흐림',
    45:'안개', 48:'상고대 안개',
    51:'이슬비 약', 53:'이슬비 보통', 55:'이슬비 강',
    61:'비 약', 63:'비 보통', 65:'비 강',
    71:'눈 약', 73:'눈 보통', 75:'눈 강',
    80:'소나기 약', 81:'소나기 보통', 82:'소나기 강',
    95:'뇌우', 96:'우박 동반 뇌우', 99:'강한 우박 뇌우'
  };
  return map[code] ?? (isDay ? '날씨' : '야간 날씨');
}

async function loadWeather(pos) {
  const lat = pos?.coords?.latitude ?? FALLBACK.lat;
  const lon = pos?.coords?.longitude ?? FALLBACK.lon;
  const label = pos ? '현재 위치 기준' : FALLBACK.label;

  // Open-Meteo 현재날씨
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code&timezone=Asia%2FSeoul`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const t = Math.round(data?.current?.temperature_2m ?? NaN);
    const code = data?.current?.weather_code ?? 0;
    const isDay = data?.current?.is_day ?? 1;

    wxTemp.textContent = isFinite(t) ? `${t}°` : '--°';
    wxDesc.textContent = codeToDesc(code, isDay);
    wxWhere.textContent = `${label} · (${lat.toFixed
(3)}, ${lon.toFixed
(3)})`;
  } catch (e) {
    wxTemp.textContent = '--°';
    wxDesc.textContent = '날씨 정보를 가져오지 못했습니다';
    wxWhere.textContent = label;
  }
}
try {
  navigator.geolocation.getCurrentPosition(
    (pos)=> loadWeather(pos),
    ()=> loadWeather(null),
    { enableHighAccuracy: true, timeout: 5000 }
  );
} catch { loadWeather(null); }

//// ===== 14개 언어 동시 통역 =====
const LANGS = [
  { code: "ko-KR", label: "한국어" },
  { code: "en-US", label: "English" },
  { code: "ja-JP", label: "日本語" },
  { code: "zh-CN", label: "中文(简体)" },
  { code: "zh-TW", label: "中文(繁體)" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "es-ES", label: "Español" },
  { code: "ru-RU", label: "Русский" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "th-TH", label: "ไทย" },
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "ar-SA", label: "العربية" },
  { code: "hi-IN", label: "हिन्दी" }
];
const sttLangSel = $('#sttLang');
const sttStart = $('#sttStart');
const sttStop = $('#sttStop');
const interpretSrc = $('#interpret-src');
const interpretGrid = $('#interpret-grid');

// 입력 언어 셀렉트 생성
if (sttLangSel) {
  sttLangSel.innerHTML
 = LANGS.map(l => `<option value="${l.code}">${l.label} (${l.code})</option>`).join('');
  sttLangSel.value = 'ko-KR';
}

// 통역용 STT
let interRec;
if ('webkitSpeechRecognition' in window) {
  const R = window.webkitSpeechRecognition;
  interRec = new R();
  interRec.lang = sttLangSel?.value ?? 'ko-KR';
  interRec.continuous
 = true;      // 계속 듣기
  interRec.interimResults
 = true;  // 중간 결과 표시

  interRec.onresult = async (e) => {
    const res = e.results[e.results.length - 1];
    const text = res[0]?.transcript ?? '';
    interpretSrc.textContent = `원문(${interRec.lang}): ${text}`;
    if (res.isFinal) {
      try {
        const map = await translateAll(text);
        renderTranslations(map);
        // 한국어로도 읽어주기(시장님 모니터링)
        speak(map['ko-KR'] ?? text, 'ko-KR');
      } catch (_) {}
    }
  };
  interRec.onerror = (ev) => {
    console.warn('통역 인식 에러', ev?.error || ev);
  };
}
sttLangSel?.addEventListener('change', ()=>{
  if (interRec) interRec.lang = sttLangSel.value;
});
sttStart?.addEventListener('click', ()=>{
  try { interRec && interRec.start(); } catch(_) {}
});
sttStop?.addEventListener('click', ()=>{
  try { interRec && interRec.stop(); } catch(_) {}
});

// 번역 호출: /api/ai (Gemini) → JSON 매핑
async function translateAll(text) {
  // 프롬프트: 반드시 JSON으로만 반환하도록 강제
  const prompt = [
    "다음 원문을 지정된 언어 코드로 번역하세요.",
    "반드시 JSON 객체만 출력하세요. 키는 BCP-47 언어코드, 값은 번역문.",
    "키 목록: " + LANGS.map(l=>l.code).join(', '),
    "원문:",
    text
  ].join('\n');
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    // 모델이 코드블록/설명 섞으면 정제
    const raw = (data.text || data.reply || '').trim();
    const jsonStr = raw
      .replace(/^```json/,'')
      .replace(/^```/,'')
      .replace(/```$/,'')
      .trim();
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    // 폴백: 번역 실패 시 원문을 모든 언어에 그대로
    const m = {};
    LANGS.forEach(l=> m[l.code] = text);
    return m;
  }
}

function renderTranslations(map) {
  interpretGrid.innerHTML
 = '';
  LANGS.forEach(l => {
    const div = document.createElement('div');
    div.className = 'pill';
    const title = document.createElement('div');
    title.className = 'lang';
    title.textContent = `${l.label} (${l.code})`;
    const body = document.createElement('div');
    body.textContent = map[l.code] ?? '';
    div.appendChild
(title);
    div.appendChild
(body);
    interpretGrid.appendChild
(div);

    // 각 언어를 해당 언어로 읽어주고 싶으면 아래 주석 해제
    // speak(map[l.code] ?? '', l.code);
  });
}

//// ===== 전역 내보내기(선행 코드 호환) =====
window.askAI = callAI;

// AIDEV-NOTE: 최소 에러 리포트 훅 (서버에 /api/report 없으면 무시)
(function () {
  const REPORT_URL = '/api/report';
  const SAMPLE = 1.0;
  const COOL = 10000;
  const KEY = 'last_error_sig';
  function hash(s){let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return String(h);}
  function should(){ return Math.random() <= SAMPLE; }
  function dedupe(sig){
    try{
      const got = JSON.parse(localStorage.getItem(KEY) || '{}');
      const now = Date.now();
      if (got.sig === sig && now - got.ts < COOL) return false;
      localStorage.setItem(KEY, JSON.stringify({sig, ts: now}));
      return true;
    } catch { return true; }
  }
  async function report(payload){
    try{
      if (!should()) return;
      const sig = hash([payload.type, payload.message
, payload.stack].filter(Boolean).join('|'));
      if (!dedupe(sig)) return;
      await fetch(REPORT_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          ...payload, sig,
          url: location.href, ua: navigator.userAgent
, at: new Date().toISOString()
        }),
        keepalive: true
      });
    } catch {}
  }
  window.addEventListener
('error', ev=>{
    report({ type:'error', message:ev?.message, filename:ev?.filename, lineno:ev?.lineno, colno:ev?.colno, stack:String(ev?.error?.stack||'').slice(0,2000) });
  });
  window.addEventListener
('unhandledrejection', ev=>{
    const r = ev?.reason;
    report({ type:'unhandledrejection', message: (r && (r.message||r.toString())) || 'unhandled', stack: r?.stack ? String(r.stack).slice(0,2000):undefined });
  });
})();
