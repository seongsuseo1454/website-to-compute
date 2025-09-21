export const onRequestGet: PagesFunction = async () => {
  // TODO: RSS/사내 API 연동. 지금은 하드코딩 예시
  const items = [
    { title: '도시재생 사업 주민설명회 개최', url: '', source: '시정뉴스', time: '오늘' },
    { title: '추석 연휴 종합대책 본격 가동', url: '', source: '시청', time: '오늘' },
  ];
  return new Response(JSON.stringify({ items }), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
