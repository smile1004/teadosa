# 사전검토 검토결과 관리 흐름

기준본:
- Projects_precheck_STEP3_v1.5_form_header_simplified(1).zip
- 사용자가 실제 배포본과 동일하다고 확인한 파일

구현:
1. 관리자 신청목록 상세보기
2. 신청서 V2 데이터 확인
3. 검토결과 항목 추가/삭제
4. 종합 판정 / 예상용량 / 종합 의견 / 고객 안내사항 / 내부메모
5. 임시저장
6. 검토완료 후 회원 공개
7. 공개 결과만 회원 `/precheck/result/`에서 확인
8. 회원은 자신의 신청 결과만 조회 가능

운영 D1:
- precheck_requests.form_version / form_data 추가 완료
- precheck_reviews.result_version / result_data 추가 완료
- 운영 D1에는 007 SQL을 다시 실행하지 않음
