// ===== DOM =====
const $ = (s) => document.querySelector(s);
const chat = $('#chat');
const input = $('#msgInput');
const form = $('#chatForm');
const micBtn = $('#micBtn');
const ttsToggle = $('#ttsToggle');
const ttsPause = $('#ttsPause');
const ttsResume = $('#ttsResume');
const ttsStop = $('#ttsStop');

// ===== 시계/인사 =====
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString
('ko-KR', { hour: '2-digit', minute: '2-digit' });
  $('#today').textContent = now.toLocaleDateString
('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });
}
setInterval(tick, 1000); tick();

// ===== 채팅 유틸 =====
function pushMsg(role, text) {
  const div = document.createElement('div');
  div.className = role === 'user' ? 'user' : 'bot';
  div.textContent = text;
  chat.appendChild
(div);
  chat.scrollTop = chat.scrollHeight;
}

// ===== TTS(특수문자/이모지 제거 후 읽기) =====
export function sanitizeForTTS(input) {
  let s = String(input || '');
  s = s.replace(/https?:\/\/\S+/g, ' ');                          // 링크 제거
  s = s.replace(/[#*_`>~|:[\](){}/\\\-]+/g, ' ');                  // 마크다운/특수문자
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ' '); } catch(e) {} // 대부분 이모지
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');              // 제어문자
  return s.replace(/\s{2,}/g, ' ').trim();
}

function speak(text) {
  if (!ttsToggle.checked) return;
  const line = sanitizeForTTS(text);
  if (!line) return;
  speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = 'ko-KR';
  u.rate = 1.0;
  u.pitch = 1.0;
  speechSynthesis.speak(u);
}
ttsPause.onclick  = () => speechSynthesis.pause();
ttsResume.onclick = () => speechSynthesis.resume();
ttsStop.onclick   = () => speechSynthesis.cancel
();

// ===== STT(웹킷 인식) =====
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
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  };
  rec.onerror = () => alert('음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.');
} else {
  micBtn.disabled = true;
  micBtn.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
}
micBtn.onclick = () => { try { rec && rec.start(); } catch {} };

// ===== AI 호출 (ai.js 내 askAI가 있으면 사용, 없으면 /api/ai 폴백) =====
window.askAI ??= null; // 외부에서 주입 가능
async function callAI(prompt) {
  if (typeof window.askAI === 'function') {
    return await window.askAI(prompt);
  }
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('AI 응답 실패: ' + res.status);
  const data = await res.json();
  return data.text || data.reply || JSON.stringify(data);
}

// ===== 전송 처리 =====
form.addEventListener
('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  pushMsg('user', q);

  try {
    const a = await callAI(q);
    pushMsg('bot', a);
    speak(a);
  } catch (err) {
    const msg = '에러가 발생했습니다. 곧 조치하겠습니다.';
    pushMsg('bot', msg);
    speak(msg);
    // 필요 시 원격 알림 연동:
    // safeFetch('/api/report', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type:'AI_FAIL', detail:String(err) }) });
  }
});

// ===== 날씨 =====
const elTemp = $('#temp');
const elHum  = $('#hum');
const elRain = $('#rain');
const elWind = $('#wind');
const elLoc  = $('#weatherLoc');

function setWeatherLoading() {
  elTemp.textContent = '로딩 중';
  elHum.textContent  = '로딩 중';
  elWind.textContent = '로딩 중';
  elRain.textContent = '–';
  elLoc.textContent  = '지역 확인 중…';
}
setWeatherLoading();

async function updateWeather() {
  try {
    const res = await fetch('/api/weather', { cache: 'no-store' });
    if (!res.ok) throw new Error('weather http ' + res.status);
    const w = await res.json();

    elTemp.textContent = (w.temp != null) ? `${w.temp}°C` : '–';
    elHum.textContent  = (w.humidity != null) ? `${w.humidity}%` : '–';
    elWind.textContent = (w.wind_ms != null) ? `${w.wind_ms} m/s` : '–';
    elRain.textContent = (w.rain != null) ? w.rain : '–';
    elLoc.textContent  = w.region || '논산';
  } catch (e) {
    elTemp.textContent = '–';
    elHum.textContent  = '–';
    elWind.textContent = '–';
    elLoc.textContent  = '네트워크 점검 중';
  }
}
document.getElementById('btnWeather').onclick = updateWeather;
updateWeather();

// ===== 안전 fetch 래퍼 & 에러 리포트(선택) =====
async function safeFetch(input, init) {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      // 간단 리포트(선택)
      // await fetch('/api/report', { method:'POST', body: JSON.stringify({ type:'http', code: res.status, url: String(input) }), keepalive:true });
    }
    return res;
  } catch (e) {
    // await fetch('/api/report', { method:'POST', body: JSON.stringify({ type:'network', detail: String(e), url: String(input) }), keepalive:true });
    throw e;
  }
}
