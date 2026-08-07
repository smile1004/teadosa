# 태양광도사 홈페이지 Master Guide v2.0

## 1. 프로젝트 구조 원칙

태양광도사 홈페이지는 Cloudflare Pages에서 운영하는 정적 HTML 프로젝트입니다.
유지보수 편의성과 배포 안정성을 위해 별도의 빌드 과정 없이 HTML, CSS, JavaScript 파일을 직접 관리합니다.

### 공통 관리

- Header: `common/js/components/header.js`
- Footer: `common/js/components/footer.js`
- 메뉴 및 외부 채널 주소: `common/js/site-config.js`
- Floating UI: `common/js/components/floating.js`
- 공통 UI 동작: `common/js/components/common.js`
- 공통 CSS: `common/css/`
- 공통 이미지: `common/images/`

### 페이지별 관리

- Hero
- 페이지별 본문
- 페이지 전용 CSS
- 페이지 전용 JavaScript
- 페이지 전용 이미지 및 영상

공통화 때문에 수정 위치가 오히려 불분명해지는 요소는 페이지 폴더에서 관리합니다.

## 2. Hero 수정 위치

Hero는 공통 JavaScript로 삽입하지 않습니다.
각 메뉴 페이지의 `index.html`에서 직접 수정합니다.

- 메인페이지: `index.html`
- 사전검토: `precheck/index.html`
- 발전사업 시작하기: `start/index.html`
- 사이트맵: `sitemap/index.html`

Hero 수정 시 제목, 설명, 배지, 버튼, 링크와 PC·태블릿·모바일 화면을 함께 확인합니다.

## 3. 메뉴 주소 변경

페이지 주소는 `common/js/site-config.js`의 `routes`에서 관리합니다.
Header와 Footer는 이 설정을 함께 사용합니다.

```js
precheckApply: 'precheck/apply/index.html'
```

메뉴 구조나 표시 문구를 바꿀 때는 `header.js`와 `footer.js`를 수정하고,
이동 주소만 바꿀 때는 `site-config.js`를 먼저 확인합니다.

## 4. CSS 관리

### 공통 CSS

- `common/css/shared-menu.css`: Header와 Navigation
- `common/css/shared-layout.css`: Footer와 공통 레이아웃
- `common/css/common.css`: 공통 UI와 기본 스타일
- `common/css/service-steps.css`: 여러 서비스 페이지가 함께 쓰는 단계형 UI
- `common/css/taedo1_start.css`: 서비스 페이지 공통 디자인 기반

### 페이지 CSS

- 메인: `home/css/style.css`
- 사전검토: `precheck/css/style.css`
- 발전사업 시작하기: `start/css/style.css`
- 사이트맵: `sitemap/css/style.css`
- 사전검토 하위 페이지: 각 하위 폴더의 `css/style.css`

한 페이지에서만 사용하는 스타일은 공통 CSS에 넣지 않습니다.

## 5. JavaScript 관리

여러 페이지에서 같은 기능을 사용할 때만 `common/js/`에 둡니다.
특정 페이지 전용 기능은 해당 페이지 폴더의 `js/`에서 관리합니다.

사용하지 않는 파일과 코드는 남겨두지 않습니다.
HTML 안에 긴 JavaScript를 새로 작성하기보다 페이지 전용 JS 파일을 사용합니다.

## 6. 이미지와 영상 관리

- 공통 이미지: `common/images/`
- 메인 이미지: `home/images/`
- 메인 영상: `home/videos/`
- 하위 페이지 전용 이미지: 해당 페이지의 `images/`

파일명은 영문 소문자와 하이픈을 사용하고 공백, `최종`, `수정본`, `복사본` 같은 이름은 사용하지 않습니다.

## 7. 로컬 확인

VS Code에서 프로젝트 루트 폴더를 연 뒤 루트 `index.html`을 Live Server로 실행합니다.

- 메인: `/`
- 사전검토: `/precheck/`
- 발전사업 시작하기: `/start/`
- 사이트맵: `/sitemap/`

각 HTML에는 프로젝트 루트를 가리키는 `<base>`가 설정되어 있으므로 임의로 삭제하지 않습니다.

## 8. GitHub Desktop 작업 순서

1. VS Code에서 수정
2. `Ctrl + S`로 저장
3. Live Server에서 PC와 모바일 화면 확인
4. GitHub Desktop의 Changes에서 변경 파일 검토
5. 작업 내용을 알 수 있는 제목으로 Commit
6. Push origin
7. Cloudflare Pages 배포 후 운영 주소 확인

### Commit 예시

- `페이지별 Hero 구조로 정리`
- `공통 Header 메뉴 링크 수정`
- `사전검토 모바일 레이아웃 개선`
- `사이트맵 SEO 정보 보완`

`수정`, `최종`, `업데이트`처럼 작업 내용을 알 수 없는 제목은 사용하지 않습니다.

## 9. 수정 전 확인 사항

- 다른 페이지에도 영향을 주는 공통 파일인지 확인
- 기존 링크와 버튼 기능 보존
- 상대경로와 `<base>` 경로 확인
- 모바일 메뉴와 Footer 확인
- 변경 파일만 Commit에 포함됐는지 확인

## 10. 중요 결정 사항

- Header와 Footer는 JS 컴포넌트 방식으로 공통 관리합니다.
- 외부 HTML 조각을 `fetch()`로 불러오는 방식은 사용하지 않습니다.
- Hero는 각 메뉴의 `index.html`에서 직접 관리합니다.
- 프로젝트 구조가 안정된 이후에는 작은 수정부터 VS Code에서 직접 진행합니다.
