# 태양광도사 홈페이지 운영 구조

## 핵심 구조
- `/index.html`: 메인페이지
- `/common/`: 모든 페이지에서 함께 사용하는 CSS, JavaScript, 이미지
- `/start/`: 발전사업 시작하기 메뉴
- `/precheck/`: 사전검토 메뉴와 서브메뉴
- `/sitemap/`: 사이트맵

## 사전검토 서브메뉴
- `/precheck/`: 사전검토 메인
- `/precheck/apply/`: 사전검토 신청
- `/precheck/result/`: 검토결과 확인
- `/precheck/service/`: 가능서비스 확인
- `/precheck/apply-result/`: 신청 완료 결과
- `/precheck/samples/`: 샘플 보기

## 수정 위치
- 상단 메뉴: `/common/js/components/header.js`
- 하단 영역: `/common/js/components/footer.js`
- 페이지별 Hero: 각 메뉴 폴더의 `index.html` 내부에서 직접 관리
- 공통 Floating: `/common/js/components/floating.js`
- 공통 스타일: `/common/css/`
- 페이지별 Hero, 본문, 스타일과 이미지: 각 메뉴 폴더 내부

## 배포
압축을 해제한 폴더의 내용 전체를 GitHub 저장소 루트에 업로드합니다. `_redirects` 파일은 기존 주소를 새 주소로 연결하므로 삭제하지 않습니다.
