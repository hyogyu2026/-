# 전북 교사 캘린더 — GitHub + Cloudflare Workers

## 배포
1. 이 폴더의 파일을 GitHub 저장소에 올립니다. 기존 Netlify 폴더는 그대로 두세요.
2. Cloudflare 대시보드 → Workers & Pages → Create → Worker → Import a repository (GitHub)에서 저장소를 연결합니다. 대시보드 메뉴 명칭은 변할 수 있습니다.
3. **Root directory**가 이 폴더를 가리키도록 설정합니다(저장소 최상위에 이 폴더를 업로드했다면 `bongseo-calendar-cloudflare`). Build command는 `npm install` 또는 `npm ci`, Deploy command는 `npx wrangler deploy`입니다. 저장소 최상위에 바로 올린 경우 Root directory는 `/`입니다.
4. Worker → Settings → Variables and Secrets → Add → Secret: `NEIS_API_KEY`에 본인의 나이스 인증키를 등록하고 재배포합니다. 절대로 GitHub에 올리지 마세요.
5. 발급된 `*.workers.dev` 주소로 접속합니다. `/api/neis?action=search&q=전주오송`에 접속해 `ok:true` 및 학교 목록이 표시되는지 확인합니다.

## 구성
- `public/` : 기존 v5.4의 정적 UI, 개인 일정 및 학교별 시간표 로컬 저장
- `worker.js` : 나이스 학교 검색, 학사일정, 급식 API 프록시
- `wrangler.jsonc` : Workers 정적 자산 설정

## 중요한 차이
- 기존 봉서중학교 홈페이지 스크래핑 대신 **나이스 학사일정·급식**으로 조회합니다. 기존 학교 홈페이지 일정과 나이스 등록 일정이 일치하지 않을 수 있습니다.
- 학교 검색 후 선택하면 `neisCode`를 저장하여 해당 학교의 학사일정과 급식을 조회합니다.
- 기존 Netlify 도메인의 localStorage 데이터는 Workers 도메인으로 자동 이전되지 않습니다. 기존 앱의 개인 일정 JSON을 백업하여 새 앱에 가져오세요. **학교별 시간표는 기존 앱에 내보내기 기능이 없을 수 있으므로 기존 화면을 기록하거나, 데이터 이전 기능을 추가하기 전까지 기존 사이트 데이터를 지우지 마세요.**
- Cloudflare Workers의 Cache API를 사용합니다. 학교 검색은 6시간, 일정·급식은 1시간 캐시합니다. 캐시는 데이터센터별이며 전역적으로 일관된 캐시가 아닙니다. 분산 rate limiting은 별도로 구현되지 않았습니다.
- 나이스 API 키는 Worker 서버에서만 사용합니다. 브라우저에는 노출되지 않습니다.
- 나이스 운영단계 이용 승인 조건과 Cloudflare 무료 한도는 공개 배포 전에 확인하세요.

## 로컬 확인
`npm install` 후 `npx wrangler dev`로 테스트합니다. 로컬에서는 `.dev.vars` 파일에 `NEIS_API_KEY=...`를 넣을 수 있으나 Git에 올리지 마세요.
