-- 발전사업허가 신청·관리·마이페이지 연동 v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS generation_license_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_no TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL,
  precheck_request_id INTEGER NOT NULL,
  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  site_address TEXT NOT NULL,
  form_version TEXT NOT NULL DEFAULT 'GENERATION_LICENSE_APPLY_V2',
  form_data TEXT NOT NULL,
  privacy_consented_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received','consulting','contracted','documents','submitted',
    'supplement_required','completed','cancelled'
  )),
  customer_notice TEXT,
  internal_memo TEXT,
  status_updated_by INTEGER,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (precheck_request_id) REFERENCES precheck_requests(id) ON DELETE RESTRICT,
  FOREIGN KEY (status_updated_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_generation_license_member ON generation_license_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_generation_license_precheck ON generation_license_requests(precheck_request_id);
CREATE INDEX IF NOT EXISTS idx_generation_license_status ON generation_license_requests(status);
CREATE INDEX IF NOT EXISTS idx_generation_license_submitted ON generation_license_requests(submitted_at);

CREATE TABLE IF NOT EXISTS generation_license_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  customer_notice TEXT,
  changed_by INTEGER,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES generation_license_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_generation_license_history_request ON generation_license_status_history(request_id, changed_at);
