// ===== 시간/날씨 =====
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const weatherEl = document.getElementById('weather');
const greetingEl = document.getElementById('greeting');

function two(n){ return String(n).padStart(2,'0'); }
function dayName(d){ return ['일','월','화','수','목','금','토'][d]; }

function tick(){
  const now = new Date();
  clockEl.textContent = `${two(now.getHours())}:${two(now.getMinutes())}`;
  dateEl.textContent = `${now.getFullYear()}.${two(now.getMonth()+1)}.${two(now.getDate())} (${dayName(now.getDay())})`;

  const h = now.getHours();
  const zone = h < 6 ? '새벽' : h < 12 ? '아침' : h < 18 ? '오후' : '저녁';
  greetingEl.textContent = `${zone}입니다, 시장님`;
}
setInterval(tick, 1000);
tick();

// KMA ultrashort forecast helper
async function loadWeather(){
  try{
    // 전국 공통 예시(서울) 좌표: nx=60, ny=127 (사용 지역 좌표로 교체 가능)
    const now = new Date();
    // KMA는 10분 단위 API, base_time은 30분 이전 시간으로 맞추면 안정적
    const base = new Date(now.getTime() - 30*60000);
    const date = `${base.getFullYear()}${two(base.getMonth()+1)}${two(base.getDate())}`;
    const time = `${two(base.getHours())}${two(base.getMinutes()>=30?30:0)}00`;

    const res = await fetch(`/api/weather?nx=60&ny=127&date=${date}&time=${time}&type=JSON`);
    const data = await res.json();

    // 간단 파싱(현재 기온/T1H, 하늘/PTY)
    let t = null, pty = 0;
    const items = data?.response?.body?.items?.item
 || [];
    for(const it of items){
      if (it.category === 'T1H') t = it.fcstValue;
      if (it.category === 'PTY') pty = Number(it.fcstValue);
    }
    const sky = (pty===0?'맑음': pty===1?'비': pty===2?'비/눈': pty===3?'눈': '소나기');
    weatherEl.textContent = `현재 ${t??'-'}°C·${sky}`;
  }catch(e){
    console.error(e);
    weatherEl.textContent = '날씨 정보 오류';
  }
}
loadWeather();
setInterval(loadWeather, 10*60*1000); // 10분마다 갱신

// ===== 채팅 UI =====
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function addMsg(role, text){
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  chatLog.appendChild
(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function askGemini(prompt){
  const res = await fetch('/api/ai', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt })
  });
  if(!res.ok){
    const err = await res.text().catch(()=>res.statusText);
    throw new Error(err||'AI 오류');
  }
  const data = await res.json();
  return data.text;
}

async function onSend(){
  const q = chatInput.value.trim();
  if (!q) return;
  addMsg('user', q);
  chatInput.value = '';
  try{
    const a = await askGemini(q);
    addMsg('ai', a);
    lastAIText = a;
  }catch(e){
    addMsg('ai', `오류: ${e.message}`);
  }
}
sendBtn.addEventListener
('click', onSend);
chatInput.addEventListener
('keydown', (e)=>{ if(e.key==='Enter') onSend(); });

// ===== 음성 인/출력 =====
const micBtn = document.getElementById('mic-btn');
let rec = null, recognizing = false;

function sanitizeForSpeech(s){
  // 특수문자/마크다운/URL/이모지 제거 및 공백 정리
  return s
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/`[^`]*`/g,' ')
    .replace(/\[(.*?)\]\((.*?)\)/g,'$1')
    .replace(/https?:\/\/\S+/g,' ')
    .replace(/[^\p{L}\p{N}\p{Z}\.\,\?\!\-~]/gu,' ') // 문자/숫자/간격/일부 문장부호 제외
    .replace(/\s{2,}/g,' ')
    .trim();
}

let lastAIText = '';

function speak(text){
  if (!('speechSynthesis' in window)) return alert('이 브라우저는 TTS를 지원하지 않습니다.');
  window.speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  u.lang = 'ko-KR';
  u.rate = 1.0;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}
function stopSpeak(){ window.speechSynthesis.cancel
(); }

document.getElementById('speak-last').onclick = ()=> lastAIText && speak(lastAIText);
document.getElementById('stop-speak').onclick = stopSpeak;

function toggleMic(){
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){
    return alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!rec){
    rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults
 = false;
    rec.maxAlternatives = 1;
    rec.onresult = async (ev)=>{
      const text = ev.results[0][0].transcript;
      chatInput.value = text;
      onSend();
    };
    rec.onend = () => { recognizing = false; micBtn.classList.remove('primary'); };
    rec.onerror = () => { recognizing = false; micBtn.classList.remove('primary'); };
  }
  if (!recognizing){ recognizing = true; rec.start(); micBtn.classList.add
('primary');}
  else { rec.stop(); recognizing=false; micBtn.classList.remove('primary');}
}
micBtn.addEventListener
('click', toggleMic);

// 오늘의 지혜 읽기
document.getElementById('read-insight').onclick = ()=>{
  const t = document.getElementById('insight-text').textContent||'';
  speak(t);
};
document.getElementById('stop-insight').onclick = stopSpeak;
