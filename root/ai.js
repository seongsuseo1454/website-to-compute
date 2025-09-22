// /public/ai.js  (브라우저에 포함)
// - TTS 안전 정리 + /api/ai 호출 헬퍼

(function(){
  function sanitizeForTTS(input){
    let s = String(input ?? '');
    s = s.replace(/https?:\/\/\S+/g, '');
    s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
    try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch(e) {}
    s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  window.sanitizeForTTS = sanitizeForTTS;

  window.askAI = async function(prompt){
    try{
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt })
      });
      const j = await res.json().catch(()=> ({}));
      return j.text || '응답 없음';
    }catch(e){
      return 'AI 호출 실패';
    }
  };
})();
