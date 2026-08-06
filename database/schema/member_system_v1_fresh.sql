-- 태도사 회원 시스템 v1.0 신규 데이터베이스 생성용
-- 주의: 기존 members/sessions 테이블이 있는 운영 DB에는 실행하지 마세요.

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
