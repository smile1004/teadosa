# 마이페이지 사전검토 신청내역

API
- GET /api/precheck/my-requests
- 로그인 회원 본인의 신청만 반환

마이페이지
- 신청번호
- 설치주소
- 신청일
- 사업지 유형
- 처리상태
- 공개 결과가 있으면 종합판정
- 결과 공개 완료 건만 결과확인 버튼 활성화

결과 링크
- /precheck/result/?id={request_id}

D1 스키마 변경 없음.
