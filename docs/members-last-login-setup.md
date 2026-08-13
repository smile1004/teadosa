# 최종 로그인 일시 DB 설정

배포 후 Cloudflare의 `teadosa-members` D1 Database → Console에서 `database/migrations/011_members_last_login_v1.sql` 파일 안의 SQL 문을 복사하여 한 번 실행합니다.

파일 경로를 Console에 입력하지 말고 아래 SQL 문 자체를 붙여넣습니다.

```sql
ALTER TABLE members ADD COLUMN last_login_at TEXT;
```

이 SQL은 한 번만 실행해야 합니다. 이후 회원이 로그인할 때마다 최종 로그인 일시가 자동 저장됩니다. 아직 새 시스템에서 로그인하지 않은 기존 회원은 관리자 상세에 `로그인 기록 없음`으로 표시됩니다.
