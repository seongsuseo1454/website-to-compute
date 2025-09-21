/* ai.js – 브라우저 전역 유틸 (모듈 아님) */

// 특수문자/이모지/마크다운 제거 (TTS 친화)
window.sanitizeForTTS = function(input){
  let s = String(input ?? '');
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
  try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch(e) {}
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
};

// 간단 AI 호출(있으면 서버, 없으면 에코)
window.askAI = async function(prompt){
  try{
    const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) });
    if(!res.ok) throw new Error('AI HTTP '+res.status);
    const d = await res.json();
    return d.text || d.reply || JSON.stringify(d);
  }catch(_){
    return `“${prompt}” 요청을 확인했습니다. 네트워크가 안정되면 더 자세히 도와드릴게요.`;
  }
};

// 통역용 언어 목록(코드, 표기)
window.TR_LANGS = [
  ['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文'],['zh-TW','繁體中文'],
  ['fr','Français'],['de','Deutsch'],['es','Español'],['pt','Português'],['it','Italiano'],
  ['ru','Русский'],['vi','Tiếng Việt'],['th','ไทย'],['id','Bahasa Indonesia']
];

// 코드→TTS 보이스 (대략 매핑)
window.langToVoice = {
  ko:'ko-KR', en:'en-US', ja:'ja-JP', 'zh':'zh-CN', 'zh-TW':'zh-TW',
  fr:'fr-FR', de:'de-DE', es:'es-ES', pt:'pt-PT', it:'it-IT',
  ru:'ru-RU', vi:'vi-VN', th:'th-TH', id:'id-ID'
};

// (선택) 서버측 번역 API가 있으면 사용, 없으면 원문 반환
window.translateText = async function(text, from, to){
  try{
    const r = await fetch('/api/translate', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, from, to })});
    if(!r.ok) throw 0;
    const d = await r.json();
    return d.translated ?? text;
  }catch(_){ return text; }
};
