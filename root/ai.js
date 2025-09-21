// ai.js  (루트에 두세요)

/**
 * 음성 합성 전에 특수문자/이모지/마크다운/URL 등을 정리
 */
export function sanitizeForTTS(input) {
  let s = String(input ?? '');
  // URL 제거
  s = s.replace(/https?:\/\/\S+/g, '');
  // 마크다운/특수문자 정리
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  // 이모지 제거 (Unicode property 사용 가능한 브라우저)
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch (e) {}
  // 제어문자 제거
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  // 공백 정리
  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * 서버의 AI 라우트에 질의 (Cloudflare Pages/Workers: /api/ai)
 * 서버는 환경변수(GEMINI_API_KEY 등)로 외부 모델 호출
 */
export async function askAI(prompt) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error('AI 호출 실패: ' + res.status + ' ' + text);
  }
  const data = await res.json().catch(()=> ({}));
  return data.text || data.reply || data.result || JSON.stringify(data);
}

/**
 * 클라이언트 에러 리포트 (옵션)
 * 서버에 /api/report 구현되어 있으면 자동 수집
 */
export async function reportClientError(payload = {}) {
  try {
    await fetch('/api/report', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        ...payload,
        ua: navigator.userAgent
,
        url: location.href,
        at: new Date().toISOString()
      }),
      keepalive: true
    });
  } catch {
    // 리포트 실패는 무시
  }
}
