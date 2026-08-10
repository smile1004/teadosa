# PRECHECK SYSTEM v1 STEP3

관리자 사전검토 관리목록 단계.

구현 범위:
- /admin/precheck/ 신청목록
- 신청번호/신청자/연락처/회사명/설치주소 검색
- 처리상태 필터
- 처리상태 변경(received/reviewing/supplement_required/completed)
- 상세보기 /admin/precheck/detail/?id=... 진입 경로
- 기존 관리자 인증(requireAdmin) 재사용

설계 원칙:
- 신청서 V2 세부항목과 관리자 목록을 분리
- 신청서/검토결과 항목 변경 예정이므로 STEP3에서 D1 스키마 변경 없음
- STEP4에서 신청서 V2 상세 표시 및 유연한 form_version/form_data 구조 전환 검토
