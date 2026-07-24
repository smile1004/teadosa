# 태양광도사 홈페이지 리팩토링 결과

## 확정한 구조

- Header / Footer / Navigation / 공통 주소는 `common/`에서 관리
- Hero와 본문은 각 메뉴의 `index.html`에서 직접 관리
- 페이지 전용 CSS와 JavaScript는 해당 페이지 폴더에서 관리
- 별도의 빌드 도구 없이 Cloudflare Pages 정적 배포 구조 유지

## 이번에 반영한 내용

1. `precheck/index.html` Hero를 HTML 내부로 이동
2. `start/index.html` Hero를 HTML 내부로 이동
3. 사용하지 않는 `common/js/components/hero.js` 삭제
4. `README.md`, `MASTER_GUIDE.md`, `FOLDER_STRUCTURE.txt`, `LOCAL_PREVIEW.md`를 실제 구조와 일치하도록 정리
5. 검색엔진용 `robots.txt`, `sitemap.xml` 추가
6. `.git` 폴더를 배포 ZIP에서 제외

## 자동 점검 결과

- HTML 파일: 10개
- 누락된 CSS / JavaScript / 이미지 경로: 0개
- 깨진 내부 페이지 링크: 0개
- 중복 HTML ID: 0개
- 누락된 `title`: 0개
- 누락된 viewport 설정: 0개
- JavaScript 문법 오류: 0개
- `sitemap.xml` XML 문법 오류: 0개
- 삭제된 `hero.js` 참조: 0개

## 유지한 사항

- 기존 디자인
- 기존 Header / Footer 방식
- 기존 메뉴와 서비스 기능
- Cloudflare Pages `_headers`, `_redirects`
- 각 하위 페이지의 현재 경로
