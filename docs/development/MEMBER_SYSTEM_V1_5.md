# 회원 시스템 v1.5

## 목표
사이트 전체 Header의 로그인 상태 표시와 세션 처리를 공통 인증 모듈로 통일했습니다.

## 변경 파일
- common/js/auth.js
- common/js/session.js
- common/js/components/header.js
- common/js/mypage.js (신규)
- common/js/login.js
- common/js/site-config.js
- common/css/common.css
- functions/api/auth/me.js
- mypage/index.html
- login/index.html
- 공통 Header를 사용하는 전체 HTML

## 로그인 전 Header
- 로그인
- 회원가입

## 로그인 후 Header
- 회원명
- 마이페이지
- 로그아웃

## 보호 기능
- 마이페이지 직접 접근 시 로그인 확인
- 세션 만료 시 로그인 페이지로 이동
- 로그아웃 시 서버 세션 삭제와 Header 상태 갱신
- 인증 API 요청은 no-store로 캐시 방지

## 배포 후 테스트
1. 비로그인 상태 전체 페이지 Header 확인
2. 로그인 후 회원명/마이페이지/로그아웃 확인
3. 새로고침 후 로그인 상태 유지 확인
4. 마이페이지 직접 접근 차단 확인
5. 로그아웃 후 로그인/회원가입 표시 확인
