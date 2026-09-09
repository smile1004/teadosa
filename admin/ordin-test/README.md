# 지자체 조례 조회 테스트

배포 주소: /test2 (test2.html). 관리자 계정 로그인 후 사용합니다.
Cloudflare Pages Production에 LAW_API_OC를 Secret으로 등록하고 재배포하세요.
국가법령정보 공동활용에서 승인된 OC를 사용합니다. 한전 키와는 별개입니다.
현행 자치법규의 목록 JSON 및 본문 JSON 신청이 필요합니다.

검색어 예: 조례명 검색 '완주군 군계획', 본문 검색 '태양광'.
org/sborg는 선택 입력이며 법령 API의 7자리 기관코드입니다.

로컬: 프로세스 환경변수 LAW_API_OC 설정 후 node scripts/serve-ordin-test.mjs
http://127.0.0.1:8773/test2 에서 로그인 없이 로컬 검증 가능합니다.
OC가 없으면 설정 안내를 표시합니다. 승인된 계정의 실제 응답 검증은 별도로 필요합니다.

공식 명세:
https://open.law.go.kr/LSO/openApi/guideResult.do?htmlName=ordinListGuide
https://open.law.go.kr/LSO/openApi/guideResult.do?htmlName=ordinInfoGuide
