-- 태도사 사전검토 검토결과 V2
-- 운영 D1에 result_version/result_data가 이미 수동 추가된 경우 재실행하지 마세요.
-- 신규/다른 환경에서만 1회 적용:
ALTER TABLE precheck_reviews ADD COLUMN result_version TEXT;
ALTER TABLE precheck_reviews ADD COLUMN result_data TEXT;
