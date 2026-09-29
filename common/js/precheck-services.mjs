// Service catalog shared by the admin review form, the review API and the member service page.
// Keys are stored in precheck_reviews.result_data.serviceSelection, so never rename an existing key.
export const SERVICE_CATALOG = {
  license: { name: '발전사업허가', min: 500000, max: 800000, href: '/start/license/apply/' },
  development_land: { name: '개발행위허가', note: '토목설계 포함', min: 4000000, max: 5000000, href: '/start/development/apply/' },
  development_building_drawing: { name: '개발행위허가', note: '건축물 상부, 도면 있는 경우', min: 1500000, max: 2000000, href: '/start/development/apply/' },
  development_building_survey: { name: '개발행위허가', note: '건축물 상부, 도면 없는 경우 / 실측 포함', min: 3000000, max: 4000000, href: '/start/development/apply/' },
  business_registration: { name: '사업자등록증 신청', note: '세무서 신고', min: 150000, max: 200000 },
  ppa: { name: '한전 PPA 접수', min: 300000, max: 500000, href: '/start/ppa/apply/' },
  construction_plan: { name: '공사계획신고', note: '전기감리 포함', min: 1500000, max: 1700000, href: '/start/construction-plan/apply/' },
  pre_use_inspection: { name: '사용전검사 신청', note: '한국전기안전공사', min: 200000, max: 300000 },
  business_start: { name: '사업개시신고', note: '발전사업 개시 신고', min: 150000, max: 200000 },
  energy_agency: { name: '에너지관리공단 설비신청', note: 'RPS 설비확인 신청', min: 300000, max: 400000 },
  long_term_contract: { name: '장기계약 신청', note: '20년 고정가격계약 입찰 대행', min: 500000, max: 700000 }
};

export const SERVICE_TYPES = {
  land: {
    label: '토지형',
    services: ['license', 'development_land', 'business_registration', 'ppa', 'construction_plan', 'pre_use_inspection', 'business_start', 'energy_agency', 'long_term_contract'],
    packages: [
      { name: 'BASIC 기본형', codes: ['A-1', 'A-2', 'A-3'], price: '4,185,000 ~ 5,400,000원' },
      { name: 'STANDARD 완료형', codes: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6'], price: '5,984,000 ~ 7,656,000원' },
      { name: 'PREMIUM 프리미엄형', codes: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9'], price: '6,460,000 ~ 8,330,000원' }
    ]
  },
  building: {
    label: '건물형',
    services: ['license', 'development_building_drawing', 'development_building_survey', 'business_registration', 'ppa', 'construction_plan', 'pre_use_inspection', 'business_start', 'energy_agency', 'long_term_contract'],
    packages: [
      { name: 'BASIC 기본형', codes: ['A-1', 'A-2', 'A-3', 'A-4'], price: '4,635,000 ~ 6,300,000원' },
      { name: 'STANDARD 완료형', codes: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7'], price: '6,424,000 ~ 8,536,000원' },
      { name: 'PREMIUM 프리미엄형', codes: ['A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9'], price: '6,885,000 ~ 9,180,000원' }
    ]
  }
};

// Mixed sites are treated as land by default; the admin can switch the type.
export function defaultServiceType(siteType) {
  return siteType === 'building' ? 'building' : 'land';
}

// Services of a type in display order, with their A-n code.
export function servicesForType(type) {
  const spec = SERVICE_TYPES[type] || SERVICE_TYPES.land;
  return spec.services.map((key, index) => ({ key, code: 'A-' + (index + 1), ...SERVICE_CATALOG[key] }));
}

export function normalizeServiceSelection(value) {
  if (!value || typeof value !== 'object') return null;
  const type = Object.prototype.hasOwnProperty.call(SERVICE_TYPES, value.type) ? value.type : null;
  if (!type) return null;
  const allowed = SERVICE_TYPES[type].services;
  const picked = Array.isArray(value.services) ? value.services : [];
  return { type, services: allowed.filter((key) => picked.includes(key)) };
}

export function formatWon(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}
