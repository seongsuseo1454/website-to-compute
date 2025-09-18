// UI 전반 컨트롤
console.log("UI 모듈 로드됨");

// 메시지 추가
function addMessage(role, text) {
  const chat = document.getElementById("chat");
  const msg = document.createElement("div");
  msg.className = role;
  msg.textContent = `${role.toUpperCase()}: ${text}`;
  chat.appendChild(msg);
}
window.addMessage = addMessage;
