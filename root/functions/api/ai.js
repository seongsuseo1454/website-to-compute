// Cloudflare Pages Functions
export const onRequestPost = async ({ env, request }) => {
  try {
    const { prompt } = await request.json();
    if (!prompt) return new Response(JSON.stringify({ error:'prompt required' }), { status:400 });

    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!apiKey) return new Response(JSON.stringify({ error:'GEMINI_API_KEY missing' }), { status:500 });

    const body = {
      contents: [{ parts: [{ text: prompt }]}],
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/
${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const t = await res.text();
      return new Response(JSON.stringify({ error:t||res.statusText }), { status:res.status });
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || '(응답 없음)';
    return new Response(JSON.stringify({ text }), { headers:{ 'Content-Type':'application/json' }});
  } catch(e){
    return new Response(JSON.stringify({ error: e.message }), { status:500 });
  }
};
