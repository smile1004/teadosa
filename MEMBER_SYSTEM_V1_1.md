# 태도사 회원 시스템 v1.1

## 변경 목적
회원가입·로그인 화면에 중복되어 있던 JavaScript를 공통 모듈로 통합하고, HTML·API·D1 구조의 연결 기준을 맞췄습니다.

## 변경 파일
- common/js/auth.js 신규
- common/js/signup.js 신규
- common/js/login.js 신규
- common/js/session.js 신규
- signup/personal/index.html
- signup/business/index.html
- login/index.html
- functions/api/auth/login.js
- database/migrations/003_sessions.sql 신규

## 주요 변경
- API 요청을 `window.TaeDoSAAuth`로 통합
- 개인·기업 회원가입 로직을 `common/js/signup.js`로 통합
- 로그인 로직을 `common/js/login.js`로 분리
- 기업회원 사업자등록번호 중복확인 버튼 ID와 상태 안내 영역 추가
- 로그인 아이디 규칙을 회원가입과 동일한 6~20자로 통일
- 로그인 API가 사용하는 `sessions` 테이블 마이그레이션 기록 추가

## 배포 전 D1 확인
아래 SQL로 sessions 테이블 존재 여부를 확인합니다.

```sql
SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions';
```

결과가 없으면 `database/migrations/003_sessions.sql`을 D1 콘솔에서 실행합니다.

## 배포 후 필수 테스트
1. 개인회원 아이디 중복확인
2. 개인회원 이메일 중복확인
3. 개인회원 주소검색 및 가입
4. 기업회원 아이디·이메일·사업자번호 중복확인
5. 기업회원 주소검색 및 가입
6. 개인회원 로그인과 새로고침 후 로그인 유지
7. 로그아웃 후 세션 해제
8. 기업회원 pending 상태 로그인 차단

## v1.2 마이페이지 공통 헤더 동기화
- 마이페이지가 전체 페이지와 동일한 `common/js/components/header.js`를 사용하도록 구조를 정리했습니다.
- 전체 HTML의 공통 헤더 파일에 `v=1.2` 캐시 버전을 적용하여 페이지별 이전 헤더 캐시가 섞이지 않도록 했습니다.
- 마이페이지 전용 스타일을 `mypage/css/style.css`로 분리했습니다.
