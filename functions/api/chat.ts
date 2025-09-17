export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { message } = await request.json();
  // TODO: env.GEMINI_KEY 사용해 외부 API 호출 (서버에서만 보관)
  return new Response(JSON.stringify({ reply: `AI(placeholder): "${message}" 접수 완료.` }),
    { headers: { 'content-type': 'application/json' }});
};
