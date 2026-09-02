# 한전PPA 접수 DB / 관리자 연동 설정 가이드

이 문서는 한전PPA 접수 서비스(`start/ppa/apply/`)가 실제로 신청 데이터를 저장하고,
관리자 화면(`/admin/ppa/`)에서 확인·처리할 수 있도록 만드는 설정 절차입니다.

발전사업허가·개발행위허가와 동일하게 **텍스트 기반 신청서**이며, 별도의 파일 저장소(R2) 설정은 필요하지 않습니다.
(첨부서류는 신청 단계에서는 목록으로만 안내하고, 실제 제출은 담당자 상담 이후 진행하는 방식입니다.)

---

## 준비물 체크리스트

- [ ] 1단계: D1 데이터베이스에 테이블 생성 (마이그레이션 SQL 실행)
- [ ] 2단계: 코드 배포 (GitHub 반영 → Cloudflare Pages 자동 배포)
- [ ] 3단계: 실제 신청 테스트
- [ ] 4단계: 관리자 화면에서 확인

---

## 1단계. D1 데이터베이스에 테이블 생성

1. [Cloudflare 대시보드](https://dash.cloudflare.com)에 로그인합니다.
2. 좌측 메뉴에서 `Workers & Pages` → `D1 SQL Database`로 이동합니다.
3. 이 프로젝트가 사용 중인 데이터베이스(예: `teadosa-members`)를 클릭합니다.
4. 상단 탭에서 `Console`을 클릭합니다.
5. 프로젝트 파일 중 `database/migrations/015_ppa_reception_system_v1.sql` 파일을 텍스트 에디터로 엽니다.
6. 파일 **내용 전체**를 복사합니다. (파일 경로가 아니라 SQL 코드 내용을 복사해야 합니다)
7. D1 Console의 입력창에 붙여넣고 `Execute`(실행) 버튼을 클릭합니다.
8. 화면에 `This query successfully executed.` 또는 이와 유사한 성공 메시지가 표시되는지 확인합니다.
9. 좌측 `Tables` 목록에 아래 2개 테이블이 새로 생겼는지 확인합니다.
   - `ppa_requests` (신청 정보)
   - `ppa_status_history` (처리상태 변경 이력)

> ⚠️ 이미 실행한 적이 있는 SQL을 다시 실행해도 `CREATE TABLE IF NOT EXISTS` 구문 덕분에 에러 없이 넘어갑니다.

---

## 2단계. 코드 배포

1. 수정된 전체 프로젝트 파일을 GitHub 저장소(`smile1004/teadosa`)에 반영(push)합니다.
2. Cloudflare Pages가 자동으로 새 배포를 시작합니다. (`Workers & Pages` → 프로젝트 → `Deployments` 탭에서 진행 상황 확인 가능)
3. 배포가 `Success`로 완료되는지 확인합니다.

---

## 3단계. 실제 신청 테스트

1. 배포된 사이트에서 회원으로 로그인합니다.
2. `한전PPA 접수 신청하기` 페이지(`/start/ppa/apply/`)로 이동합니다.
3. 필수 항목을 입력합니다.
   - 신청인 구분(개인/법인) — 법인 선택 시 사업자등록번호가 필수로 바뀝니다.
   - 신청인 기본정보, 사업지 정보
   - 태도사 서비스 이용 구분(기존/신규) — 신규 선택 시 필요서류 안내 목록이 표시됩니다(실제 첨부는 없습니다).
   - 개인정보 동의 체크
4. `한전PPA 접수 신청하기` 버튼을 클릭합니다.
5. "OO번으로 신청이 접수되었습니다" 메시지가 뜨면 정상입니다.

---

## 4단계. 관리자 화면에서 확인

1. 관리자 계정으로 `/admin/`에 로그인합니다.
2. 좌측 메뉴의 `한전PPA 관리`를 클릭합니다. (`/admin/ppa/`)
3. 방금 접수한 신청 건이 목록에 표시되는지 확인합니다.
4. `상세관리`를 클릭하면 신청인 기본정보, 사업지 정보, 이용 구분을 확인하고 처리상태(접수/상담중/계약완료/서류준비/접수완료/보완요청/완료/취소)를 변경할 수 있습니다.
5. 신청한 회원 계정으로 마이페이지에 접속하면, 처리상태와 담당자가 남긴 고객 안내 문구를 확인할 수 있습니다.

---

## 참고: 관련 파일 목록

| 구분 | 경로 |
|---|---|
| DB 마이그레이션 | `database/migrations/015_ppa_reception_system_v1.sql` |
| 신청 접수 API | `functions/api/ppa/create.js` |
| 마이페이지 조회 API | `functions/api/ppa/my-requests.js` |
| 관리자 목록 API | `functions/api/admin/ppa/index.js` |
| 관리자 상세 API | `functions/api/admin/ppa/[id]/index.js` |
| 관리자 상태변경 API | `functions/api/admin/ppa/[id]/status.js` |
| 관리자 목록 화면 | `admin/ppa/index.html`, `common/js/admin-ppa.js` |
| 관리자 상세 화면 | `admin/ppa/detail/index.html`, `common/js/admin-ppa-detail.js` |
| 프런트 API 헬퍼 | `common/js/auth.js` (`createPpaRequest`, `getMyPpaRequests`, `getAdminPpaRequests`, `getAdminPpaDetail`, `updateAdminPpaStatus`) |
| 신청서 제출 연동 | `start/ppa/apply/js/script.js` |
| 마이페이지 표시 | `mypage/index.html`, `common/js/mypage.js` |
