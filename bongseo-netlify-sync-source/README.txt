봉서 캘린더 v2 — 학교 홈페이지 연동 시범판

중요: 이 버전은 Netlify Functions가 필요합니다. Netlify Drop의 폴더 드래그만으로 함수가 배포된다고 가정하면 안 됩니다.

권장 배포:
1. GitHub 저장소에 이 폴더의 모든 파일을 업로드합니다.
2. Netlify 대시보드에서 Add new project > Import an existing project > GitHub를 선택합니다.
3. Build command: npm run build / Publish directory: . / Functions: netlify/functions
4. 배포 후 /.netlify/functions/school-calendar?year=2026&month=11 주소를 열어 JSON을 확인합니다.
5. 응답이 ok:true이고 날짜와 제목이 공식 학사일정과 일치하는지 비교합니다.
6. 기존 배포 사이트를 보존하려면 별도 새 사이트로 먼저 테스트합니다.

주의: 이 환경에서는 학교 홈페이지의 원본 HTML을 직접 가져와 파서 동작을 검증하지 못했습니다. 서버 함수의 날짜/제목 추출은 시범 구현이며, 실제 페이지 HTML 구조에 맞춘 보완이 필요할 수 있습니다. 인증키/공동인증서는 사용하지 않습니다.

개인 일정은 기존 브라우저 localStorage 키(bongseo-personal-v1)를 그대로 사용합니다. 새 Netlify 주소로 배포하면 기존 주소의 개인 일정은 자동 이동되지 않으므로 기존 앱에서 JSON 백업 후 새 앱에서 복원하세요.
