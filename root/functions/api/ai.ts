// =======================
// Gemini AI 호출
// =======================
export async function askGemini(prompt: string): Promise<string> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`Gemini API 호출 실패: ${res.status}`);
    const data = await res.json();
    return (data.text ?? "").toString().trim() || "응답이 비었습니다.";
  } catch (err) {
    console.error("Gemini 호출 오류:", err);
    return "AI 호출 중 문제가 발생했습니다.";
  }
}

// =======================
// 기상청 날씨 API 호출 (좌표 nx,ny + 날짜/시간: 'YYYYMMDD','HHMM')
// =======================
export async function fetchWeather(nx: number, ny: number, date: string, time: string) {
  try {
    const url = `/api/weather?nx=${nx}&ny=${ny}&date=${date}&time=${time}&type=JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`기상청 API 호출 실패: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error("기상청 호출 오류:", err);
    return { error: "날씨 데이터를 가져오지 못했습니다." };
  }
}

// =======================
// 브라우저 TTS (특수문자/이모지 제거 + 청크 낭독 + 일시정지/재개/정지)
// =======================

// 특수문자/이모지/URL 제거
function cleanTextForSpeech(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD")
    .replace(/https?:\/\/\S+/g, " ") // URL 제거
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\u2600-\u27BF]/gu,
      " "
    ) // 이모지 제거
    .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s.,!?~…:;()-]/g, " ") // 너무 과한 특수문자 제거
    .replace(/\s{2,}/g, " ")
    .trim();
}

// 긴 텍스트를 안정적으로 읽도록 분할
function chunkText(text: string, maxLen = 180): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const w of words) {
    const next = (buf.join(" ") + " " + w).trim();
    if (next.length > maxLen) {
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

export function speakText(text: string) {
  stopSpeech(); // 기존 재생 초기화
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

export function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
}
export function resumeSpeech() {
  if (speechSynthesis.paused) speechSynthesis.resume();
}
export function stopSpeech() {
  if (speechSynthesis.speaking || speechSynthesis.paused) speechSynthesis.cancel();
  _ttsQueue = [];
  _speaking = false;
}

// =======================
// 전역 노출: index.html에서 직접 호출 가능
// =======================
;(window as any).askGemini = askGemini;
;(window as any).fetchWeather = fetchWeather;
;(window as any).speakText = speakText;
;(window as any).pauseSpeech = pauseSpeech;
;(window as any).resumeSpeech = resumeSpeech;
;(window as any).stopSpeech = stopSpeech;
