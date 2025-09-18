/* ===== Smart Mirror — Static Single File JS ===== */

// DOM 헬퍼
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

// 탭
$$('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const to = btn.dataset.tab;
    $$('.tab').forEach(t=>t.classList.remove('active'));
    $('#tab-'+to).classList.add('active');
  });
});

// 테마
$('#themeToggle').addEventListener('click', ()=>{
  document.body.classList.toggle('theme-light');
});

// 시계
(function tick(){
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  $('#clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  $('#date').textContent  = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} (${['일','월','화','수','목','금','토'][now.getDay()]})`;
  requestAnimationFrame(()=>setTimeout(tick, 1000 - (Date.now()%1000)));
})();

// 빠른 동작 로그
const log = (txt) => {
  const box = $('#actionLog');
  const line = document.createElement('div');
  line.textContent = `• ${new Date().toLocaleTimeString()}  ${txt}`;
  box.prepend(line);
};
$$('.act-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const a = b.dataset.action;
    if(a==='emergency') log('관제팀에 긴급 알림(데모).');
    if(a==='hydrate')  log('30분 뒤 수분 섭취 알림(데모).');
    if(a==='posture')  log('자세 교정 권고(데모).');
    if(a==='patrol')   log('민원 다발 지역 순찰 배정(데모).');
  });
});

// 조직/업무 데모 데이터
let tasks = [
  {id:'t1', title:'민원 다발 지역 순찰', dept:'안전도시', priority:'상', status:'진행', due:plusDays(0)},
  {id:'t2', title:'해외 바이어 환영행사', dept:'문화관광', priority:'중', status:'대기', due:plusDays(3)},
  {id:'t3', title:'예산 조정안 브리핑', dept:'기획예산', priority:'상', status:'대기', due:plusDays(1)},
];
function plusDays(d){return new Date(Date.now()+d*86400000).toISOString().slice(0,10);}
function renderTasks(){
  const dept = $('#deptFilter').value;
  const box = $('#taskList'); box.innerHTML='';
  tasks.filter(t=>dept==='ALL'||t.dept===dept).forEach(t=>{
    const el = document.createElement('div');
    el.className='list-item';
    el.innerHTML = `
      <div class="text">
        <strong>${escapeHtml(t.title)}</strong>
        <span class="badge">P${t.priority}</span>
        <span class="muted">[${t.dept}] · ${t.due}</span>
      </div>
      <div class="ctrl">
        <select class="status">
          ${['대기','진행','보류','완료'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>`;
    el.querySelector('.status').addEventListener('change',e=>{
      t.status = e.target.value;
    });
    box.appendChild(el);
  });
}
$('#deptFilter').addEventListener('change', renderTasks);
$('#addTask').addEventListener('click', ()=>{
  const note = prompt('새 업무 제목');
  if(!note) return;
  const dept = $('#deptFilter').value==='ALL' ? '기획예산' : $('#deptFilter').value;
  tasks.unshift({id:`t${Date.now()}`, title:note, dept, priority:'중', status:'대기', due:plusDays(2)});
  renderTasks();
});
$('#exportCsv').addEventListener('click', ()=>{
  const csv = 'id,title,dept,priority,status,due\n' + tasks.map(t =>
    `${t.id},"${t.title.replace(/"/g,'""')}",${t.dept},${t.priority},${t.status},${t.due}`
  ).join('\n');
  download('tasks.csv', csv, 'text/csv;charset=utf-8');
});
renderTasks();

// 바이어 데모
const buyers = [
  {id:'b1', company:'Tokyo AeroParts', contact:'Sato Akira', tz:'Asia/Tokyo'},
  {id:'b2', company:'Munich Mobility', contact:'Franz Müller', tz:'Europe/Berlin'}
];
(function fillBuyers(){
  const sel = $('#buyerSelect');
  buyers.forEach(b=>{
    const o = document.createElement('option');
    o.value=b.id; o.textContent=`${b.company} — ${b.contact}`;
    sel.appendChild(o);
  });
})();
$('#buyerSelect').addEventListener('change', ()=>{
  const b = buyers.find(x=>x.id===$('#buyerSelect').value);
  $('#buyerTime').textContent = b ? `현지시각 ${new Date().toLocaleTimeString('ko-KR', {timeZone:b.tz, hour12:false})}` : '';
});
$('#mkJitsi').addEventListener('click', ()=>window.open(`https://meet.jit.si/MayorRoom-${Date.now()}`,'_blank'));
$('#mkMeet').addEventListener('click', ()=>window.open('https://meet.google.com/new','_blank'));
$('#mkZoom').addEventListener('click', ()=>window.open('https://zoom.us/j/','_blank'));
$('#mkICS').addEventListener('click', ()=>{
  const start = new Date(Date.now()+86400000).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const end   = new Date(Date.now()+86400000+45*60000).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MayorMirror//Static//KR
BEGIN:VEVENT
UID:${Date.now()}@mirror
DTSTAMP:${start}
DTSTART:${start}
DTEND:${end}
SUMMARY:Online Meeting
DESCRIPTION:Mayor Office invitation
LOCATION:Online
END:VEVENT
END:VCALENDAR`;
  download('meeting.ics', ics, 'text/calendar');
});

// AI 챗(정적 모드 + 선택적 서버 모드)
const chatBox = $('#chatBox');
function addMsg(text, me=false){
  const el = document.createElement('div');
  el.className='msg'+(me?' me':'');
  el.innerHTML=`<div class="bubble">${escapeHtml(text)}</div>`;
  chatBox.appendChild(el); chatBox.scrollTop=chatBox.scrollHeight;
}
$('#sendBtn').addEventListener('click', onSend);
$('#chatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') onSend(); });
function onSend(){
  const t = $('#chatInput').value.trim(); if(!t) return;
  $('#chatInput').value=''; addMsg(t, true);
  // 간단 라우팅(온디바이스)
  if(/날씨|미세|pm/i.test(t)) return addMsg('지역 현황: 맑음 26℃, PM2.5 18, PM10 42 (데모)');
  if(/메모|기록/i.test(t))  return addMsg('메모에 기록했습니다(데모).');
  if(/긴급|119|sos/i.test(t)) return addMsg('관제팀에 긴급 알림 전파(데모).');

  const url = (window.APP_CONFIG||{}).CHAT_API_URL;
  if(!url){ // 정적 에코
    return setTimeout(()=>addMsg('정적 모드 응답: "'+t+'" 메모해둘게요.'), 300);
  }
  // 서버/워커에 연결한 경우
  fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:t})})
  .then(r=>r.json()).then(j=>addMsg(j.reply||'처리되었습니다.')).catch(()=>addMsg('서버 응답 오류'));
}

// PWA 설치
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt=e; $('#pwaState').textContent='설치 가능';
});
$('#installPWA').addEventListener('click', async()=>{
  if(!deferredPrompt) return alert('설치 프롬프트 없음');
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null;
});

// SW 등록
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').then(()=>{
    $('#pwaState').textContent='활성';
  }).catch(()=>$('#pwaState').textContent='오류');
}else{
  $('#pwaState').textContent='미지원';
}

// 유틸
function download(name, data, mime){ const blob=new Blob([data],{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}
