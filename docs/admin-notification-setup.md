# 관리자 알림센터 DB 설정

배포 후 Cloudflare의 `teadosa-members` D1 Database → Console에 접속합니다.

`database/migrations/010_admin_notifications_v1.sql`이라는 파일 경로를 입력하는 것이 아니라, 해당 파일 안의 SQL 문 전체를 복사하여 Console 입력란에 붙여넣고 `Execute`를 누릅니다.

성공 메시지가 표시되면 설정이 완료됩니다. 한 번만 실행하면 됩니다. 같은 SQL을 다시 실행해도 `IF NOT EXISTS`가 적용되어 기존 알림을 삭제하지 않습니다.

설정 후 관리자 페이지를 새로고침하면 상단에 알림 버튼이 표시됩니다. 이후 발생하는 회원가입, 사전검토 신청, 발전사업허가 신청부터 알림으로 저장됩니다.
