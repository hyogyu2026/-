봉서 캘린더 v5.2 — 전북 중학교 NEIS 자동 연동

설치: 이 폴더를 GitHub 저장소에 업로드하고 저장소 최상위 netlify.toml의 [build] base를 "bongseo-calendar-v5-2-neis"로 변경하세요.
Netlify Site configuration > Environment variables 에 NEIS_API_KEY를 추가하세요. 나이스 교육정보 개방 포털 https://open.neis.go.kr/ 에서 발급받은 인증키를 입력합니다. 키는 웹 브라우저에 노출되지 않고 Netlify Functions 서버에서만 사용합니다. Netlify에서 재배포하세요.

전북 교육청 코드 P10, 나이스 schoolInfo/SchoolSchedule/mealServiceDietInfo API를 사용합니다.
학교 이름을 2글자 이상 입력하면 전북 중학교를 조회합니다. 등록 버튼을 누르면 학교 코드가 자동 저장되며 학사일정과 급식이 자동 연동됩니다.
기존에 등록한 학교와 동일한 이름을 다시 나이스 검색으로 등록하면 기존 학교 ID를 유지해 시간표 저장 키를 보존합니다.
기존 봉서중학교는 홈페이지 수집 기능을 유지합니다. 나이스 검색에서 봉서중학교를 등록하면 나이스 연동으로 전환합니다.
개인 일정 키 bongseo-personal-v1 및 시간표 키는 변경하지 않습니다. 학교 삭제 시 데이터는 삭제하지 않습니다.
참고: 나이스 API 데이터가 없는 날짜는 빈 결과로 표시됩니다. 급식은 월~일 주간 범위로 조회합니다. 홈페이지 크롤링 기반 기존 등록 학교는 그대로 유지하며 나이스 재등록을 권장합니다.
