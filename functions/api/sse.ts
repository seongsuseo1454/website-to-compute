export const onRequestGet: PagesFunction = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const send = obj => controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
      );
      send({type:'system_health_update',payload:{api:'ok',db:'ok',tts:'ok',stt:'ok',cpu:22,memory:41}});
      const id = setInterval(()=>{
        send({type:'cti_update',payload:{total:Math.floor(Math.random()*50),waiting:Math.floor(Math.random()*5),inProgress:Math.floor(Math.random()*8),urgent:Math.floor(Math.random()*2)}});
      }, 3000);
      const tid = setInterval(()=>{
        send({type:'proactive_agenda',payload:{message:'14:00 해외 바이어 회의 10분 전 리마인드'}});
      }, 15000);
      controller.close = ()=>{ clearInterval(id); clearInterval(tid); };
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' }});
};
