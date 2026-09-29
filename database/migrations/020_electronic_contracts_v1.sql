-- 모두싸인 전자계약 v1
-- 개별 서비스 신청 건(발전사업허가·개발행위허가·한전PPA·공사계획신고)마다 관리자가 전자계약을 요청하고,
-- 회원이 마이페이지에서 서명합니다. 모두싸인 문서 1건 = 행 1개.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS service_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL CHECK (service_type IN ('license','development','ppa','construction-plan')),
  request_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  modusign_document_id TEXT NOT NULL UNIQUE,
  modusign_participant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','completed','rejected','canceled','failed'
  )),
  last_event TEXT,
  requested_by INTEGER,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_contracts_request ON service_contracts(service_type, request_id);
CREATE INDEX IF NOT EXISTS idx_service_contracts_member ON service_contracts(member_id);
