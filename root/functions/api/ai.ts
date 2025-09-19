// =======================
// Gemini AI 호출 함수
// =======================
export async function askGemini(prompt: string): Promise<string> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error("Gemini API 호출 실패");
    const data = await res.json();
    return data.text || "응답 없음";
  } catch (err) {
    console.error("Gemini 호출 오류:", err);
    return "AI 호출 중 문제가 발생했습니다.";
  }
}

// =======================
// 기상청 날씨/태풍/지진 API 호출 함수
// =======================
export async function fetchWeather(
  nx: number,
  ny: number,
  date: string,
  time: string
) {
  try {
    const url = `/api/weather?nx=${nx}&ny=${ny}&date=${date}&time=${time}&type=JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("기상청 API 호출 실패");
    return res.json();
  } catch (err) {
    console.error("기상청 호출 오류:", err);
    return { error: "날씨 데이터를 가져오지 못했습니다." };
  }
}

// =======================
// 음성합성(TTS) 유틸
// =======================

// 텍스트 전처리: 특수문자/이모지/URL 제거
function cleanTextForSpeech(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\u2600-\u27BF]/gu,
      " "
    )
    .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// 긴 문장 나누기 (브라우저 TTS 안정성 확보용)
function chunkText(text: string, maxLen = 180): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const w of words) {
    if ((buf.join(" ") + " " + w).trim().length > maxLen) {
      if (buf.length) chunks.push(buf.join(" ").trim());
      buf = [w];
    } else {
      buf.push(w);
    }
  }
  if (buf.length) chunks.push(buf.join(" ").trim());
  return chunks;
}

let _ttsQueue: string[] = [];
let _speaking = false;

// 말하기 시작
export async function speakText(text: string) {
  stopSpeech();
  const clean = cleanTextForSpeech(text);
  if (!clean) return;
  _ttsQueue = chunkText(clean);
  _speaking = true;
  playNextChunk();
}

function playNextChunk() {
  if (!_speaking || _ttsQueue.length === 0) {
    _speaking = false;
    return;
  }
  const chunk = _ttsQueue.shift()!;
  const u = new SpeechSynthesisUtterance(chunk);
  u.lang = "ko-KR";
  u.rate = 1.0;
  u.pitch = 1.0;

  u.onend = () => playNextChunk();
  u.onerror = () => playNextChunk();

  speechSynthesis.speak(u);
}

// 제어 버튼용
export function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
  }
}

export function resumeSpeech() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
  }
}

export function stopSpeech() {
  if (speechSynthesis.speaking || speechSynthesis.paused) {
    speechSynthesis.cancel();
  }
  _ttsQueue = [];
  _speaking = false;
}

// =======================
// 전역 노출 (index.html 버튼에서 직접 호출 가능하게)
// =======================
;(window as any).askGemini = askGemini;
;(window as any).fetchWeather = fetchWeather;
;(window as any).speakText = speakText;
;(window as any).pauseSpeech = pauseSpeech;
;(window as any).resumeSpeech = resumeSpeech;
;(window as any).stopSpeech = stopSpeech;
