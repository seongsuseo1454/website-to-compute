// ai.js (ESM) — 채팅+TTS+STT, 날씨, 14언어 통역, 405(미구현) 안전처리
// ================================================================

// ---------- 공통 ----------
const $ = (s) => document.querySelector(s);

// 시계/날짜
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString
('ko-KR', { hour: '2-digit', minute: '2-digit' });
  $('#today').textContent = now.toLocaleDateString
('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
  });
}
setInterval(tick, 1000); tick();

// ---------- TTS ----------
export function sanitizeForTTS(input) {
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

function speak(text, lang = 'ko-KR') {
  if (!$('#ttsToggle').checked) return;
  const line = sanitizeForTTS(text);
  if (!line) return;
  window.speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = lang;
  u.rate = 1.0; u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}
$('#ttsPause').onclick  = () => window.speechSynthesis.pause();
$('#ttsResume').onclick = () => window.speechSynthesis.resume();
$('#ttsStop').onclick   = () => window.speechSynthesis.cancel
();

// ---------- STT(음성 인식) ----------
let rec;
(function initSTT() {
  const Mic = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Mic) {
    $('#micBtn').disabled = true;
    $('#micBtn').title = '브라우저가 음성 인식을 지원하지 않습니다.';
    return;
  }
  rec = new Mic();
  rec.lang = 'ko-KR';
  rec.continuous
 = false;
  rec.interimResults
 = false;
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    $('#msgInput').value = txt;
    $('#chatForm').dispatchEvent(new Event('submit', { cancelable: true }));
  };
  rec.onerror = () => alert('음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.');
})();
$('#micBtn').onclick = () => { try { rec && rec.start(); } catch(_) {} };

// ---------- 채팅(백엔드 없으면 자동 우회) ----------
const chat = $('#chat');
function pushMsg(role, text) {
  const div = document.createElement('div');
  div.className = role === 'user' ? 'user' : 'bot';
  div.textContent = text;
  chat.appendChild
(div);
  chat.scrollTop = chat.scrollHeight;
}

async function callAI(prompt) {
  // 1) window.askAI가 있다면(별도 주입) 우선 사용
  if (typeof window.askAI === 'function') return await window.askAI(prompt);

  // 2) Cloudflare Pages Functions 예상 경로 (미구현이면 405 나올 수 있음)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.status === 405) throw new Error('AI endpoint disabled');
    if (!res.ok) throw new Error('AI failed ' + res.status);
    const data = await res.json();
    return data.text || data.reply || JSON.stringify(data);
  } catch (e) {
    // 3) 완전 오프라인 폴백: 간단 요약문구
    return '현재 네트워크가 혼잡합니다. 잠시 후 다시 시도해 주세요.';
  }
}

$('#chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#msgInput').value.trim();
  if (!q) return;
  $('#msgInput').value = '';
  pushMsg('user', q);
  try {
    const a = await callAI(q);
    pushMsg('bot', a);
    speak(a);
  } catch {
    const msg = '에러가 발생했습니다. 곧 조치하겠습니다.';
    pushMsg('bot', msg); speak(msg);
  }
});

// ---------- 날씨 ----------
async function fetchWeather() {
  // 좌표 고정/환경에 맞게 바꾸세요. (기존과 동일 구조 유지)
  // 데모: 대전(위도 36.35, 경도 127.38) → Open-Meteo 무료 API
  const lat = 36.35, lon = 127.38;
  $('#locHint').textContent = '대전 기준';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=
${lat}&longitude=${lon}` +
              `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FSeoul`;
  const r = await fetch(url);
  const j = await r.json().catch(()=>null);
  const cur = j?.current || {};
  $('#wTemp').textContent = (cur.temperature_2m ?? '-') + ' °C';
  $('#wHum').textContent  = (cur.relative_humidity_2m ?? '-') + ' %';
  $('#wRain').textContent = (cur.precipitation ?? '-') + ' mm';
  $('#wWind').textContent = (cur.wind_speed_10m ?? '-') + ' m/s';
}
$('#btnWeather').onclick = fetchWeather;
fetchWeather();

// ---------- 실시간 통역(14개 언어) ----------
const LANGS = [
  { code: 'ko',  stt: 'ko-KR',  tts: 'ko-KR',  name: '한국어' },
  { code: 'en',  stt: 'en-US',  tts: 'en-US',  name: 'English' },
  { code: 'ja',  stt: 'ja-JP',  tts: 'ja-JP',  name: '日本語' },
  { code: 'zh',  stt: 'zh-CN',  tts: 'zh-CN',  name: '中文(简体)' },
  { code: 'es',  stt: 'es-ES',  tts: 'es-ES',  name: 'Español' },
  { code: 'fr',  stt: 'fr-FR',  tts: 'fr-FR',  name: 'Français' },
  { code: 'de',  stt: 'de-DE',  tts: 'de-DE',  name: 'Deutsch' },
  { code: 'ru',  stt: 'ru-RU',  tts: 'ru-RU',  name: 'Русский' },
  { code: 'vi',  stt: 'vi-VN',  tts: 'vi-VN',  name: 'Tiếng Việt' },
  { code: 'id',  stt: 'id-ID',  tts: 'id-ID',  name: 'Bahasa Indonesia' },
  { code: 'th',  stt: 'th-TH',  tts: 'th-TH',  name: 'ไทย' },
  { code: 'ar',  stt: 'ar-SA',  tts: 'ar-SA',  name: 'العربية' },
  { code: 'hi',  stt: 'hi-IN',  tts: 'hi-IN',  name: 'हिंदी' },
  { code: 'pt',  stt: 'pt-PT',  tts: 'pt-PT',  name: 'Português' },
];

function fillLangSelect(sel, def) {
  sel.innerHTML
 = LANGS.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
  sel.value = def;
}
fillLangSelect($('#srcLang'), 'ko');
fillLangSelect($('#tgtLang'), 'en');

let trRec = null, trActive = false;
const trInEl = $('#trIn'), trOutEl = $('#trOut');

function setTrText(inText, outText) {
  trInEl.textContent = inText || '';
  trOutEl.textContent = outText || '';
}

async function translate(text, srcCode, tgtCode) {
  // (A) 백엔드가 있으면 /api/interpret 사용 (선택)
  try {
    const r = await fetch('/api/interpret', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ q: text, source: srcCode, target: tgtCode })
    });
    if (r.status !== 405 && r.ok) {
      const j = await r.json();
      return j.translated || j.text || '';
    }
  } catch {}

  // (B) 백업: LibreTranslate 퍼블릭 엔드포인트 (데모/비영리 용도)
  const demo = 'https://libretranslate.de/translate';
  const r2 = await fetch(demo, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ q: text, source: srcCode, target: tgtCode, format: 'text' })
  });
  const j2 = await r2.json().catch(()=>null);
  return j2?.translatedText || '';
}

function sttLang(code) { return (LANGS.find(l=>l.code===code)||LANGS[0]).stt; }
function ttsLang(code) { return (LANGS.find(l=>l.code===code)||LANGS[0]).tts; }

$('#trStart').onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert('이 브라우저는 통역용 음성 인식을 지원하지 않습니다.');

  const src = $('#srcLang').value;
  trRec = new SR();
  trRec.lang = sttLang(src);
  trRec.continuous
 = true;
  trRec.interimResults
 = true;
  trActive = true;
  setTrText('', '');

  trRec.onresult = async (ev) => {
    if (!trActive) return;
    const res = ev.results[ev.results.length - 1];
    const text = res[0].transcript;
    trInEl.textContent = text;
    if (res.isFinal) {
      const tgt = $('#tgtLang').value;
      const out = await translate(text, src, tgt).catch(()=>'(통역 오류)');
      trOutEl.textContent = out;
      speak(out, ttsLang(tgt));
    }
  };
  trRec.onerror = () => {/* 무시 */};
  trRec.start();
};

$('#trStop').onclick = () => {
  trActive = false;
  try { trRec && trRec.stop(); } catch {}
};

// ---------- 오늘 일정 ----------
const schedListEl = document.querySelector('#schedList');

function renderSchedule(items = []) {
  schedListEl.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '등록된 일정이 없습니다.';
    schedListEl.appendChild(li);
    return;
  }
  for (const it of items) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="sched-time">${it.time}</div>
      <div class="sched-main">
        <div class="sched-title">${it.title}</div>
        <div class="sched-loc">${it.location ?? ''}</div>
      </div>
    `;
    schedListEl.appendChild(li);
  }
}

/* =========================
   시정 뉴스
   ========================= */

const newsListEl = document.querySelector('#newsList');
const newsUpdatedEl = document.querySelector('#newsUpdated');

function renderNews(items = []) {
  newsListEl.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '표시할 뉴스가 없습니다.';
    newsListEl.appendChild(li);
    return;
  }
  for (const n of items.slice(0, 5)) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="title">${n.title ?? '제목 없음'}</div>
      <div class="meta">${n.source ?? ''} ${n.time ? ' · ' + n.time : ''}</div>
    `;
    if (n.url) {
      li.classList.add('clickable');
      li.onclick = () => window.open(n.url, '_blank');
    }
    newsListEl.appendChild(li);
  }
}

async function fetchCityNews() {
  try {
    const r = await fetch('/api/citynews', { method: 'GET' });
    if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
      const j = await r.json(); // 기대: { items: [{title, url, source, time}, ...] }
      renderNews(Array.isArray(j) ? j : (j.items || []));
      newsUpdatedEl.textContent = new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
      return;
    }
    if (r.status === 404 || r.status === 405) throw new Error('no-endpoint');
  } catch {
    // 데모
    const demo = [
      { title: '도시재생 사업 주민설명회 개최', source: '시정뉴스', time: '오늘', url: '' },
      { title: '추석 연휴 종합대책 본격 가동', source: '시청', time: '오늘' },
      { title: '청소년 진로박람회 2천명 참여', source: '교육지원과', time: '어제' },
      { title: '스마트팜 시범단지 착공', source: '농정과', time: '어제' },
      { title: 'AI 비서 시범운영 돌입', source: '디지털정책관', time: '어제' },
    ];
    renderNews(demo);
    newsUpdatedEl.textContent = '데모';
  }
}

document.querySelector('#btnNews').onclick = fetchCityNews;
document.querySelector('#btnNewsSpeak').onclick = () => {
  const titles = [...document.querySelectorAll('#newsList .title')].map(el => el.textContent.trim());
  if (!titles.length) return;
  speak(`시정 뉴스 주요 5건입니다. ${titles.join(' . ')}`, 'ko-KR');
};
fetchCityNews();

/* =========================
   부서별 업무보고
   ========================= */

const repListEl = document.querySelector('#repList');
const repUpdatedEl = document.querySelector('#repUpdated');

function renderReports(items = []) {
  repListEl.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '등록된 보고가 없습니다.';
    repListEl.appendChild(li);
    return;
  }
  for (const it of items.slice(0, 5)) {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="title">${it.dept ? `[${it.dept}] ` : ''}${it.title ?? '제목 없음'}</div>
      <div class="meta">${it.when ?? ''} ${it.owner ? ' · ' + it.owner : ''}</div>
      ${it.note ? `<div class="desc">${it.note}</div>` : ''}
    `;
    repListEl.appendChild(li);
  }
}

async function fetchReports() {
  try {
    const r = await fetch('/api/reports', { method: 'GET' });
    if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
      const j = await r.json(); // 기대: { items: [{dept,title,when,owner,note}, ...] }
      renderReports(Array.isArray(j) ? j : (j.items || []));
      repUpdatedEl.textContent = new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
      return;
    }
    if (r.status === 404 || r.status === 405) throw new Error('no-endpoint');
  } catch {
    // 데모
    const demo = [
      { dept:'행정과', title:'국민신문고 민원 처리 현황', when:'오늘', owner:'민원팀', note:'기한 내 처리 98%' },
      { dept:'복지과', title:'독거 어르신 방문 점검', when:'오늘 오전', owner:'복지1팀' },
      { dept:'문화체육과', title:'시민체육대회 준비상황', when:'오늘', owner:'체육팀', note:'종목별 리허설 진행' },
      { dept:'안전총괄과', title:'태풍 대비 배수시설 점검', when:'어제', owner:'안전관리팀' },
      { dept:'홍보담당관', title:'SNS 시정 홍보 주간계획', when:'어제', owner:'홍보팀' },
    ];
    renderReports(demo);
    repUpdatedEl.textContent = '데모';
  }
}

document.querySelector('#btnRep').onclick = fetchReports;
document.querySelector('#btnRepSpeak').onclick = () => {
  const lines = [...document.querySelectorAll('#repList .title')].map(el => el.textContent.trim());
  if (!lines.length) return;
  speak(`부서별 업무 보고 요약입니다. ${lines.join(' . ')}`, 'ko-KR');
};
fetchReports();
