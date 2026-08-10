-- 사전검토 보완요청 관리
-- 운영 D1(teadosa-members)에 1회 적용

ALTER TABLE precheck_requests ADD COLUMN supplement_note TEXT;
ALTER TABLE precheck_requests ADD COLUMN supplement_requested_at TEXT;
ALTER TABLE precheck_requests ADD COLUMN supplement_requested_by INTEGER;
