# 사전검토 관리 시스템 v1.0 - STEP2

## 완료 범위
- 로그인 회원만 `/precheck/apply/` 접근 가능
- 회원 이름/휴대전화 자동 입력
- 신청서 입력값 검증
- `/api/precheck/create` Functions 추가
- 로그인 세션에서 `member_id` 확인 후 D1 `precheck_requests` 저장
- 신청번호 `PC-YYYYMMDD-000001` 형식 생성
- 신규 신청 상태 `received` 저장
- 완료 페이지에 신청번호 및 접수정보 표시
- 개인정보는 URL Query String으로 전달하지 않음

## 보안/구조 원칙
- member_id는 브라우저 입력을 신뢰하지 않고 HttpOnly Session으로 서버에서 결정
- email/company_name도 로그인 회원 DB 정보에서 스냅샷 저장
- site_type/purpose는 서버에서 허용값으로 변환 및 검증
- 완료 화면 전달 데이터는 sessionStorage 사용
- D1이 최종 원본(Source of Truth)

## 다음 단계
STEP3: 관리자 `/admin/precheck/` 신청목록 + 검색 + 상태 표시
