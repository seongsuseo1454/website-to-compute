// /root/ai.js
// - TTS 안전 정리 + /api/ai 호출 헬퍼 + 성별 선택형 음성합성

(function(){
  // -----------------------------
  // 1) 텍스트 정리 (TTS용)
  // -----------------------------
  function sanitizeForTTS(input){
    let s = String(input ?? '');
    // URL 제거
    s = s.replace(/https?:\/\/\S+/g, '');
    // 마크다운/특수문자 단순화
    s = s.replace(/[\*\_\`\~\^\#\>\<\|\:\\\/\[\]\{\}\-]+/g, ' ');
    // 이모지 제거 (지원 브라우저만)
    try { s = s.replace(/\p{Extended_Pictographic}/gu, ''); } catch(e) {}
    // 제어문자 제거
    s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  window.sanitizeForTTS = sanitizeForTTS;

  // -----------------------------
  // 2) AI 호출 (서버 라우트에 위임)
  // -----------------------------
  window.askAI = async function(prompt){
    try{
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt })
      });
      const j = await res.json().catch(()=> ({}));
      return j.text || j.reply || '응답 없음';
    }catch(e){
      return 'AI 호출 실패';
    }
  };

  // -----------------------------
  // 3) 브라우저 TTS 유틸
  // -----------------------------
  const GENDER_KEY = 'tts.gender.pref'; // 'male' | 'female' | 'auto'
  const LANG_FALLBACK = 'ko-KR';

  function getGender(){
    const v = localStorage.getItem(GENDER_KEY);
    return v === 'male' || v === 'female' ? v : 'auto';
  }
  function setGender(g){
    if (g === 'male' || g === 'female' || g === 'auto') {
      localStorage.setItem(GENDER_KEY, g);
    }
  }

  function whenVoicesReady(){
    return new Promise((resolve)=>{
      const voices = speechSynthesis.getVoices();
      if (voices && voices.length) return resolve(voices);
      const onVoices = ()=>{
        const list = speechSynthesis.getVoices();
        if (list && list.length) {
          speechSynthesis.removeEventListener('voiceschanged', onVoices);
          resolve(list);
        }
      };
      speechSynthesis.addEventListener('voiceschanged', onVoices);
      setTimeout(()=> resolve(speechSynthesis.getVoices()||[]), 1000);
    });
  }

  function guessVoiceGender(voice){
    const name = (voice?.name || '').toLowerCase();
    if (/(female|woman|salli|joanna|mia|olivia|susan|hanna|lucy|sakura|yuna)/i.test(name)) return 'female';
    if (/(male|man|matthew|justin|joey|adrian|takumi|minho|hyun)/i.test(name)) return 'male';
    return 'auto';
  }

  function pickVoice(voices, lang, genderPref){
    const langLC = (lang || LANG_FALLBACK).toLowerCase();
    const preferGender = genderPref || getGender();

    const sameLang = voices.filter(v => (v.lang||'').toLowerCase().startsWith(langLC));

    if (preferGender !== 'auto') {
      const byGender = sameLang.find(v => guessVoiceGender(v) === preferGender);
      if (byGender) return byGender;
    }
    if (sameLang.length) return sameLang[0];

    if (preferGender !== 'auto') {
      const anyGender = voices.find(v => guessVoiceGender(v) === preferGender);
      if (anyGender) return anyGender;
    }
    return voices[0] || null;
  }

  async function speak(text, opts = {}){
    if (!text) return;
    const clean = sanitizeForTTS(text);
    if (!clean) return;

    const lang = opts.lang || LANG_FALLBACK;
    const rate = typeof opts.rate === 'number' ? opts.rate : 1.0;
    const pitch = typeof opts.pitch === 'number' ? opts.pitch : 1.0;
    const gender = opts.gender || getGender();

    try { window.speechSynthesis.cancel(); } catch {}

    const voices = await whenVoicesReady();
    const voice = pickVoice(voices, lang, gender);

    const u = new SpeechSynthesisUtterance(clean);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || lang;
    u.rate = rate;
    u.pitch = pitch;

    return new Promise((resolve) => {
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });
  }

  function pause(){ try { window.speechSynthesis.pause(); } catch {} }
  function resume(){ try { window.speechSynthesis.resume(); } catch {} }
  function stop(){ try { window.speechSynthesis.cancel(); } catch {} }

  async function listVoices(){
    const voices = await whenVoicesReady();
    return voices.map(v => ({
      name: v.name, lang: v.lang, gender: guessVoiceGender(v)
    }));
  }

  // 전역 공개
  window.tts = {
    speak, pause, resume, stop,
    setGender, getGender,
    listVoices
  };
})();
