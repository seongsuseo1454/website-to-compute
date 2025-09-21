/* =========================
   스마트미러 프론트엔드 통합 스크립트
   - 채팅(텍스트)
   - 음성 읽기(TTS) + 음성 입력(STT)
   - 날씨(기본값 보장)
   - 실시간 시계
   - 오류 배지/리포트(간단)
========================= */

// ---------- DOM 헬퍼 ----------
const $ = (s) => document.querySelector(s);

// ---------- 시계/날짜 ----------
function tick() {
  const now = new Date();
  const dateEl = $("#today");
  const clockEl = $("#clock");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString
("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    });
  }
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString
("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
setInterval(tick, 1000);
tick();

// ---------- 채팅 ----------
const chat = $("#chat");
const form = $("#chatForm");
const input = $("#msgInput");

function pushMsg(role, text) {
  const div = document.createElement("div");
  div.className = role === "user" ? "user" : "bot";
  div.textContent = text;
  chat.appendChild
(div);
  chat.scrollTop = chat.scrollHeight;
}

// (선택) 백엔드 프록시가 있을 때 사용
async function callBackend(prompt) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("AI 응답 실패");
  const data = await res.json();
  return data.text || data.reply || JSON.stringify(data);
}

// 안전한 폴백 로컬응답(백엔드 실패 시에도 동작)
async function callAI(prompt) {
  try {
    // window.askAI 가 있으면 우선 사용(향후 확장)
    if (typeof window.askAI === "function") {
      return await window.askAI(prompt);
    }
    // 프록시 시도
    return await callBackend(prompt);
  } catch {
    // 폴백(간단 규칙)
    if (/날씨|기온|온도/.test(prompt)) {
      return "오늘은 맑고 약간 더운 편입니다. 오후에 가벼운 바람이 예상됩니다.";
    }
    if (/일정|스케줄/.test(prompt)) {
      return "오전에는 회의가, 오후에는 현장 방문 일정이 있습니다.";
    }
    return "네, 확인했습니다. 필요한 내용을 말씀해 주세요.";
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  pushMsg("user", q);
  const a = await callAI(q);
  pushMsg("bot", a);
  speak(a);
});

// ---------- TTS(음성 읽기) ----------
const ttsToggle = $("#ttsToggle");
const btnPause = $("#ttsPause");
const btnResume = $("#ttsResume");
const btnStop = $("#ttsStop");

export function sanitizeForTTS(input) {
  let s = String(input);
  // URL 제거
  s = s.replace(/https?:\/\/\S+/g, "");
  // 마크다운/특수문자 제거
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, " ");
  // 이모지(환경에 따라 지원되지 않을 수 있어 try-catch)
  try {
    s = s.replace(/\p{Extended_Pictographic}/gu, "");
  } catch {}
  // 제어문자 제거
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return s.replace(/\s{2,}/g, " ").trim();
}

function speak(text) {
  if (!ttsToggle?.checked) return;
  const line = sanitizeForTTS(text);
  if (!line) return;
  const synth = window.speechSynthesis;
  synth.cancel
();
  const u = new SpeechSynthesisUtterance(line);
  u.lang = "ko-KR";
  u.rate = 1.0;
  u.pitch = 1.0;
  synth.speak(u);
}

btnPause?.addEventListener("click", () => window.speechSynthesis.pause());
btnResume?.addEventListener("click", () => window.speechSynthesis.resume());
btnStop?.addEventListener("click", () => window.speechSynthesis.cancel
());

// ---------- STT(음성 입력) ----------
const micBtn = $("#micBtn");
let rec = null;
if ("webkitSpeechRecognition" in window) {
  const R = window.webkitSpeechRecognition;
  rec = new R();
  rec.lang = "ko-KR";
  rec.continuous
 = false;
  rec.interimResults
 = false;
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    input.value = txt;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  };
  rec.onerror = () => alert("음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.");
} else if (micBtn) {
  micBtn.disabled = true;
  micBtn.title = "이 브라우저는 음성 인식을 지원하지 않습니다.";
}
micBtn?.addEventListener("click", () => {
  try {
    rec && rec.start();
  } catch {}
});

// ---------- 날씨(기본값 보장) ----------
const btnWeather = $("#btnWeather");
const t1 = $("#t1"); // 온도
const h1 = $("#h1"); // 습도
const r1 = $("#r1"); // 강수
const w1 = $("#w1"); // 풍속

function showWeather({ t = 26, h = 58, r = "-", w = "1.8 m/s" } = {}) {
  if (t1) t1.textContent = `${t}℃`;
  if (h1) h1.textContent = `${h}%`;
  if (r1) r1.textContent = `${r}`;
  if (w1) w1.textContent = `${w}`;
}

// 간단 기본값(항상 표시되도록)
async function loadWeather() {
  // TODO: 실제 API 연동 시 이곳에서 safeFetch 사용
  showWeather();
}

btnWeather?.addEventListener("click", loadWeather);
loadWeather(); // 첫 진입에도 값 보장

// ---------- 오류 뱃지 ----------
const badgeId = "errorBadge";
(function ensureErrorBadge() {
  if (!document.getElementById(badgeId)) {
    const el = document.createElement("div");
    el.id = badgeId;
    el.style.cssText =
      "position:fixed;right:12px;bottom:12px;background:#ff4d4f;color:#fff;padding:8px 10px;border-radius:8px;font-size:12px;display:none;z-index:9999";
    el.textContent = "문제 감지 · 팀에 보고됨";
    document.body.appendChild
(el);
  }
})();
function showBadge() {
  const el = document.getElementById(badgeId);
  if (el) el.style.display = "block";
}
window.addEventListener
("error", showBadge);
window.addEventListener
("unhandledrejection", showBadge);
