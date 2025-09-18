// assets/js/env.js
export const Env = {
  get theme(){ return localStorage.getItem('mirror:theme') || 'dark'; },
  set theme(v){ localStorage.setItem('mirror:theme', v); document.documentElement.classList.toggle('light', v==='light'); },
  get gemini(){ return localStorage.getItem('mirror:gemini') || ''; },
  set gemini(v){ localStorage.setItem('mirror:gemini', v || ''); },
  get kma(){ return localStorage.getItem('mirror:kma') || ''; },
  set kma(v){ localStorage.setItem('mirror:kma', v || ''); },
  get region(){ return localStorage.getItem('mirror:region') || '충남 논산'; },
  set region(v){ localStorage.setItem('mirror:region', v || ''); },
  get memo(){ return localStorage.getItem('mirror:memo') || ''; },
  set memo(v){ localStorage.setItem('mirror:memo', v || ''); }
};
