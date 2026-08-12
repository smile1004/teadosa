# 발전사업허가 DB 연동 적용

## 1. 운영 D1 마이그레이션

Cloudflare D1 콘솔에서 `database/migrations/009_generation_license_system_v1.sql`을 한 번 실행합니다.

Wrangler를 사용하는 경우:

```bash
npx wrangler d1 execute teadosa-members --remote --file=database/migrations/009_generation_license_system_v1.sql
```

마이그레이션을 먼저 적용하지 않으면 신청 API에서 테이블 없음 오류가 발생합니다.

## 2. 연동 경로

- 신청 저장: `POST /api/license/create`
- 회원 신청내역: `GET /api/license/my-requests`
- 관리자 목록: `GET /api/admin/license`
- 관리자 상세: `GET /api/admin/license/:id`
- 관리자 상태 저장: `PUT /api/admin/license/:id/status`
- 관리자 화면: `/admin/license/`
- 회원 진행현황: `/mypage/?section=license`

## 3. 진행상태

`접수 → 상담중 → 계약완료 → 서류준비 → 허가접수 → 보완요청 → 허가완료`

관리자는 필요할 때 `취소`로 변경할 수 있습니다. 고객 안내는 마이페이지에 표시되고 내부 메모는 관리자에게만 표시됩니다.
