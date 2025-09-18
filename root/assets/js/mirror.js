// assets/js/mirror.js
import { Env } from './env.js';

const $ = (q, p=document) => p.querySelector(q);
const $$ = (q, p=document) => [...p.querySelectorAll(q)];
const text = (el, v) => { if(el) el.textContent = String(v); };
const safe = (v, f='--') => (v==null? f : String(v));

/* ---------- 테마/초기화 ---------- */
document.documentElement.classList.toggle('light', Env.theme === 'light');
$('#set-theme')?.value = Env.theme;
$('#memo').value = Env.memo;

function tickClock(){
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  text($('#clock-time'), `${pad(now.getHours())}:${pad(now.getMinutes())}`);
  text($('#clock-sec'), pad(now.getSeconds()));
  text($('#clock-date'), now.toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', weekday:'short'}));
}
setInterval(tickClock, 1000); tickClock();

/* ---------- KPI (모의) ---------- */
function refreshKPI(){
  // 데모용 값 (원하면 localStorage로 바꿔도 됨)
  const agendas = 3, todos = 2, incidents = 1, sleep = 82;
  text($('#kpi-agenda'), `${agendas}건`);
  text($('#kpi-todos'), `${todos}건`);
  text($('#kpi-inc'), `${incidents}건`);
  text($('#kpi-sleep'), sleep);
}
refreshKPI();

/* ---------- 설정 모달 ---------- */
$('#btn-settings')?.addEventListener('click', ()=> $('#dlg-settings')?.showModal());
$('#btn-close')?.addEventListener('click', ()=> $('#dlg-settings')?.close());
$('#btn-save')?.addEventListener('click', (e)=>{
  e.preventDefault();
  Env.theme = $('#set-theme').value;
  Env.gemini = $('#set-gemini').value.trim();
  Env.kma = $('#set-kma').value.trim();
  Env.region = $('#set-region').value.trim() || '충남 논산';
  $('#dlg-settings')?.close();
  alert('저장되었습니다.');
});

/* ---------- 테마/전체화면 ---------- */
$('#btn-theme')?.addEventListener('click', ()=>{
  Env.theme = (Env.theme === 'dark' ? 'light' : 'dark');
});
$('#btn-full')?.addEventListener('click', async ()=>{
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

/* ---------- 메모 ---------- */
$('#memo')?.addEventListener('input', e=>{
  Env.memo = e.target.value;
});
$('#btn-print')?.addEventListener('click', ()=>{
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><title>지시사항 보고</title>
  <style>body{font-family:system-ui;margin:2rem}h1{border-bottom:2px solid #000;padding-bottom:.5rem}pre{white-space:pre-wrap;background:#f7f7f7;padding:1rem;border-radius:8px}</style>
  </head><body><h1>지시사항 보고</h1><p><b>일시:</b> ${new Date().toLocaleString()}</p><h3>메모</h3><pre>${(Env.memo||'(없음)')}</pre></body></html>`);
  w.document.close(); w.print();
});
$('#btn-report')?.addEventListener('click', ()=>{
  const md = [
    `# 스마트미러 일일 리포트`,
    `- 생성: ${new Date().toLocaleString()}`,
    `- 지역: ${Env.region}`,
    `\n## 메모\n${Env.memo || '(없음)'}`
  ].join('\n');
  const blob = new Blob([md], {type:'text/markdown;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `report-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url);
});

/* ---------- 메인 메뉴 ---------- */
$$('.mega-menu .card').forEach(card=>{
  card.addEventListener('click', ()=>{
    const a = card.getAttribute('data-action');
    if(a==='ai') $('#chat-input')?.focus();
    if(a==='meeting') $('#meet-room')?.focus();
    if(a==='weather') $('#btn-w-refresh')?.click();
    window.scrollTo({top: document.body.scrollHeight/4, behavior:'smooth'});
  });
});

/* ---------- AI 대화 (Gemini; 없으면 모의) ---------- */
const chat = $('#chat'), input = $('#chat-input'), send = $('#btn-send');
const hints = $$('.hint');
const aiStatus = $('#ai-status');

function pushMsg(role, content){
  const div = document.createElement('div');
  div.className = `msg ${role==='user'?'u':'a'}`;
  const b = document.createElement('div');
  b.className = 'b'; b.textContent = content;
  div.appendChild(b); chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
}

function aiOnlineBadge(){
  aiStatus.textContent = Env.gemini ? '온라인(Gemini)' : '오프라인(모의)';
  aiStatus.className = 'badge ' + (Env.gemini ? 'on' : 'off');
}
aiOnlineBadge();

async function callGemini(prompt){
  const key = Env.gemini;
  if(!key) return { text: `(모의 응답) "${prompt}"에 대한 초안입니다. 키 설정 시 실제 AI 응답으로 대체됩니다.` };
  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ role:'user', parts:[{text: prompt}]}] })
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '(응답 없음)';
    return { text };
  }catch(e){
    return { text: `AI 호출 실패: ${e.message}. (키/네트워크/CORS 확인)` };
  }
}

async function onSend(){
  const q = input.value.trim();
  if(!q) return;
  pushMsg('user', q);
  input.value='';
  const a = await callGemini(q);
  pushMsg('ai', a.text);
}
send?.addEventListener('click', onSend);
input?.addEventListener('keydown', e=>{ if(e.key==='Enter') onSend(); });
hints.forEach(h=> h.addEventListener('click', ()=>{ input.value = h.textContent; input.focus(); }));

/* ---------- 날씨/재난 (기상청; 없으면 모의) ---------- */
async function fetchWeather(){
  const key = Env.kma;
  if(!key){
    // 모의 데이터
    return { cond:'맑음', temp:27, humi:60, wind:2.8, pm25:18, pm10:42, alert:'특보 없음' };
  }
  // 간단 예시 (실전은 좌표/격자/단기예보 등 파라미터 필요)
  // CORS 정책에 따라 클라이언트에서 직접 호출이 막힐 수 있음 → Cloudflare Worker/Pages Functions로 프록시 권장
  try{
    // 여기는 데모로 key만 확인하고 임시 값 반환
    return { cond:'부분 흐림', temp:26, humi:58, wind:3.1, pm25:22, pm10:48, alert:'특보 없음' };
  }catch(e){
    return { cond:'(오류)', temp:'--', humi:'--', wind:'--', pm25:'--', pm10:'--', alert:'데이터 불러오기 실패' };
  }
}
async function refreshWeather(){
  const w = await fetchWeather();
  text($('#wx-cond'), w.cond);
  text($('#wx-temp'), w.temp);
  text($('#wx-humi'), w.humi);
  text($('#wx-wind'), w.wind);
  text($('#wx-pm25'), w.pm25);
  text($('#wx-pm10'), w.pm10);
  const ab = $('#wx-alert');
  ab.textContent = w.alert || '특보 없음';
  ab.className = 'alert-box ' + (String(w.alert).includes('주의') ? 'warn' : String(w.alert).includes('경보') ? 'danger' : '');
}
$('#btn-w-refresh')?.addEventListener('click', refreshWeather);
refreshWeather();

/* ---------- Jitsi ---------- */
function jitsiUrl(room){ return `https://meet.jit.si/${encodeURIComponent(room)}`; }
$('#btn-meet-open')?.addEventListener('click', ()=>{
  const r = $('#meet-room').value.trim() || 'MayorRoom';
  window.open(jitsiUrl(r), '_blank','noreferrer');
});
$('#btn-meet-embed')?.addEventListener('click', ()=>{
  const r = $('#meet-room').value.trim() || 'MayorRoom';
  const f = $('#meet-iframe');
  f.src = jitsiUrl(r); f.hidden = false;
});

/* ---------- 음성 입력(브라우저) ---------- */
let rec=null, recOn=false;
$('#btn-mic')?.addEventListener('click', ()=>{
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert('이 브라우저는 음성 인식을 지원하지 않습니다'); return; }
  if(recOn){ rec.stop(); recOn=false; $('#btn-mic').textContent='🎙️'; return; }
  rec = new SR(); rec.lang='ko-KR'; rec.interimResults=true;
  rec.onresult = e=>{ const t=[...e.results].map(r=> r[0].transcript).join(' '); $('#chat-input').value=t; };
  rec.onend = ()=>{ recOn=false; $('#btn-mic').textContent='🎙️'; };
  rec.start(); recOn=true; $('#btn-mic').textContent='⏹️';
});

/* ---------- 온라인/오프라인 뱃지 ---------- */
window.addEventListener('online', ()=> aiOnlineBadge());
window.addEventListener('offline', ()=> aiOnlineBadge());
