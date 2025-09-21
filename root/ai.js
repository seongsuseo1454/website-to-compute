// /ai.js
// ===== 전역 AI 유틸 (모듈 아님, export 없음) =====
(function () {
  // 특수문자/이모지/마크다운 정리 (TTS 전에 가독용)
  function sanitizeForTTS(input) {
    let s = String(input ?? "");
    s = s.replace(/https?:\/\/\S+/g, "");                          // URL 제거
    s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, " ");  // 마크다운/특수문자 정리
    try { s = s.replace(/\p{Extended_Pictographic}/gu, ""); } catch (e) {} // 이모지 제거(가능한 브라우저)
    s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");            // 제어문자 제거
    return s.replace(/\s{2,}/g, " ").trim();
  }

  // ===== TTS (음성 합성) =====
  function speak(text) {
    const line = sanitizeForTTS(text);
    if (!line) return;
    try { window.speechSynthesis.cancel
(); } catch {}
    const u = new SpeechSynthesisUtterance(line);
    u.lang = "ko-KR";
    u.rate = 1.0;
    u.pitch = 1.0;
    try { window.speechSynthesis.speak(u); } catch {}
  }
  function ttsPause(){ try { window.speechSynthesis.pause(); } catch {} }
  function ttsResume(){ try { window.speechSynthesis.resume(); } catch {} }
  function ttsStop(){ try { window.speechSynthesis.cancel
(); } catch {} }

  // ===== STT (음성 인식) =====
  const hasSTT = "webkitSpeechRecognition" in window;
  let recognizer = null;
  function startRecognition(onResult, onError){
    if (!hasSTT) { onError && onError("이 브라우저는 음성 인식을 지원하지 않습니다."); return; }
    try {
      const R = window.webkitSpeechRecognition;
      recognizer = new R();
      recognizer.lang = "ko-KR";
      recognizer.continuous
 = false;
      recognizer.interimResults
 = false;
      recognizer.onresult = (e) => {
        const txt = e.results?.[0]?.[0]?.transcript || "";
        onResult && onResult(txt);
      };
      recognizer.onerror = () => onError && onError("음성 인식 오류가 발생했습니다.");
      recognizer.start();
    } catch {
      onError && onError("음성 인식을 시작할 수 없습니다.");
    }
  }

  // ===== 안전 fetch (실패 자동 throw) =====
  async function safeFetchJSON(url, init){
    let res;
    try { res = await fetch(url, init); } catch (e) { throw new Error("네트워크 실패"); }
    if (!res.ok) throw new Error("HTTP " + res.status);
    try { return await res.json(); } catch { throw new Error("JSON 파싱 실패"); }
  }

  // 전역 공개
  window.AI = {
    sanitizeForTTS,
    speak, ttsPause, ttsResume, ttsStop,
    sttSupported: hasSTT,
    startRecognition,
    safeFetchJSON,
  };
})();
