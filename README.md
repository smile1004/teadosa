# 태양광도사 홈페이지

태양광도사 홈페이지의 운영용 정적 웹 프로젝트입니다.

## 개발 및 배포 환경

- 편집: VS Code
- 로컬 확인: Live Server
- 버전 관리: GitHub Desktop
- 저장소: `smile1004/teadosa`
- 배포: Cloudflare Pages
- 운영 주소: `https://teadosa.pages.dev/`

## 확정된 관리 원칙

- Header, Footer, Navigation, 공통 주소와 공통 UI는 `common/`에서 관리합니다.
- Hero와 페이지 본문은 해당 메뉴의 `index.html`에서 직접 관리합니다.
- 페이지 전용 CSS와 JavaScript는 해당 페이지 폴더에서 관리합니다.
- 작동 중인 정적 HTML 구조를 유지하며 별도의 빌드 도구는 사용하지 않습니다.
- 수정 순서는 `VS Code → Live Server → Commit → Push → Cloudflare 확인`입니다.

## 주요 수정 위치

- 상단 메뉴: `common/js/components/header.js`
- 하단 영역: `common/js/components/footer.js`
- 공통 메뉴 주소: `common/js/site-config.js`
- 공통 Floating UI: `common/js/components/floating.js`
- 공통 UI 동작: `common/js/components/common.js`
- 메인 Hero: `index.html`
- 사전검토 Hero: `precheck/index.html`
- 발전사업 시작하기 Hero: `start/index.html`
- 사이트맵 Hero: `sitemap/index.html`

세부 운영 규칙은 `MASTER_GUIDE.md`를 확인합니다.
