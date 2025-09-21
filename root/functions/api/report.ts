// root/functions/api/report.ts
export const onRequestGet: PagesFunction = async ({ env }) => {
  // health/ping (로깅만 하고 204)
  try { await forward(env, { type: 'ping' }); } catch {}
  return new Response(null, { status: 204 });
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({}));
    // 간단 검증 & 사이즈 제한
    const payload = {
      type: String(body.type || 'unknown').slice(0, 40),
      message: String(body.message
 || '').slice(0, 500),
      detail: body.detail
 ? String(body.detail
).slice(0, 1000) : undefined,
      stack: body.stack ? String(body.stack).slice(0, 2000) : undefined,
      req: body.req ? String(body.req).slice(0, 500) : undefined,
      sig: String(body.sig || '').slice(0, 40),
      url: String(body.url || '').slice(0, 500),
      ua: String(body.ua || '').slice(0, 300),
      at: String(body.at || new Date().toISOString()),
    };

    // 서버 콘솔에도 남김
    console.log('[report]', payload.type, payload.message
, payload.url);

    await forward(env, payload);
    return json({ ok: true });
  } catch (e) {
    console.error('report failed', e);
    return json({ ok: false, error: 'report_failed' }, 500);
  }
};

async function forward(env: Env, payload: any) {
  const url = env.WEBHOOK_URL;
  if (!url) return; // 웹훅 미설정 시 조용히 무시(프로덕션에선 필수로 두세요)

  // Slack/Discord 겸용 포맷 (둘 다 JSON POST 지원)
  const content = formatForWebhook(payload);

  await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(content),
  }).catch((e) => console.error('webhook send error', e));
}

function formatForWebhook(p: any) {
  const title = `🛠️ 스마트미러 오류 리포트 – ${p.type}`;
  const lines = [
    `• 메시지: ${p.message || '-'}`,
    p.detail ? `• 상세: ${p.detail}` : null,
    p.req ? `• 요청: ${p.req}` : null,
    `• URL: ${p.url || '-'}`,
    `• 시간: ${p.at || '-'}`,
    `• UA: ${p.ua || '-'}`,
    p.stack ? '```' + p.stack + '```' : null,
  ].filter(Boolean);

  // Slack(Blocks)과 Discord(content) 둘 다 무난한 형식
  return {
    text: title + '\n' + lines.join('\n'),
    // Discord 용
    content: title + '\n' + lines.join('\n'),
    // Slack 용(블록이 없어도 text로 수신됨)
  };
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
  });
}

type Env = {
  WEBHOOK_URL?: string;
};
