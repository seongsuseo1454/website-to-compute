// /root/ai.js  (type="module" 로 로드할 것)

// ---------- 공통 ----------
const $ = (s) => document.querySelector(s);
const chat = $('#chat');
const input = $('#msgInput');
const form = $('#chatForm');
const micBtn = $('#micBtn');
const ttsToggle = $('#ttsToggle');
const ttsPause = $('#ttsPause');
const ttsResume = $('#ttsResume');
const ttsStop = $('#ttsStop');

// 메시지 풍선
function push(role, text, area = chat) {
  const d = document.createElement('div');
  d.className = 'bubble ' + (role === 'user' ? 'user' : 'bot');
  d.textContent = text;
  area.appendChild
(d);
  area.scrollTop = area.scrollHeight;
}

// 특수문자 제거(TTS용)
export function sanitizeForTTS(input) {
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ---------- TTS ----------
function speak(text, lang='ko-KR') {
  if (!ttsToggle.checked) return;
  const line = sanitizeForTTS(text);
  if (!line) return;
  speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = lang;
  u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.speak(u);
}
ttsPause.onclick = () => speechSynthesis.pause();
ttsResume.onclick = () => speechSynthesis.resume();
ttsStop.onclick = () => speechSynthesis.cancel
();

// ---------- STT ----------
let rec;
function ensureSTT(lang='ko-KR') {
  if ('webkitSpeechRecognition' in window) {
    const R = window.webkitSpeechRecognition;
    rec = new R();
    rec.lang = lang; rec.continuous
 = false; rec.interimResults
 = false;
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      input.value = txt;
      form.dispatchEvent(new Event('submit',{cancelable:true}));
    };
    rec.onerror = () => alert('음성 인식 오류. 다시 시도해 주세요.');
  } else {
    micBtn.disabled = true;
    micBtn.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
  }
}
ensureSTT();
micBtn.onclick = () => { try { rec && rec.start(); } catch {} };

// ---------- AI(채팅) — 데모 안전 응답 ----------
async function askAI(prompt) {
  // 실제 연결 시: /api/ai 로 교체
  // 현재는 예시 응답
  const map = {
    '날씨': '현재 네트워크 기반 실시간 날씨는 상단 카드 “날씨 업데이트” 버튼으로 확인해 주세요.',
    '일정': '오전 10시 간부 회의, 오후 2시 기업 대표 면담, 오후 5시 청소년 진로 간담회가 예정되어 있습니다.'
  };
  return map[Object.keys(map).find(k => prompt.includes
(k))] 
    || '요청을 접수했습니다. 필요한 내용을 정리해 드릴게요.';
}

// ---------- 채팅 전송 ----------
form.addEventListener
('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  push('user', q);
  try {
    const a = await askAI(q);
    push('bot', a);
    speak(a, 'ko-KR');
  } catch (err) {
    const msg = '에러가 발생했습니다. 곧 조치하겠습니다.';
    push('bot', msg); speak(msg);
  }
});

// ---------- 날씨 ----------
const btnWeather = $('#btnWeather');
btnWeather?.addEventListener('click', async () => {
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation?.getCurrentPosition(
        (p) => res(p.coords),
        () => res({ latitude: 36.1872, longitude: 127.0989 }) // 논산시 중심 좌표(폴백)
      )
    );
    const url = `/api/weather?lat=${pos.latitude}&lon=${pos.longitude}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('weather_fail');
    const wx = await r.json();
    $('#w-temp').textContent = `${Math.round(wx.temp)} °C`;
    $('#w-hum').textContent  = `${Math.round(wx.humidity)} %`;
    $('#w-wind').textContent = `${wx.windspeed.toFixed
(1)} m/s`;
    $('#w-rain').textContent = `${(wx.rain || 0).toFixed(1)} mm`;
  } catch {
    alert('날씨 업데이트 실패');
  }
});

// ---------- 실시간 통역 ----------
const trLog  = $('#trLog');
const langIn = $('#langIn');
const langOut= $('#langOut');
const trStart= $('#trStart');
const trStop = $('#trStop');

let trRec = null;
trStart.onclick = () => {
  if (!('webkitSpeechRecognition' in window)) {
    alert('브라우저가 음성 인식을 지원하지 않습니다.');
    return;
  }
  const R = window.webkitSpeechRecognition;
  trRec = new R();
  trRec.lang = langIn.value; trRec.continuous
 = true; trRec.interimResults
 = false;

  trRec.onresult = async (e) => {
    const txt = e.results[e.results.length-1][0].transcript;
    push('user', `[${langIn.value}] ${txt}`, trLog);
    try {
      const r = await fetch('/api/translate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ q: txt, source: langIn.value, target: langOut.value })
      });
      const data = await r.json();
      const out = data?.text || '(통역 실패)';
      push('bot', `[${langOut.value}] ${out}`, trLog);
      speak(out, langOut.value === 'ko' ? 'ko-KR' :
                  langOut.value === 'en' ? 'en-US' :
                  langOut.value === 'ja' ? 'ja-JP' : 'zh-CN');
    } catch {
      push('bot','(통역 오류)', trLog);
    }
  };
  trRec.start();
  trStart.disabled = true; trStop.disabled = false;
};

trStop.onclick = () => { try { trRec && trRec.stop(); } catch{} trStart.disabled=false; trStop.disabled=true; };
trStop.disabled = true;
