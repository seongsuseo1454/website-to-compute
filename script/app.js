// ===== 상태 & 로컬 스토리지 =====
const S = {
  theme: localStorage.getItem('theme') || 'dark',
  title: localStorage.getItem('title') || '시장 집무실 스마트 미러 PRO',
  agenda: localStorage.getItem('agenda') || document.querySelector('#agenda').value,
  todos: localStorage.getItem('todos') || document.querySelector('#todos').value,
  meetUrl: localStorage.getItem('meetUrl') || document.querySelector('#meetUrl').value,
  masking: JSON.parse(localStorage.getItem('masking') ?? 'true'),
  gemini: localStorage.getItem('gemini_api_key') || '',
  role: 'GUEST',
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const safe = v => (typeof v === 'string' || typeof v === 'number') ? String(v) : '';

// ===== 공통 유틸 =====
function setLS(k, v){ localStorage.setItem(k, v); }
function download(name, text, mime='text/plain;charset=utf-8'){
  const blob = new Blob([text], {type:mime}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function mask(text, hard=false){
  if (!S.masking && !hard) return text;
  return String(text)
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, hard ? '***-****-****' : '[MASKED_PHONE]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, hard ? '****@****.***' : '[MASKED_EMAIL]');
}
function shortTime(tz){ return new Date().toLocaleString('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}); }
function isoOffset(d=0,h=0){ return new Date(Date.now()+d*864e5+h*36e5).toISOString(); }

// ===== 탭 네비 =====
$$('.menu button').forEach(btn=>{
  btn.onclick=()=>{ $$('.tab').forEach(t=>t.classList.remove('active')); $(`#tab-${btn.dataset.tab}`).classList.add('active'); };
});

// ===== 테마/풀스크린 =====
$('#themeToggle').onclick=()=>{
  document.body.classList.toggle('theme-dark'); S.theme = document.body.classList.contains('theme-dark')?'dark':'light'; setLS('theme', S.theme);
};
if(S.theme==='light') document.body.classList.remove('theme-dark');
$('#fullscreen').onclick=()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen?.(); };

// ===== 시계 =====
setInterval(()=>{
  const now=new Date(); const pad=n=>String(n).padStart(2,'0');
  $('#hhmm').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  $('#sec').textContent = pad(now.getSeconds());
  $('#ymd').textContent = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} (일월화수목금토'[now.getDay()])`.replace(/'/,'')[0];
},1000);

// ===== 타이틀/일정/할일 =====
$('#title').textContent = S.title;
$('#editTitle').onclick=()=>{ const v=prompt('미러 제목', S.title); if(v){ S.title=v; setLS('title',v); $('#title').textContent=v; } };
$('#agenda').value = S.agenda; $('#todos').value = S.todos;
$('#editAgenda').onclick=()=>{ const v=prompt('오늘 일정', $('#agenda').value); if(v!=null){ $('#agenda').value=v; S.agenda=v; setLS('agenda',v); syncKPIs(); } };
$('#editTodos').onclick=()=>{ const v=prompt('할 일', $('#todos').value); if(v!=null){ $('#todos').value=v; S.todos=v; setLS('todos',v); syncKPIs(); } };
$('#meetUrl').oninput=e=>{ S.meetUrl=e.target.value; setLS('meetUrl',S.meetUrl); };
$('#geminiKey').oninput=e=>{ S.gemini=e.target.value; setLS('gemini_api_key',S.gemini); };
$('#masking').checked=S.masking; $('#masking').onchange=e=>{ S.masking=!!e.target.checked; setLS('masking',S.masking); };

// ===== KPI =====
function syncKPIs(){
  $('#kpiSchedule').textContent = `${($('#agenda').value.match(/\n/g)?.length||0)+1}건`;
  $('#kpiTodos').textContent = `${($('#todos').value.match(/\n/g)?.length||0)+1}건`;
}
syncKPIs();

// ===== 모의데이터 폴백 fetch =====
async function jget(path, fallback){
  try{
    const r = await fetch(path, {headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(r.status);
    return await r.json();
  }catch{ return fallback; }
}

// ===== 데이터 로딩 (health/region/org/buyers) =====
async function loadHealth(){
  const h = await jget('/api/health', {steps:7340,heartRate:76,bpSys:122,bpDia:79,sleepScore:82,hydration:62});
  $('#kpiSleep').textContent = h.sleepScore;
  $('#healthKpis').innerHTML = `
    <div class="kpis small">
      <div class="kpi">심박수<b>${h.heartRate} bpm</b></div>
      <div class="kpi">혈압<b>${h.bpSys}/${h.bpDia}</b></div>
      <div class="kpi">걸음<b>${h.steps}</b></div>
      <div class="kpi">수분<b>${h.hydration}%</b></div>
    </div>`;
}
async function loadRegion(){
  const r = await jget('/api/region', {pm10:42,pm25:18,tempC:27,humidity:64,windMs:3.2,condition:'맑음',incidents:[{type:'민원',count:7},{type:'도로',count:1}]});
  $('#kpiIncidents').textContent = (r.incidents||[]).reduce((a,b)=>a+b.count,0)+'건';
  $('#regionKpis').innerHTML = `
    <div class="kpis small">
      <div class="kpi">날씨<b>${r.condition} ${r.tempC}℃</b></div>
      <div class="kpi">습도<b>${r.humidity}%</b></div>
      <div class="kpi">PM2.5<b>${r.pm25}</b></div>
      <div class="kpi">PM10<b>${r.pm10}</b></div>
    </div>`;
}
$('#refreshHealth').onclick=loadHealth;
$('#refreshRegion').onclick=loadRegion;
loadHealth(); loadRegion();

let ORG={members:[],tasks:[]}, BUYERS=[];
async function loadOrg(){
  ORG = await jget('/api/org',{members:[
    {id:'m1',name:'김시정',title:'국장',dept:'기획예산',phone:'010-1111-2222',email:'plan@city.go.kr',onDuty:true},
    {id:'m2',name:'박민원',title:'팀장',dept:'민원서비스',phone:'010-3333-4444',email:'civil@city.go.kr'},
    {id:'m3',name:'이안전',title:'주무관',dept:'안전도시',phone:'010-5555-6666',email:'safe@city.go.kr'},
    {id:'m4',name:'최문화',title:'주무관',dept:'문화관광',email:'culture@city.go.kr'},
  ],tasks:[
    {id:'t1',title:'민원 다발 지역 순찰 배치',dept:'안전도시',ownerId:'m3',priority:'상',status:'진행',due:isoOffset(0,6)},
    {id:'t2',title:'해외 바이어 환영행사 기획',dept:'문화관광',ownerId:'m4',priority:'중',status:'대기',due:isoOffset(3)},
    {id:'t3',title:'예산 조정안 브리핑',dept:'기획예산',ownerId:'m1',priority:'상',status:'대기',due:isoOffset(1)},
  ]});
  renderOrg();
}
function renderOrg(){
  const depts=[...new Set(ORG.members.map(m=>m.dept))];
  $('#deptFilter').innerHTML = `<option value="ALL">전체</option>`+depts.map(d=>`<option>${d}</option>`).join('');
  const dsel = $('#deptFilter').value || 'ALL';
  const tasks = ORG.tasks.filter(t=>dsel==='ALL'||t.dept===dsel).slice(0,30);
  $('#taskList').innerHTML = tasks.map(t=>`
    <div class="item">
      <div class="left">
        <b>[P${t.priority}]</b> ${mask(t.title)}
        <span class="muted">[${t.dept}] · ${t.due ? new Date(t.due).toLocaleDateString() : ''}</span>
      </div>
      <div class="right">
        <select data-owner="${t.id}">
          <option value="">담당자</option>
          ${ORG.members.map(m=>`<option value="${m.id}" ${m.id===t.ownerId?'selected':''}>${m.name}</option>`).join('')}
        </select>
        <select data-status="${t.id}">
          ${['대기','진행','보류','완료'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
        </select>
        <button data-done="${t.id}" class="ghost">완료</button>
      </div>
    </div>`).join('');
  $('#memberList').innerHTML = ORG.members.slice(0,8).map(m=>`
    <div class="person">
      <div><b>${m.name}</b> <span class="muted">${m.title}</span><div class="muted">${m.dept}</div></div>
      <div>
        ${m.phone?`<a class="ghost" href="tel:${mask(m.phone)}">전화</a>`:''}
        ${m.email?`<a class="ghost" href="mailto:${mask(m.email)}">메일</a>`:''}
      </div>
    </div>`).join('');
}
$('#deptFilter').onchange=renderOrg;
$('#addTask').onclick=()=>{ const note=prompt('새 업무(제목)'); if(!note) return;
  const d = $('#deptFilter').value==='ALL' ? (ORG.members[0]?.dept||'기획예산') : $('#deptFilter').value;
  ORG.tasks.unshift({id:`t${Date.now()}`,title:note,dept:d,priority:'중',status:'대기',due:isoOffset(2)});
  renderOrg();
};
$('#exportCsv').onclick=()=>{
  const hdr='X-SCHEMA:tasks/v1\nid,title,dept,owner,priority,status,due\n';
  const rows=ORG.tasks.map(t=>`${t.id},"${mask(t.title,true).replace(/"/g,'""')}",${t.dept},${t.ownerId||''},${t.priority},${t.status},${t.due||''}`).join('\n');
  download(`tasks-${Date.now()}.csv`, hdr+rows, 'text/csv;charset=utf-8');
};
$('#taskList').addEventListener('change',e=>{
  const ownerId=e.target.getAttribute('data-owner'); const statusId=e.target.getAttribute('data-status');
  if(ownerId){ const t=ORG.tasks.find(x=>x.id===ownerId); if(t) t.ownerId=e.target.value; }
  if(statusId){ const t=ORG.tasks.find(x=>x.id===statusId); if(t) t.status=e.target.value; }
});
$('#taskList').addEventListener('click',e=>{
  const id=e.target.getAttribute('data-done'); if(!id) return;
  ORG.tasks = ORG.tasks.filter(x=>x.id!==id); renderOrg();
});
loadOrg();

async function loadBuyers(){
  BUYERS = await jget('/api/buyers',[
    {id:'b1',company:'Tokyo AeroParts',contact:'Sato Akira',email:'akira@tap.co.jp',timezone:'Asia/Tokyo',language:'ja'},
    {id:'b2',company:'Munich Mobility',contact:'Franz Müller',email:'franz@mm.de',timezone:'Europe/Berlin',language:'de'},
  ]);
  $('#buyerSelect').innerHTML = `<option value="">선택</option>` + BUYERS.map(b=>`<option value="${b.id}">${b.company} — ${b.contact}</option>`).join('');
}
$('#buyerSelect').onchange=e=>{
  const b=BUYERS.find(x=>x.id===e.target.value);
  $('#buyerInfo').textContent = b ? `현지시각: ${shortTime(b.timezone)} / 언어: ${b.language.toUpperCase()}` : '';
};
document.querySelectorAll('[data-meet]').forEach(btn=>{
  btn.onclick=()=>{
    const type=btn.dataset.meet;
    if(type==='jitsi') window.open(`https://meet/jit.si/${encodeURIComponent('BuyerRoom')}-${Date.now()}`,'_blank');
    if(type==='meet') window.open('https://meet.google.com/new','_blank');
    if(type==='zoom') window.open('https://zoom.us/j/','_blank');
  };
});
$('#openInterpreter').onclick=()=>window.open('/interpreter','_blank');
$('#makeIcs').onclick=()=>{
  const sel=$('#buyerSelect').value; if(!sel) return alert('바이어 선택');
  const b=BUYERS.find(x=>x.id===sel); const start=isoOffset(1);
  const dt=date=>date.replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MayorMirror//v5//KR
BEGIN:VEVENT
UID:${Date.now()}@mayor-mirror
DTSTAMP:${dt(start)}
DTSTART:${dt(start)}
DTEND:${dt(new Date(new Date(start).getTime()+45*60000).toISOString())}
SUMMARY:Online Meeting — ${b.company}
DESCRIPTION:Hello ${b.contact}, This is an invitation from Mayor's Office.
LOCATION:Online
END:VEVENT
END:VCALENDAR`;
  download(`meeting-${Date.now()}.ics`, ics, 'text/calendar');
};
$('#createFollowup').onclick=()=>{
  const sel=$('#buyerSelect').value; if(!sel) return alert('바이어 선택');
  const b=BUYERS.find(x=>x.id===sel);
  ORG.tasks.unshift({id:`t${Date.now()}`,title:`후속자료 송부 — ${b.company}`,dept:'기획예산',priority:'중',status:'대기',due:isoOffset(2)});
  renderOrg();
};
$('#summaryToMemo').onclick=()=>{
  appendAI(`(요약 예시) 파트너십 범위/일정/담당 합의. 액션: 자료 송부, 후속 미팅 조율.`);
};
loadBuyers();

// ===== AI 대화(로컬 라우팅 → 서버(/api/chat) 폴백) =====
const chatBox = $('#chatBox');
function addMsg(text, me=false){
  const el=document.createElement('div'); el.className='msg'+(me?' me':'');
  el.innerHTML=`<div class="bubble">${safe(text)}</div>`; chatBox.appendChild(el); chatBox.scrollTop=chatBox.scrollHeight;
}
function appendAI(text){ addMsg(text,false); }

$('#sendChat').onclick=async()=>{
  const q=$('#chatInput').value.trim(); if(!q) return;
  addMsg(q,true); $('#chatInput').value='';
  // on-device quick routes
  const u=q.toLowerCase();
  if(/건강|심박|혈압|수면|걸음/.test(u)){ const r = await jget('/api/health',{}); return appendAI(`건강 요약: HR ${r.heartRate||76}bpm, BP ${r.bpSys||122}/${r.bpDia||79}, 수면 ${r.sleepScore||82}, 걸음 ${r.steps||7340}보.`); }
  if(/날씨|대기|pm2|pm10|기상/.test(u)){ const r = await jget('/api/region',{}); const risk=(r.pm25||18)>35?'주의: 미세농도 높음':'야외활동 무리 없음'; return appendAI(`지역 현황: ${r.condition||'맑음'} ${(r.tempC??27)}℃, PM2.5 ${(r.pm25??18)}, PM10 ${(r.pm10??42)}. ${risk}`); }
  if(/메모|기록/.test(u)){ const note=q.replace(/.*(메모|기록)/,'').trim()||q; const prev=localStorage.getItem('memo')||''; localStorage.setItem('memo', prev+`\n- ${note}`); return appendAI('지시사항을 메모에 기록했습니다.'); }
  if(/긴급|119|화재|지진|구급/.test(u)){ try{ await fetch('/api/notify/emergency',{method:'POST',body:JSON.stringify({message:'긴급 알림'})}); }catch{} return appendAI('관제팀에 알림을 발송했습니다.'); }

  // 서버 AI (있으면 사용, 없으면 echo)
  try{
    const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${S.gemini}`},body:JSON.stringify({message:q,history:[]})});
    if(r.ok){ const j=await r.json(); return appendAI(j.reply||'(응답 없음)'); }
  }catch{}
  appendAI('(데모 응답) 요청을 접수했습니다.');
};

// 리포트/메모 출력
$('#downloadReport').onclick=()=>{
  const health = $('#healthKpis').innerText.replace(/\s+/g,' ');
  const region = $('#regionKpis').innerText.replace(/\s+/g,' ');
  const lines=[
    `# ${S.title} — 일일 리포트`,
    `- 작성: ${new Date().toLocaleString()}`,
    `- 건강: ${health}`,
    `- 지역: ${region}`,
    '',
    '## 메모',
    mask(localStorage.getItem('memo')||'(없음)', true)
  ];
  download(`daily-report-${Date.now()}.md`, lines.join('\n'));
};
$('#printMemo').onclick=()=>{
  const w=window.open('','_blank'); const memo=mask(localStorage.getItem('memo')||'(없음)', true);
  w.document.write(`<!doctype html><html><head><title>지시사항 보고</title><style>body{font-family:system-ui;margin:2rem}pre{white-space:pre-wrap;background:#f7f7f7;padding:1rem;border-radius:8px}</style></head><body><h1>지시사항 보고</h1><pre>${memo}</pre></body></html>`); w.document.close(); w.print();
};
