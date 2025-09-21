// functions/api/admin.ts
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  // 헤더나 쿼리에 실은 토큰 확인
  const url = new URL(request.url);
  const token =
    request.headers.get("x-admin-token") || url.searchParams.get("token");

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }

  // 간단한 헬스체크/관리 작업 응답
  const body = await request.text().catch(() => "");
  return new Response(
    JSON.stringify({
      ok: true,
      received: body || null,
      at: new Date().toISOString(),
    }),
    { headers: { "content-type": "application/json" } }
  );
};
