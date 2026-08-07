# 로컬 미리보기 안내

## 권장 방법

1. VS Code에서 태양광도사 프로젝트 루트 폴더를 엽니다.
2. 루트 `index.html`을 선택합니다.
3. 우측 하단 `Go Live` 또는 `Open with Live Server`를 실행합니다.
4. 브라우저에서 각 주소를 확인합니다.

```text
/
/precheck/
/start/
/sitemap/
```

각 HTML에는 프로젝트 루트를 기준으로 하는 `<base>` 경로가 설정되어 있습니다.
이 태그를 삭제하거나 임의로 변경하면 CSS, JavaScript, 이미지와 메뉴 링크가 깨질 수 있습니다.

Windows 탐색기에서 HTML을 직접 더블클릭하는 방식보다 Live Server 사용을 권장합니다.
