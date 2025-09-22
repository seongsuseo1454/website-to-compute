// /ai.js — FINAL (IIFE + TTS 정제 + askAI 폴백)
(function(){
  // AIDEV-NOTE: 특수문자/이모지/URL 제거로 TTS 가독성 확보
  function sanitizeForTTS(input){
    let s = String(input ?? '');
    s = s.replace(/https?:\/\/\S+/g, ' ');
    s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
    try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch (e) {}
    s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  window.sanitizeForTTS = sanitizeForTTS;

  // AIDEV-NOTE: 로컬 askAI가 있으면 사용, 없으면 /api/ai 폴백
  window.askAI = async function(prompt){
    try{
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ prompt })
      });
      if(!res.ok) throw new Error('AI 호출 실패');
      const data = await res.json();
      return data.text || data.reply || JSON.stringify(data);
    }catch(err){
      return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
  };
})();
