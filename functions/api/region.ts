export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({
    pm10: 51, pm25: 22, tempC: 26, humidity: 60, windMs: 2.8, condition: '맑음',
    incidents: [{type:'민원',count:5},{type:'도로',count:1}]
  }), { headers: { 'content-type': 'application/json' }});
};
