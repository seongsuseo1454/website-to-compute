/* ===== STT (보다 견고하게) ===== */
let rec;

async function ensureMicPermission() {
  // 일부 환경에서 Recognition 시작 전에 권한 프롬프트가 안 뜨는 경우가 있어 선요청
  try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { /* 사용자가 취소할 수도 있음 */ }
}

function initSTT() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) {
    micBtn.disabled = true;
    micBtn.title = '이 브라우저는 음성 입력(STT)을 지원하지 않습니다. Chrome/Edge를 사용하세요.';
    return;
  }
  rec = new R();
  rec.lang = 'ko-KR';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onresult = (e) => {
    const txt = e.results?.[0]?.[0]?.transcript || '';
    if (txt) {
      input.value = txt;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };
  rec.onerror = (ev) => {
    alert('음성 인식 오류: ' + (ev?.error || '알 수 없음') + '\n마이크 권한/네트워크를 확인하세요.');
  };

  micBtn.onclick = async () => {
    try {
      await ensureMicPermission();
      rec.start();
    } catch (_) {}
  };
}

initSTT();
