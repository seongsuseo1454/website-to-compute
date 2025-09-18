// 시계
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// 날씨 API 호출 (Cloudflare Functions → /api/weather)
async function loadWeather() {
  const res = await fetch("/api/weather?city=Seoul");
  const data = await res.json();
  document.getElementById("weather").textContent =
    `${data.city}: ${data.tempC}℃, ${data.condition}, PM2.5 ${data.pm25}`;
}
loadWeather();

// 채팅
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div>🙋 ${text}</div>`;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  });
  const data = await res.json();
  chatBox.innerHTML += `<div>🤖 ${data.reply}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;

  input.value = "";
}
