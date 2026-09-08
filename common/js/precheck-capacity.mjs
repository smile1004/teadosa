// Agreed area-based estimate. Keep module-count flooring before the space allowance.
export function applicationArea(formData) {
  return formData?.site?.siteArea ?? formData?.siteArea ?? null;
}

export function calculateCapacity(area) {
  if (area === null || area === undefined) return null;
  if (typeof area !== 'number' && typeof area !== 'string') throw new Error('면적은 숫자로 입력해 주세요.');
  if (typeof area === 'string' && area.trim() === '') return null;
  const areaM2 = Number(area);
  if (!Number.isFinite(areaM2) || areaM2 < 0 || areaM2 > 100000000) {
    throw new Error('면적은 0 이상 100,000,000㎡ 이하로 입력해 주세요.');
  }
  const moduleCount = Math.floor(areaM2 * 10 / 27);
  const installedKw = moduleCount * 640 / 1000;
  return {
    formulaVersion: 'AREA_2_7_640_70_V1', areaM2, moduleAreaM2: 2.7,
    moduleCount, modulePowerW: 640, installedKw, spaceRate: 0.7,
    finalKw: Math.round(moduleCount * 448 / 10) / 100
  };
}

export function capacityFormulaText(value) {
  if (!value) return '면적 입력 후 산정됩니다.';
  const n = number => number.toLocaleString('ko-KR', { maximumFractionDigits: 3 });
  return `기준 면적 ${n(value.areaM2)}㎡ ÷ 모듈면적 2.700㎡ → ${n(value.moduleCount)}장(내림)\n` +
    `${n(value.moduleCount)}장 × 640W ÷ 1,000 = ${n(value.installedKw)}kW\n` +
    `설치공간율 70%(여유공간율 30%) 적용 → 예상 설치용량 ${value.finalKw.toFixed(2)}kW`;
}
