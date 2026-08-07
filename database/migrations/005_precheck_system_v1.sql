-- 태도사 사전검토 관리 시스템 v1.0
-- 2026-08-07 운영 D1(teadosa-members)에 실제 적용된 STEP1 기준 스키마입니다.
-- 기존 members / sessions 테이블은 변경하지 않습니다.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS precheck_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_no TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL,

  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company_name TEXT,

  site_type TEXT,
  purpose TEXT,

  postcode TEXT,
  site_address TEXT NOT NULL,
  site_address_detail TEXT,

  request_note TEXT,

  status TEXT NOT NULL DEFAULT 'received'
    CHECK (
      status IN (
        'received',
        'reviewing',
        'supplement_required',
        'completed'
      )
    ),

  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (member_id)
    REFERENCES members(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_precheck_requests_member_id
ON precheck_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_precheck_requests_status
ON precheck_requests(status);

CREATE INDEX IF NOT EXISTS idx_precheck_requests_submitted_at
ON precheck_requests(submitted_at);

CREATE TABLE IF NOT EXISTS precheck_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL UNIQUE,

  installation_possible TEXT NOT NULL DEFAULT 'undetermined'
    CHECK (
      installation_possible IN (
        'undetermined',
        'possible',
        'conditional',
        'not_possible'
      )
    ),

  expected_capacity REAL,

  shading_review TEXT,
  structure_review TEXT,
  grid_review TEXT,
  ordinance_review TEXT,

  expected_generation REAL,
  expected_cost INTEGER,

  overall_opinion TEXT,
  customer_notice TEXT,

  internal_memo TEXT,

  reviewed_by INTEGER,
  reviewed_at TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (request_id)
    REFERENCES precheck_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (reviewed_by)
    REFERENCES members(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_precheck_reviews_reviewed_by
ON precheck_reviews(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_precheck_reviews_published_at
ON precheck_reviews(published_at);
