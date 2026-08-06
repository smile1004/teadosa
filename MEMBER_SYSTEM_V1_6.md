# 태도사 회원 시스템 v1.6

## 목표
관리자·마이페이지 기능 확장 전에 프런트엔드 인증 기반을 공통 모듈로 정리한다.

## 신규 파일
- `common/js/api.js`: fetch, JSON 변환, 네트워크 오류 공통 처리
- `common/js/validation.js`: 아이디, 이메일, 비밀번호, 사업자번호 검증 공통 처리

## 수정 파일
- `common/js/auth.js`
- `common/js/signup.js`
- `common/js/login.js`
- 공통 인증 스크립트를 사용하는 HTML 전체

## 변경 원칙
- API 호출은 `TaeDoSAApi.request()`를 사용한다.
- 인증 상태와 회원 기능은 `TaeDoSAAuth`를 사용한다.
- 화면 입력 검증은 `TaeDoSAValidation`을 사용한다.
- 화면 디자인, D1 테이블, API URL은 변경하지 않는다.

## 배포 후 회귀 테스트
1. 개인회원 아이디·이메일 중복확인
2. 개인회원 가입
3. 기업회원 사업자번호 중복확인 및 가입
4. 로그인과 로그인 유지
5. 전체 Header 회원명 표시
6. 로그아웃
7. 비로그인 마이페이지 접근 차단
