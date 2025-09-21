// /interpreter.js (module)
const $ = (s) => document.querySelector(s);

// ---- 언어 목록(14개) ----
const LANGS = [
  { code: 'ko-KR', label: '한국어' },
  { code: 'en-US', label: 'English' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'es-ES', label: 'Español' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'th-TH', label: 'ไทย' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'hi-IN', label: 'हिन्दी' },
  // 필요하면 { code: 'ar-SA', label: 'العربية' } 추가
];

const inSel  = $('#trIn');     // 입력(말하기) 언어 <select>
const outSel = $('#trOut');    // 출력(읽어주기) 언어 <select>
const btnStart = $('#trStart'); // 통역 시작 버튼
const btnStop  = $('#trStop');  // 통역 정지 버튼
const outBox   = $('#trOutBox'); // 결과 텍스트 표시 div

// 셀렉트 채우기
function fillLangSelect(sel) {
  sel.innerHTML = '';
  LANGS.forEach(l => {
    const o = document.createElement('option');
    o.value = l.code; o.textContent = l.label;
    sel.appendChild(o);
  });
}
fillLangSelect(inSel);
fillLangSelect(outSel);
inSel.value = inSel.value || 'ko-KR';
outSel.value = outSel.value || 'en-US';

// ---- TTS 보이스 로딩/선택 ----
let VOICES = [];
const loadVoices = () => {
  VOICES = window.speechSynthesis.getVoices() || [];
};
loadVoices();
window.speechSynthesis.onvoiceschanged = loadVoices;

// 언어코드로 가장 근접한 보이스 선택
function pickVoice(langCode) {
  if (!VOICES.length) loadVoices();
  // 정확히 일치 우선
  let v = VOICES.find(v => v.lang === langCode);
  if (v) return v;
  // 같은 언어(지역 무시) 후보
  const base = langCode.split('-')[0];
  v = VOICES.find(v => (v.lang || '').split('-')[0] === base);
  return v || null;
}

// ---- STT (웹킷) ----
let rec = null;
function getRecognizer(lang) {
  if (!('webkitSpeechRecognition' in window)) return null;
  const R = window.webkitSpeechRecognition;
  const r = new R();
  r.lang = lang;
  r.continuous = true;
  r.interimResults = false;
  return r;
}

// ---- speak util (특수문자 정리 포함) ----
function sanitizeTTS(t) {
  return String(t ?? '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*_`>~|[\](){}\\/+^=<>-]+/g, ' ')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/\s+/g,' ')
    .trim();
}

function speak(text, lang) {
  const u = new SpeechSynthesisUtterance(sanitizeTTS(text));
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || lang;
  u.rate = 1; u.pitch = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ---- 번역 호출 (/api/translate POST) ----
async function translate(text, src, dst) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ text, source: src, target: dst })
  });
  if (!res.ok) throw new Error('translate_failed_' + res.status);
  const data = await res.json();
  return data.text;
}

// ---- 메인 플로우 ----
let running = false;

btnStart.addEventListener('click', () => {
  if (running) return;
  const src = inSel.value;
  const dst = outSel.value;

  rec = getRecognizer(src);
  if (!rec) {
    outBox.textContent = '이 브라우저는 음성 인식을 지원하지 않습니다.';
    return;
  }
  running = true;
  outBox.textContent = '통역 대기 중…';

  rec.onresult = async (ev) => {
    const last = ev.results[ev.results.length - 1];
    if (!last || !last[0]) return;
    const heard = last[0].transcript.trim();
    if (!heard) return;

    outBox.textContent = `👂 ${heard}`;
    try {
      const translated = src.split('-')[0] === dst.split('-')[0]
        ? heard
        : await translate(heard, src, dst);
      outBox.textContent = `➡️ ${translated}`;
      speak(translated, dst);
    } catch (e) {
      outBox.textContent = '번역 오류';
      console.error(e);
    }
  };
  rec.onerror = (e) => { console.error(e); outBox.textContent = '마이크 오류'; };
  rec.onend = () => { if (running) rec.start(); }; // 끊기면 재시작
  rec.start();

  // 크롬 보이스 초기화 트릭(일부 브라우저는 첫 호출 전까지 보이스 0개)
  setTimeout(() => speak('통역을 시작합니다', dst), 200);
});

btnStop.addEventListener('click', () => {
  running = false;
  try { rec && rec.stop(); } catch {}
  speechSynthesis.cancel();
  outBox.textContent = '통역 정지';
});
