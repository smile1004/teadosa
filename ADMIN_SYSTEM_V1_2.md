# Admin System v1.2

## 주요 변경
- 회원관리 목록에 상세보기 버튼 추가
- `/admin/members/detail/?id=회원번호` 회원 상세 페이지 추가
- 관리자 회원상세 API 추가
- 개인회원·기업회원 정보 구분 표시
- 주소·기업정보·가입일·수정일·활성 세션 수 표시
- 기업회원 승인·승인취소 유지

## 변경 파일
- admin/members/index.html
- admin/members/detail/index.html
- admin/css/style.css
- common/js/auth.js
- common/js/admin-members.js
- common/js/admin-member-detail.js
- functions/api/admin/members/[id]/index.js
