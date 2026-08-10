# PRECHECK FORM V2

## 목적
사전검토 신청서의 변경 가능 항목을 D1 컬럼에 계속 추가하지 않고 `form_version`과 `form_data(JSON)`로 관리합니다.

## 운영용 고정 컬럼
관리자 목록/검색/상태관리에 필요한 기존 컬럼(`request_no`, `member_id`, `applicant_name`, `phone`, `email`, `company_name`, `site_address`, `site_type`, `purpose`, `request_note`, `status`, 시간 컬럼)은 유지합니다.

## V2 폼 데이터
- 신청인: 이름, 연락처, 이메일, 신청일자, 설치주소
- 사업지: 유형(토지/건물/복합(토지+건물)), 용도(자가소비/발전사업/미정), 설치 예정 용량, 부지면적, 지목, 용도지역, 소유관계
- 추가 요청사항

## 배포 전 D1 적용
`database/migrations/006_precheck_form_v2.sql`을 운영 D1 `teadosa-members`에 1회 실행한 뒤 코드를 배포합니다.
