// 브라우저 음성 인식 (STT)
document.getElementById("voiceBtn").addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window)) {
    alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
    return;
  }
  const rec = new webkitSpeechRecognition();
  rec.lang = "ko-KR";
  rec.start();

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    addMessage("user", text);
    // AI 대화 API 연결
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    })
      .then((res) => res.json())
      .then((data) => addMessage("ai", data.reply || "응답 없음"))
      .catch(() => addMessage("ai", "AI 응답 오류"));
  };
});
