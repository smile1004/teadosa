-- 태도사 사전검토 관리 시스템 v1.0
-- 운영 D1(teadosa-members)에 1회 실행하는 마이그레이션입니다.
-- 기존 members / sessions 테이블은 변경하지 않습니다.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS precheck_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_no TEXT NOT NULL,
  member_id INTEGER NOT NULL,

  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_email TEXT,
  company_name TEXT,

  site_address TEXT NOT NULL,
  site_type TEXT NOT NULL CHECK (site_type IN ('land', 'building')),
  purpose TEXT NOT NULL CHECK (purpose IN ('self_consumption', 'power_business')),
  request_note TEXT,

  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewing', 'supplement_required', 'completed')),

  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_precheck_requests_request_no_unique
  ON precheck_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_precheck_requests_member_id
  ON precheck_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_precheck_requests_status
  ON precheck_requests(status);
CREATE INDEX IF NOT EXISTS idx_precheck_requests_submitted_at
  ON precheck_requests(submitted_at);

CREATE TABLE IF NOT EXISTS precheck_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,

  installation_possible TEXT NOT NULL DEFAULT 'undetermined'
    CHECK (installation_possible IN ('undetermined', 'possible', 'conditional', 'not_possible')),
  expected_capacity_kw REAL,

  shading_review TEXT,
  structure_review TEXT,
  grid_review TEXT,
  ordinance_review TEXT,

  expected_annual_generation_kwh REAL,
  expected_project_cost_krw INTEGER,

  overall_opinion TEXT,
  customer_notice TEXT,
  internal_memo TEXT,

  reviewed_by INTEGER,
  reviewed_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (request_id) REFERENCES precheck_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES members(id) ON DELETE SET NULL,

  CHECK (expected_capacity_kw IS NULL OR expected_capacity_kw >= 0),
  CHECK (expected_annual_generation_kwh IS NULL OR expected_annual_generation_kwh >= 0),
  CHECK (expected_project_cost_krw IS NULL OR expected_project_cost_krw >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_precheck_reviews_request_id_unique
  ON precheck_reviews(request_id);
CREATE INDEX IF NOT EXISTS idx_precheck_reviews_reviewed_by
  ON precheck_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_precheck_reviews_published_at
  ON precheck_reviews(published_at);
