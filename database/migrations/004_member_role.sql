-- 회원 관리자 권한 컬럼 추가
-- Cloudflare D1 Console에서 v2.0 코드 배포 전에 1회 실행하세요.
ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_members_role
  ON members(role);

-- 최초 관리자 지정 예시(아이디를 실제 관리자 아이디로 변경한 뒤 별도 실행)
-- UPDATE members
-- SET role = 'admin', updated_at = datetime('now')
-- WHERE username = '관리자아이디';
