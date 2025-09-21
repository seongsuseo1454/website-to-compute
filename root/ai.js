// ===== 공통 =====
const $ = (s) => document.querySelector(s);

// 인사/시계
(function tick(){
  const now = new Date();
  $("#clock").textContent = now.toLocaleTimeString
("ko-KR",{hour:"2-digit",minute:"2-digit"});
  $("#today").textContent = now.toLocaleDateString
("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",weekday:"long"});
  setTimeout(tick, 1000);
})();

// ===== TTS 도우미 (특수문자/이모지 제거 후 읽기) =====
function sanitizeForTTS(text){
  let s = String(text ?? "");
  s = s.replace(/https?:\/\/\S+/g, " ");
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, " ");
  try { s = s.replace(/\p{Extended_Pictographic}/gu, " "); } catch {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
  return s.replace(/\s{2,}/g, " ").trim();
}
function speak(text){
  if (!$("#ttsToggle").checked) return;
  const t = sanitizeForTTS(text);
  if (!t) return;
  speechSynthesis.cancel
();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "ko-KR"; u.rate = 1.0; u.pitch = 1.0;
  speechSynthesis.speak(u);
}
$("#ttsPause").onclick = () => speechSynthesis.pause();
$("#ttsResume").onclick = () => speechSynthesis.resume();
$("#ttsStop").onclick = () => speechSynthesis.cancel
();

// ===== STT (음성 인식) =====
let rec = null;
if ("webkitSpeechRecognition" in window){
  const R = window.webkitSpeechRecognition;
  rec = new R();
  rec.lang = "ko-KR";
  rec.continuous
 = false;
  rec.interimResults
 = false;
  rec.onresult = (e)=>{
    const txt = e.results[0][0].transcript;
    $("#msgInput").value = txt;
    $("#chatForm").dispatchEvent(new Event("submit", {cancelable:true}));
  };
}
$("#micBtn").onclick = ()=>{ try{ rec && rec.start(); }catch{} };

// ===== 채팅 UI =====
const chat = $("#chat");
function pushMsg(role, text){
  const div = document.createElement("div");
  div.className = role === "user" ? "user" : "bot";
  div.textContent = text;
  chat.appendChild
(div);
  chat.scrollTop = chat.scrollHeight;
}

// AI 호출(간단 폴백) — 서버가 없을 땐 룰베이스로 대응
async function callAI(prompt){
  // 필요 시 /functions/api/ai 로 바꿔 연결할 수 있습니다.
  // 지금은 반드시 성공하도록, 간단한 룰베이스 답변을 사용합니다.
  const p = prompt.trim();
  if (!p) return "무엇을 도와드릴까요?";
  const low = p.toLowerCase();
  if (low.includes
("날씨") || low.includes
("기온")) return "현재 네트워크 기반 실시간 날씨는 상단 카드의 ‘날씨 업데이트’로 확인하실 수 있어요.";
  if (low.includes
("일정")) return "오늘은 10:00 간부 회의, 14:00 기업 대표 면담, 17:00 청소년 간담회가 예정되어 있습니다.";
  if (low.includes
("안녕")) return "안녕하세요. 좋은 하루가 되시길 바랍니다.";
  return "요청을 접수했습니다. 자세한 도움은 비서팀과 연동해 드릴게요.";
}

$("#chatForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const q = $("#msgInput").value.trim();
  if (!q) return;
  $("#msgInput").value = "";
  pushMsg("user", q);
  try{
    const a = await callAI(q);
    pushMsg("bot", a);
    speak(a);
  }catch{
    const msg = "에러가 발생했습니다. 곧 조치하겠습니다.";
    pushMsg("bot", msg); speak(msg);
  }
});

// ===== 날씨(Open-Meteo, KEY 불필요) =====
const wx = { t:$("#t"), h:$("#h"), r:$("#r"), w:$("#w"), status:$("#wxStatus") };

async function fetchWeather(lat, lon){
  // 온도/습도/강수/풍속
  const url = `https://api.open-meteo.com/v1/forecast?latitude=
${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  const j = await res.json();
  const c = j.current || {};
  wx.t.textContent = c.temperature_2m ?? "-";
  wx.h.textContent = c.relative_humidity_2m ?? "-";
  wx.r.textContent = c.precipitation ?? "-";
  wx.w.textContent = c.wind_speed_10m ?? "-";
  wx.status.textContent = "업데이트 완료";
}

async function updateWeather(){
  wx.status.textContent = "위치 확인 중…";
  // 브라우저 위치 실패 시 논산시(36.2009, 127.0930)로 폴백
  const FALLBACK = {lat:36.2009, lon:127.0930};

  try{
    await new Promise((ok, no)=>{
      if (!navigator.geolocation) return no(new Error("no-geolocation"));
      navigator.geolocation.getCurrentPosition(
        (pos)=>{ FALLBACK.lat = pos.coords.latitude; FALLBACK.lon = pos.coords.longitude; ok(); },
        ()=>ok(), // 실패해도 폴백 좌표로 진행
        {enableHighAccuracy:false, timeout:3000, maximumAge:60000}
      );
    });
  }catch{}

  try{
    await fetchWeather(FALLBACK.lat, FALLBACK.lon);
  }catch{
    wx.status.textContent = "네트워크 오류";
  }
}
$("#btnWx").onclick = updateWeather;
// 첫 진입 시 한 번만(모바일에서도 동일)
updateWeather();
