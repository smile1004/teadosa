# 사전검토 검토결과 저장 안전성 보정

문제:
- 신청 상태는 completed로 변경되었지만 precheck_reviews 레코드가 생성되지 않는 사례 확인

수정:
1. precheck_reviews INSERT/UPDATE 결과 success 확인
2. 신규 INSERT는 last_row_id 확인
3. 기존 UPDATE는 changes >= 1 확인
4. 저장 후 SELECT로 review_id 재검증
5. review_id 확인 후에만 precheck_requests.status 변경
6. 저장 실패 시 completed로 변경하지 않음

운영 D1 스키마 변경 없음.
