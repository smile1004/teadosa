# 태도사 회원 시스템 v1.0 적용 순서

## 1. 기존 운영 DB 확인
Cloudflare D1 Console에서 실행:

```sql
PRAGMA table_info(members);
```

다음 컬럼이 모두 있어야 합니다.

- postal_code
- address
- address_detail
- ceo_name
- business_type
- business_item
- department
- office_phone
- updated_at

누락된 프로필 컬럼은 `database/migrations/002_member_profile_fields.sql`을 참고해 한 줄씩 실행합니다.
`updated_at`은 기존 회원 시스템 구축 과정에서 이미 추가된 컬럼이므로 중복 추가하지 않습니다.

## 2. 코드 배포
GitHub Desktop에서 전체 변경사항을 확인하고 관계없는 PSD 파일은 제외한 뒤 커밋·푸시합니다.

권장 커밋 메시지:

`회원 시스템 v1.0 스키마 및 가입 검증 통합`

## 3. 배포 후 테스트
- `/signup/personal/`
- `/signup/business/`
- `/login/`
- `/mypage/`

기업회원 가입 전 반드시 아이디와 사업자등록번호 중복확인을 완료해야 합니다.
