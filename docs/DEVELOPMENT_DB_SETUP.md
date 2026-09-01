# 개발행위허가 DB 적용 순서

1. Cloudflare 대시보드에서 `D1 Database` → `teadosa-members` → `Console`로 이동합니다.
2. `database/migrations/014_development_permit_system_v1.sql` 파일을 열고 SQL 내용 전체를 복사합니다.
3. D1 Console의 빈 입력칸에 SQL 내용을 붙여넣고 `Execute`를 누릅니다.
4. `This query successfully executed.`가 표시되는지 확인합니다.
5. 수정된 전체 프로젝트를 GitHub에 반영하고 Cloudflare Pages 배포를 완료합니다.
6. 회원으로 개발행위허가를 신청한 뒤 관리자 `/admin/development/`와 마이페이지에서 내역을 확인합니다.

주의: D1 Console에는 SQL 파일 경로가 아니라 SQL 파일 안의 내용을 붙여넣어야 합니다.
