# 한전 API 테스트

배포 후 주소: `/test1` (루트 test1.html, 정적 자원은 /admin/kepco-test/ 사용)

Cloudflare Pages의 Production(필요하면 Preview) 환경에 `KEPCO_API_KEY`를 Secret으로 등록하고 다시 배포합니다. 페이지에서 로그인 없이 조회합니다. 인증키를 저장소나 HTML에 넣지 않습니다.

로컬 실행: 프로세스 환경변수 `KEPCO_API_KEY`를 설정한 뒤 `node scripts/serve-kepco-test.mjs`를 실행하고 `http://127.0.0.1:8772`에 접속합니다. 로컬 전용 서버는 127.0.0.1에만 열리며 로그인 없이 시험 조회할 수 있습니다.

공식 명세: https://bigdata.kepco.co.kr/cmsmain.do?scode=S01&pcode=000493&pstate=L → 분산전원연계 정보

조회 필드: metroCd, cityCd, addrLidong, addrLi, addrJibun, substCd. 전국 전체 요청 방지를 위해 지역코드와 읍면동 또는 변전소코드를 요구합니다. 응답값은 가공 계산 없이 표시하며 빈 용량을 0으로 바꾸지 않습니다. 테스트 결과는 신청서나 보고서에 저장하지 않습니다.
