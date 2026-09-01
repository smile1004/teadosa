# 한전PPA DB 적용 순서

## 1. D1 테이블 생성

Cloudflare 대시보드에서 `D1 Database` → `teadosa-members` → `Console`로 이동합니다.

`database/migrations/013_ppa_application_system_v1.sql` 파일을 메모장이나 코드 편집기로 열고, 파일 안의 SQL 문장 전체를 복사합니다.

주의: 콘솔에 파일 경로를 입력하는 것이 아니라 파일 안의 SQL 내용을 붙여넣어야 합니다.

SQL 내용을 붙여넣은 뒤 `Execute`를 누릅니다. `This query successfully executed.`가 표시되면 완료입니다.

## 2. 프로젝트 배포

마이그레이션 적용 후 이 프로젝트 전체를 GitHub 저장소에 반영하고 Cloudflare Pages 배포를 완료합니다.

## 3. 동작 확인

1. 일반 회원 계정으로 로그인합니다.
2. `/start/ppa/apply/`에서 신청서를 작성해 제출합니다.
3. 완료 메시지와 `PPA-날짜-번호` 형식의 신청번호가 표시되는지 확인합니다.
4. 관리자 페이지 `/admin/ppa/`에서 신청목록이 보이는지 확인합니다.
5. 상세관리에서 상태와 고객 안내를 저장합니다.
6. 해당 회원의 마이페이지에서 한전PPA 신청내역과 진행이력이 표시되는지 확인합니다.
