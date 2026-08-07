# 회원 시스템 v1.4

## 수정 목적
마이페이지 헤더 메뉴의 글꼴, 메뉴 폭, 간격 및 위치를 다른 페이지와 동일하게 통일했습니다.

## 원인
마이페이지 전용 CSS에 다른 페이지에서 사용하는 body margin 초기화와 공통 한글 폰트 설정이 누락되어, 메뉴 텍스트 폭과 전체 정렬이 달라졌습니다.

## 변경 파일
- mypage/index.html
- mypage/css/style.css

## 적용 내용
- body 기본 margin/padding 제거
- Pretendard, Noto Sans KR, Malgun Gothic 공통 폰트 적용
- 불필요한 마이페이지 body 전용 클래스 제거
- 공통 헤더 CSS/JS 캐시 버전 v1.4 적용
- 기존 드롭다운 z-index 보정 유지
