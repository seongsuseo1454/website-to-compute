// ===== 시계/인사 =====
(function(){
  const $ = (s) => document.querySelector(s);
  function tick(){
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString
('ko-KR', {hour:'2-digit', minute:'2-digit'});
    $('#today').textContent = now.toLocaleDateString
('ko-KR', {year:'numeric', month:'2-digit', day:'2-digit', weekday:'long'});
  }
  setInterval(tick,1000); tick();
})();

// ===== 날씨(Open-Meteo, 키 불필요) =====
(async function(){
  const $ = (s)=>document.querySelector(s);
  const label = $('#locLabel'), t=$('#wxT'), h=$('#wxH'), r=$('#wxR'), w=$('#wxW');
  async function fetchWX(lat, lon){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=
${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FSeoul`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('weather');
    const j = await res.json();
    const c = j.current || {};
    t.textContent = (c.temperature_2m ?? '-') + ' °C';
    h.textContent = (c.relative_humidity_2m ?? '-') + ' %';
    r.textContent = (c.precipitation ?? '-') + ' mm';
    w.textContent = (c.wind_speed_10m ?? '-') + ' m/s';
  }
  async function update(){
    try{
      label.textContent = '위치 확인 중…';
      const pos = await new Promise((ok, no)=>{
        if(!navigator.geolocation) return no(new Error('geo'));
        navigator.geolocation.getCurrentPosition(ok, no, {timeout:6000});
      });
      const {latitude:lat, longitude:lon} = pos.coords
;
      label.textContent = '현재 위치 기반';
      await fetchWX(lat, lon);
    }catch{
      // 좌표 권한 거부시: 논산 시청 근처(백업)
      label.textContent = '지역: 논산(백업)';
      await fetchWX(36.1870, 127.0980);
    }
  }
  document.querySelector('#btnWx').addEventListener('click', update);
  update();
})();

// ===== TTS 공통 =====
(function(){
  const $ = (s)=>document.querySelector(s);
  const toggle=$('#ttsToggle'), pause=$('#ttsPause'), resume=$('#ttsResume'), stop=$('#ttsStop');

  function sanitizeForTTS(input){
    let s=String(input||'');
    s=s.replace(/https?:\/\/\S+/g,' ');
    s=s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g,' ');
    try{ s=s.replace(/\p{Extended_Pictographic}/gu,''); }catch(e){}
    s=s.replace(/[\u0000-\u001F\u007F-\u009F]/g,'');
    return s.replace(/\s{2,}/g,' ').trim();
  }
  window.ttsSpeak = (text)=>{
    if(!toggle.checked) return;
    const line = sanitizeForTTS(text);
    if(!line) return;
    window.speechSynthesis.cancel
();
    const u = new SpeechSynthesisUtterance(line);
    u.lang='ko-KR';
    u.rate=1.0; u.pitch=1.0;
    speechSynthesis.speak(u);
  };
  pause.onclick = ()=> speechSynthesis.pause();
  resume.onclick = ()=> speechSynthesis.resume();
  stop.onclick = ()=> speechSynthesis.cancel
();
})();

// ===== 채팅 + 음성 입력(STT) =====
(function(){
  const $ = (s)=>document.querySelector(s);
  const chat=$('#chat'), form=$('#chatForm'), input=$('#msgInput'), mic=$('#micBtn');

  function push(role, text){
    const div=document.createElement('div');
    div.className = role==='user' ? 'user' : 'bot';
    div.textContent = text;
    chat.appendChild
(div);
    chat.scrollTop = chat.scrollHeight;
  }

  // 실제 AI 서버가 없으면 간단한 로컬 응답(안정본)
  async function callAI(prompt){
    // 서버가 있으면 /api/ai 사용
    try{
      const res = await fetch('/api/ai', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      if(res.ok){ const j=await res.json(); return j.text || j.reply || String(j); }
    }catch{}
    // 폴백: 간단 템플릿
    if(/날씨|기온|습도|바람/.test(prompt)) return '현재 네트워크 기반 실시간 날씨는 상단 카드의 “날씨 업데이트” 버튼으로 확인해 주세요.';
    if(/일정|스케줄/.test(prompt)) return '오늘 일정은 10:00 간부 회의, 14:00 기업 대표 면담, 17:00 청소년 간담회입니다.';
    return '요청을 받았습니다. 자세한 연결이 필요하면 관리실에 알려 드리겠습니다.';
  }

  form.addEventListener
('submit', async (e)=>{
    e.preventDefault();
    const q = input.value.trim();
    if(!q) return;
    input.value='';
    push('user', q);
    try{
      const a = await callAI(q);
      push('bot', a);
      window.ttsSpeak(a);
    }catch{
      const msg='에러가 발생했습니다. 곧 조치하겠습니다.';
      push('bot', msg);
      window.ttsSpeak(msg);
    }
  });

  // STT
  let rec=null;
  if('webkitSpeechRecognition' in window){
    const R=window.webkitSpeechRecognition;
    rec=new R(); rec.lang='ko-KR'; rec.continuous
=false; rec.interimResults
=false;
    rec.onresult = (e)=>{ input.value = e.results[0][0].transcript; form.dispatchEvent(new Event('submit',{cancelable:true})); };
    rec.onerror = ()=> alert('음성 인식 오류가 발생했습니다. 다시 시도해 주세요.');
    mic.onclick = ()=> { try{ rec.start(); }catch{} };
  }else{
    mic.disabled=true; mic.title='이 브라우저는 음성 인식을 지원하지 않습니다.';
  }
})();
