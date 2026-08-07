-- 태도사 회원 + 사전검토 시스템 v1.0 신규 데이터베이스 생성용
-- 주의: 기존 members/sessions 테이블이 있는 운영 DB에는 실행하지 마세요.
-- 운영 DB 업데이트는 database/migrations 폴더의 마이그레이션 파일을 순서대로 사용하세요.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_type TEXT NOT NULL CHECK (member_type IN ('personal', 'business')),
  username TEXT NOT NULL COLLATE NOCASE,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT,
  business_number TEXT,
  postal_code TEXT,
  address TEXT,
  address_detail TEXT,
  ceo_name TEXT,
  business_type TEXT,
  business_item TEXT,
  department TEXT,
  office_phone TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('approved', 'pending', 'rejected', 'suspended')),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    member_type = 'personal'
    OR (
      member_type = 'business'
      AND company_name IS NOT NULL
      AND business_number IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_username_unique ON members(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique ON members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_business_number_unique
  ON members(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_member_type ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_approval_status ON members(approval_status);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash_unique ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_member_id ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

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
