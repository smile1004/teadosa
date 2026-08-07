# 회원 시스템 v2.0 — 관리자 최소 운영 버전

## 추가 기능
- 회원 `role` 권한 분리 (`member`, `admin`)
- 관리자 전용 `/admin/` 페이지
- 회원 검색 및 유형·승인상태 필터
- 기업회원 승인 및 승인취소
- 승인취소 시 해당 기업회원의 기존 세션 종료
- 관리자 API 서버 권한 검증
- 공통 Header에 관리자 계정 전용 `관리자` 링크 표시

## 배포 전 D1 필수 작업
`database/migrations/004_member_role.sql`을 D1 Console에서 1회 실행합니다.

그다음 실제 관리자 계정 아이디로 아래 SQL을 실행합니다.

```sql
UPDATE members
SET role = 'admin', updated_at = datetime('now')
WHERE username = '실제관리자아이디';
```

확인:

```sql
SELECT id, username, name, member_type, approval_status, role
FROM members
ORDER BY id;
```

관리자 계정은 `approval_status='approved'`, `role='admin'`이어야 합니다.

## 변경 파일
- `database/migrations/004_member_role.sql`
- `functions/_lib/admin-auth.js`
- `functions/api/admin/members.js`
- `functions/api/admin/members/[id]/approval.js`
- `functions/api/auth/login.js`
- `functions/api/auth/me.js`
- `common/js/auth.js`
- `common/js/admin.js`
- `common/js/components/header.js`
- `admin/index.html`
- `admin/css/style.css`

## 테스트
1. 관리자 계정 로그인
2. Header의 `관리자` 링크 확인
3. `/admin/` 회원목록 확인
4. 기업회원 승인
5. 승인된 기업회원 로그인 확인
6. 승인취소 후 해당 기업회원 세션 종료 확인
7. 일반회원으로 `/admin/` 접근 시 차단 확인
