export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({
    members:[
      {id:'m1',name:'김시정',title:'국장',dept:'기획예산',email:'plan@city.go.kr',phone:'010-1111-2222',onDuty:true},
      {id:'m2',name:'박민원',title:'팀장',dept:'민원서비스',email:'civil@city.go.kr',phone:'010-3333-4444'},
    ],
    tasks:[
      {id:'t1',title:'예산 조정안 브리핑',dept:'기획예산',ownerId:'m1',priority:'상',status:'대기',due:new Date(Date.now()+864e5).toISOString()}
    ]
  }), { headers: { 'content-type': 'application/json' }});
};
