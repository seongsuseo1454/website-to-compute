// /functions/api/translate.js
export async function onRequest({ request }) {
  try {
    const { q, source, target } = await request.json();

    // LibreTranslate 공개 인스턴스 (상용 시 자체 호스팅 권장)
    const res = await fetch('https://libretranslate.com/translate
', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({
        q, source, target, format: 'text'  // html 아님
      })
    });

    if (!res.ok) throw new Error('lt_fail');
    const data = await res.json(); // { translatedText: "..." }
    return new Response(JSON.stringify({ text: data?.translatedText ?? '' }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'translate_fail' }), { status: 500 });
  }
}
