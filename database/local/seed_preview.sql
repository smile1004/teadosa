PRAGMA foreign_keys = ON;

INSERT OR REPLACE INTO members (
  id, member_type, username, email, password_hash, name, phone,
  approval_status, role, created_at, updated_at
) VALUES (
  1, 'personal', 'teadosa01', 'preview@teadosa.local',
  '$2b$12$KaoFaQarLyfZ1R2qXwMj8udv8tw2bi99/NMQy0rhB4DBAAEHwBJJy',
  '태도사 테스트', '010-0000-0000', 'approved', 'member',
  datetime('now'), datetime('now')
);

INSERT OR REPLACE INTO precheck_requests (
  id, request_no, member_id, applicant_name, phone, email,
  site_type, purpose, postcode, site_address, site_address_detail,
  request_note, form_version, form_data, status, submitted_at, updated_at
) VALUES (
  1, 'PREVIEW-20260904-001', 1, '태도사 테스트', '010-0000-0000', 'preview@teadosa.local',
  'building', 'power_business', '04524', '서울특별시 중구 세종대로 110', '',
  '로컬 지도 미리보기용 신청입니다.', 'PRECHECK_FORM_V2',
  '{"siteType":"building","purpose":"power_business"}',
  'completed', datetime('now'), datetime('now')
);

INSERT OR REPLACE INTO precheck_reviews (
  id, request_id, installation_possible, expected_capacity,
  overall_opinion, customer_notice, internal_memo,
  result_version, result_data, reviewed_at, published_at, updated_at
) VALUES (
  1, 1, 'conditional', 99.9,
  '현장 여건과 계통연계 조건을 추가로 확인한 뒤 사업 진행 여부를 확정할 수 있습니다.',
  '본 결과는 로컬 지도 화면 확인을 위한 테스트 데이터입니다.', '',
  'PRECHECK_RESULT_V2',
  '{"items":[{"title":"입지 조건","status":"ok","content":"신청 주소를 기준으로 위치를 확인했습니다."},{"title":"계통연계","status":"conditional","content":"한전 계통연계 가능 여부를 추가 확인해야 합니다."}]}',
  datetime('now'), datetime('now'), datetime('now')
);
