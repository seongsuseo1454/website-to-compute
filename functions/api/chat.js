export async function onRequestPost({ request, env }) {
  try {
    const { message, history = [] } = await request.json();
    // 여기에 Gemini 등 백엔드 호출 로직 연결 (키는 env.GEMINI_API_KEY)
    // 데모용 에코 응답:
    return new Response(JSON.stringify({
      reply: `AI(모의): "${message}" 잘 받았어요.`,
      echo: { historyCount: history.length }
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
