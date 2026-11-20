봉서 캘린더 v5.3 — 로그인 없는 공용 교사용

기존 v5.2를 기반으로 수정했습니다.

[개인정보/저장]
개인 일정: localStorage bongseo-personal-v1 (기존 키 유지)
학교별 시간표: 기존 학교별 localStorage 키 유지
등록 학교: 기존 localStorage 키 유지
다른 브라우저, 다른 PC, 다른 프로필에서는 자동 동기화되지 않습니다.
같은 브라우저 프로필을 공동으로 사용하면 데이터가 분리되지 않습니다.

[서버]
NEIS_API_KEY는 Netlify Site configuration > Environment variables에만 등록하세요.
GitHub/HTML/브라우저 코드에 키를 넣지 마세요.
나이스 응답은 Netlify CDN 캐시(학교검색 6시간, 학사일정/급식 1시간)를 요청합니다.
Netlify 플랜/배포 환경에 따라 CDN 캐시 지원 여부를 확인해야 합니다.
인스턴스 메모리 기반의 분당 45회 간이 제한이 있으며, 서버 전체에 적용되는 보장된 분산 제한은 아닙니다.
대규모 공개 운영 시 Netlify 방화벽/레이트 리미팅 또는 외부 공유 저장소 기반 제한을 추가해야 합니다.

[배포]
기존 GitHub 저장소에 bongseo-calendar-v5-3-public 폴더 업로드.
루트 netlify.toml의 [build] base = "bongseo-calendar-v5-3-public" 로 변경.
기존 설정(command, publish, functions, NODE_VERSION)은 유지하세요.
배포 전 개인 일정 JSON 백업 권장.
나이스 API의 운영단계 승인/표시조건은 운영자가 확인해야 합니다.

[검증]
정적 JavaScript 문법 검사 및 ZIP 구조 확인.
실제 Netlify 배포, CDN 적중, 나이스 데이터 제공 상태는 별도 검증 필요.
