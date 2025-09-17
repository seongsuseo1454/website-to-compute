export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({
    steps: 8200, heartRate: 74, bpSys: 121, bpDia: 78, sleepScore: 85, hydration: 64
  }), { headers: { 'content-type': 'application/json' }});
};
