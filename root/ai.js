// ai.js
// AIDEV-NOTE: 특수문자/이모지/URL 제거하여 자연스러운 발화 유지
export function sanitizeForTTS(input){
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  try{ s = s.replace(/\p{Extended_Pictographic}/gu, ''); }catch(e){}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  return s.replace(/\s{2,}/g,' ').trim();
}
window.sanitizeForTTS = sanitizeForTTS;

// AIDEV-NOTE: 페이지 함수 폴백을 고려하여 프론트에서 단일 API만 사용
window.askAI = async function(prompt){
  const res = await fetch('/api/ai',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt })
  });
  if(!res.ok) throw new Error('AI 응답 실패');
  const data = await res.json();
  return data.text || data.reply || JSON.stringify(data);
};
