export const onRequestGet: PagesFunction = async () => {
  // TODO: 그룹웨어/스프레드시트 연동. 지금은 하드코딩 예시
  const items = [
    { dept:'행정과', title:'국민신문고 민원 처리 현황', when:'오늘', owner:'민원팀', note:'기한 내 처리 98%' },
    { dept:'안전총괄과', title:'태풍 대비 점검', when:'오늘', owner:'안전관리팀' },
  ];
  return new Response(JSON.stringify({ items }), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
