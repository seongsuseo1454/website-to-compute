// /functions/api/weather.js
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const lat = Number(url.searchParams.get('lat') || '36.1872');  // 논산 폴백
    const lon = Number(url.searchParams.get('lon') || '127.0989');

    const om = new URL('https://api.open-meteo.com/v1/forecast');
    om.searchParams.set('latitude', lat);
    om.searchParams.set('longitude', lon);
    om.searchParams.set('current_weather', 'true');
    om.searchParams.set('hourly', 'relative_humidity_2m,precipitation');

    const r = await fetch(om, { headers: { 'accept': 'application/json' } });
    const j = await r.json();

    const temp = j?.current_weather?.temperature ?? null;
    const windspeed = j?.current_weather?.windspeed ?? null;
    const humidity = j?.hourly?.relative_humidity_2m?.[0] ?? null;
    const rain = j?.hourly?.precipitation?.[0] ?? 0;

    return new Response(JSON.stringify({ temp, windspeed, humidity, rain }), {
      headers: { 'content-type': 'application/json; charset=utf-8',
                 'cache-control': 'no-store' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'weather_fail' }), { status: 500 });
  }
}

