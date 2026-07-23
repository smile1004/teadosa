# 태도사 홈페이지 Master v1.0

## 공통 영역 수정

- 상단 메뉴 구조와 문구: `common/js/components/header.js`
- 하단 영역 구조와 문구: `common/js/components/footer.js`
- 공통 메뉴 주소: `common/js/site-config.js`
- 공통 메뉴 스타일: `common/css/shared-menu.css`
- 공통 레이아웃 스타일: `common/css/shared-layout.css`

## 메뉴 주소 변경 방법

`common/js/site-config.js`의 `routes` 값만 수정하면 Header와 Footer에 동시에 반영됩니다.

예시:

```js
precheckApply: 'precheck/apply/index.html'
```

## 로컬 미리보기

압축 해제 후 최상위 `index.html`을 엽니다. 각 폴더 자체가 아니라 폴더 안의 `index.html`을 열어야 합니다.

## 중요 원칙

외부 HTML 조각을 `fetch()`로 불러오는 방식은 Windows에서 파일을 더블클릭해 실행할 때 브라우저 보안 정책으로 차단될 수 있습니다. 따라서 공통 Header와 Footer는 JS 컴포넌트 방식으로 유지합니다.
