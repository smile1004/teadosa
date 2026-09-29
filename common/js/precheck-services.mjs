// Service catalog shared by the admin review form, the review API and the member service page.
// Keys are stored in precheck_reviews.result_data.serviceSelection, so never rename an existing key.
// A service without min/max has no fixed price and is quoted separately.
export const SERVICE_CATALOG = {
  license: { name: '발전사업 허가', note: '발전사업 허가 신청 및 관련 행정절차 지원', min: 500000, max: 800000, href: '/start/license/apply/' },
  development_land: { name: '개발행위 허가', note: '개발행위 허가 신청 및 협의 절차 지원 · 토목설계 포함', min: 4000000, max: 5000000, href: '/start/development/apply/' },
  development_building: { name: '개발행위 허가', note: '건축물 상부 · 도면 유무에 따라 상이 (도면 없는 경우 실측 포함)', min: 1500000, max: 4000000, href: '/start/development/apply/' },
  ppa: { name: '한전PPA 접수', note: '한전 전력수급계약 접수 절차 지원', min: 300000, max: 500000, href: '/start/ppa/apply/' },
  construction_plan: { name: '공사계획신고', note: '발전설비 공사 전 신고 절차 지원 · 전기감리 포함', min: 1500000, max: 1700000, href: '/start/construction-plan/apply/' },
  energy_agency: { name: '에관공 설비 신청', note: '발전설비 확인 및 등록 신청 지원', min: 300000, max: 400000 },
  development_completion: { name: '개발행위 준공', note: '개발행위 준공검사 및 완료 절차 지원' }
};

// Package keys are stored in serviceSelection.packages, so never rename an existing key.
const PACKAGES = [
  { key: 'basic', name: 'BASIC 기본형', count: 2, discount: 0.1 },
  { key: 'standard', name: 'STANDARD 완료형', count: 4, discount: 0.12 },
  { key: 'premium', name: 'PREMIUM 프리미엄형', count: 6, discount: 0.15 }
];
export const PACKAGE_KEYS = PACKAGES.map((pkg) => pkg.key);

export const SERVICE_TYPES = {
  land: {
    label: '토지형',
    services: ['license', 'development_land', 'ppa', 'construction_plan', 'energy_agency', 'development_completion']
  },
  building: {
    label: '건물형',
    services: ['license', 'development_building', 'ppa', 'construction_plan', 'energy_agency', 'development_completion']
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

export function hasPrice(service) {
  return Number.isFinite(service.min) && Number.isFinite(service.max);
}

// Packages bundle the first N services of a type; the price is the discounted sum of priced services.
export function packagesForType(type) {
  const list = servicesForType(type);
  return PACKAGES.map((pkg) => {
    const included = list.slice(0, pkg.count);
    const priced = included.filter(hasPrice);
    const rate = 1 - pkg.discount;
    return {
      key: pkg.key,
      name: pkg.name,
      discount: pkg.discount,
      services: included,
      codes: included.map((s) => s.code),
      min: Math.round(priced.reduce((sum, s) => sum + s.min, 0) * rate / 1000) * 1000,
      max: Math.round(priced.reduce((sum, s) => sum + s.max, 0) * rate / 1000) * 1000,
      unpriced: included.filter((s) => !hasPrice(s))
    };
  });
}

export function priceText(service) {
  return hasPrice(service) ? formatWon(service.min) + ' ~ ' + formatWon(service.max) + '원' : '별도 견적';
}

export function normalizeServiceSelection(value) {
  if (!value || typeof value !== 'object') return null;
  const type = Object.prototype.hasOwnProperty.call(SERVICE_TYPES, value.type) ? value.type : null;
  if (!type) return null;
  const allowed = SERVICE_TYPES[type].services;
  const picked = Array.isArray(value.services) ? value.services : [];
  const services = allowed.filter((key) => picked.includes(key));
  // Selections saved before packages were chosen fall back to packages whose services are all available.
  const packages = Array.isArray(value.packages)
    ? PACKAGE_KEYS.filter((key) => value.packages.includes(key))
    : packagesForType(type).filter((pkg) => pkg.services.every((s) => services.includes(s.key))).map((pkg) => pkg.key);
  return { type, services, packages };
}

export function formatWon(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}
