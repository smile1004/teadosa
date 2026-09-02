-- 공사계획신고 신청·관리·마이페이지 연동 v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS construction_plan_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_no TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL,
  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  business_reg_number TEXT,
  site_address TEXT NOT NULL,
  capacity_type TEXT NOT NULL CHECK (capacity_type IN ('under10mw','over10mw','unknown')),
  user_type TEXT NOT NULL CHECK (user_type IN ('existing','new')),
  form_version TEXT NOT NULL DEFAULT 'CONSTRUCTION_PLAN_APPLY_V1',
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
  FOREIGN KEY (status_updated_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_construction_plan_member ON construction_plan_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_construction_plan_status ON construction_plan_requests(status);
CREATE INDEX IF NOT EXISTS idx_construction_plan_submitted ON construction_plan_requests(submitted_at);

CREATE TABLE IF NOT EXISTS construction_plan_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  customer_notice TEXT,
  changed_by INTEGER,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES construction_plan_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_construction_plan_history ON construction_plan_status_history(request_id, changed_at);
