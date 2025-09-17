export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify([
    {id:'b1',company:'Tokyo AeroParts',contact:'Sato Akira',timezone:'Asia/Tokyo',language:'ja'},
    {id:'b2',company:'Munich Mobility',contact:'Franz Müller',timezone:'Europe/Berlin',language:'de'},
  ]), { headers: { 'content-type': 'application/json' }});
};
