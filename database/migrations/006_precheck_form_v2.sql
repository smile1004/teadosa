-- 태도사 사전검토 신청서 V2 확장
-- 기존 운영 컬럼은 유지하고 변경 가능한 신청서 전체 내용은 JSON으로 보관합니다.
-- Cloudflare D1 teadosa-members 에 1회 적용합니다.

ALTER TABLE precheck_requests ADD COLUMN form_version TEXT;
ALTER TABLE precheck_requests ADD COLUMN form_data TEXT;

CREATE INDEX IF NOT EXISTS idx_precheck_requests_form_version
ON precheck_requests(form_version);
