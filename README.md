# 태양광도사 웹사이트

Cloudflare Pages와 GitHub 연동 배포를 위한 정리본입니다.

## 폴더 구조

- `index.html` : 메인 페이지
- `start.html` : 발전사업 시작하기
- `precheck-apply.html` : 사전검토 신청
- `precheck-result.html` : 검토결과 확인
- `precheck-service.html` : 가능서비스 확인
- `bajun.html` : 발전사업허가 서비스
- `structure_review_sample_view.html` : 구조검토 샘플 뷰어
- `field_inspection_sample_view.html` : 현장실사 샘플 뷰어
- `assets/css/` : 페이지별 스타일
- `assets/js/` : 페이지별 스크립트
- `assets/images/` : 로고 및 결과물 샘플 이미지

## GitHub 업로드

1. 새 GitHub 저장소를 만듭니다.
2. 이 폴더의 파일 전체를 저장소 최상위에 업로드합니다.
3. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git
4. 저장소를 선택합니다.
5. Framework preset은 `None`, Build command는 비워두고, Build output directory는 `/`로 설정합니다.
6. 배포 후 GitHub에 파일을 수정하거나 업로드하면 Cloudflare Pages가 자동으로 재배포합니다.

## 주의사항

- 파일명은 영문으로 유지합니다.
- 이미지와 HTML의 상대경로를 변경하지 않습니다.
- `index0.html`, `taedo1_start11.html`, `teadostart_page.html` 같은 구버전 파일은 제외했습니다.
