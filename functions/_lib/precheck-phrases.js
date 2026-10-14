// 사전검토 표준 문장 공통 규칙 (관리자 전용 API에서 사용)
export const PHRASE_GROUPS = {
  site: ['shade', 'slope', 'road', 'struct'],
  opinion: ['possible', 'conditional', 'not_possible'],
};
export const MAX_TEXT_LENGTH = 300;

export function validGroup(category, groupKey) {
  return Object.prototype.hasOwnProperty.call(PHRASE_GROUPS, category) && PHRASE_GROUPS[category].includes(groupKey);
}

export function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

export function toPhrase(row) {
  return {
    id: row.id,
    category: row.category,
    groupKey: row.group_key,
    text: row.text,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    updatedAt: row.updated_at,
  };
}
