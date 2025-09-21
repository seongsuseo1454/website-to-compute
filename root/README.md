# 스마트미러 PRO (시장님 집무실)

> 논산시 납품용 스마트미러. AI 비서 + 일정 + 시정뉴스 + (유료) 부서 업무보고.

## 기능
- **AI 비서 (채팅 + 음성)** — 기본 서비스
- **시장님 일정** — 무료
- **시정뉴스** — 무료(일반 공지) / 유료(기관 대량 송출·전용앱)
- **부서별 업무보고** — 유료(부서장 전용, 권한/감사로그 포함)

## 배포/운영
- Cloudflare Pages 정적 배포
- 환경변수: `GEMINI_API_KEY`, `KMA_SERVICE_KEY` (Settings → Variables)
- 변경 후 Deployments에서 **Trigger redeploy**

## 구조(요약)
