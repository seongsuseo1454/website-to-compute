// ===== 선택자/DOM =====
const $ = (s)=>document.querySelector(s);
const chat = $('#chat');
const input = $('#msgInput');
const form = $('#chatForm');
const micBtn = $('#micBtn');
const fabMic = $('#fabMic');
const ttsToggle = $('#ttsToggle');
const ttsPause = $('#ttsPause');
const ttsResume = $('#ttsResume');
const ttsStop = $('#ttsStop');
const btnWeather = $('#btnWeather');
const alwaysOn = $('#alwaysOn');
const interpToggle = $('#interpToggle');
const interpMode = $('#interpMode');

// ===== 날짜/시계 =====
function tick(){
  const now=new Date();
  $('#clock').textContent = now.toLocaleTimeString
('ko-KR',{hour:'2-digit',minute:'2-digit'});
  $('#today').textContent = now.toLocaleDateString
('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'});
}
setInterval(tick,1000); tick();

// ===== 채팅 UI =====
function pushMsg(role, text){
  const div=document.createElement('div');
  div.className= role==='user'?'user':'bot';
  div.textContent=text;
  chat.appendChild
(div);
  chat.scrollTop=chat.scrollHeight;
}

// ===== 텍스트 정리(TTS용) =====
export function sanitizeForTTS(input){
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g,' ');
  s = s.replace(/[#*_`>|~^:\\/[\]{}\-]+/g,' ');
  // 이모지/픽토그램은 브라우저별 정규식 지원 편차가 있어 try-catch
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ' '); } catch(_) {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g,' ');
  return s.replace(/\s{2,}/g,' ').trim();
}

// ===== 음성 합성(TTS) =====
function speak(text){
  if(!ttsToggle.checked) return;
  const line = sanitizeForTTS(text);
  if(!line) return;
  speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = (interpToggle.checked && getTargetLangFromMode(interpMode.value)) || 'ko-KR';
  u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.speak(u);
}
ttsPause.onclick = ()=>speechSynthesis.pause();
ttsResume.onclick= ()=>speechSynthesis.resume();
ttsStop.onclick  = ()=>speechSynthesis.cancel
();

// ===== 음성 인식(STT) + 항상 듣기 =====
let rec = null;
let recActive = false;
if('webkitSpeechRecognition' in window){
  const R = window.webkitSpeechRecognition;
  rec = new R();
  rec.lang='ko-KR';
  rec.continuous
=false;
  rec.interimResults
=false;

  rec.onresult = (e)=>{
    const txt = e.results[0][0].transcript;
    handleRecognized(txt);
  };
  rec.onerror = ()=>{ recActive=false; };
  rec.onend   = ()=>{
    recActive=false;
    if(alwaysOn.checked) startRecSafe(); // 자동 재시작
  };
  micBtn.disabled=false; fabMic.disabled=false;
}else{
  micBtn.disabled=true; fabMic.disabled=true;
  micBtn.title = fabMic.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
}

function startRecSafe(){
  if(!rec || recActive) return;
  try{ recActive=true; rec.start(); }catch{ recActive=false; }
}
function handleRecognized(txt){
  input.value = txt;
  form.dispatchEvent(new Event('submit', {cancelable:true}));
}

micBtn.onclick = ()=> startRecSafe();
fabMic.onclick = ()=> startRecSafe();

// ===== 통역 모드 =====
// 통역 방향 언어코드
function getPair(mode){
  switch(mode){
    case 'ko-en': return ['ko','en'];
    case 'ko-ja': return ['ko','ja'];
    case 'ko-zh': return ['ko','zh-CN'];
    default: return ['ko','en'];
  }
}
function getTargetLangFromMode(mode){
  const [,to]=getPair(mode); // TTS 언어로도 사용
  const mapper={ko:'ko-KR',en:'en-US',ja:'ja-JP','zh-CN':'zh-CN'};
  return mapper[to] || 'ko-KR';
}

// 간단 번역(백엔드 있으면 /api/translate 사용, 실패 시 원문 반환)
async function translate(text, from, to){
  try{
    const res = await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,from,to})});
    if(res.ok){ const j=await res.json(); return j.text || text; }
  }catch(_){}
  return text;
}

// ===== AI 호출 =====
async function callAI(prompt){
  // ai 백엔드가 있다면 window.askAI 제공 가능
  if(typeof window.askAI === 'function'){
    return await window.askAI(prompt);
  }
  // 폴백: 간단한 규칙답변
  if(/날씨|기온|기상/.test(prompt)) return '오늘은 맑고, 바람이 약하며 활동하기 좋습니다.';
  if(/일정|스케줄/.test(prompt)) return '오전 10시 간부회의, 오후 2시 기업 대표 면담, 오후 5시 간담회가 예정되어 있습니다.';
  return '요청 사항 확인했습니다. 필요하신 내용을 더 말씀해 주세요.';
}

// ===== 전송 처리 =====
form.addEventListener
('submit', async (e)=>{
  e.preventDefault();
  const q = input.value.trim();
  if(!q) return;
  input.value='';

  if(interpToggle.checked){
    // 통역 모드: ko<->other 자동
    const [from,to] = getPair(interpMode.value);
    // 한국어로 말하면 다른 언어로, 그렇지 않으면 한국어로
    const guessKo = /[가-힣]/.test(q);
    if(guessKo){
      pushMsg('user', q);
      const out = await translate(q, 'ko', to);
      pushMsg('bot', out);
      speak(out);
      return;
    }else{
      pushMsg('user', q);
      const out = await translate(q, 'auto', 'ko');
      pushMsg('bot', out);
      speak(out);
      return;
    }
  }

  // 일반 AI 비서
  pushMsg('user', q);
  try{
    const a = await callAI(q);
    pushMsg('bot', a);
    speak(a);
  }catch(err){
    const msg='오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    pushMsg('bot', msg);
    speak(msg);
  }
});

// ===== 날씨(간단 데이터; 실패 시도 화면 고정) =====
async function loadWeather(){
  // 실제 API 연결 전까지 간단 계산(고정값 아님, 보기 좋게 난수 범위)
  try{
    const t = (23 + Math.random()*4).toFixed(0);
    const h = (45 + Math.random()*20).toFixed(0);
    const w = (0.5 + Math.random()*2.5).toFixed(1);
    $('#t1').textContent = `${t}℃`;
    $('#h1').textContent = `${h}%`;
    $('#r1').textContent = '-';
    $('#w1').textContent = `${w} m/s`;
  }catch(_){
    // 실패해도 최소한의 값
    $('#t1').textContent = '26℃';
    $('#h1').textContent = '55%';
    $('#r1').textContent = '-';
    $('#w1').textContent = '1.8 m/s';
  }
}
btnWeather.onclick = loadWeather;
loadWeather();
