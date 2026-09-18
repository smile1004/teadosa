// Overpass Turbo에서 내보낸(export) GeoJSON을 admin/kepco-test/substations.json에 합칩니다.
// 사용법: node scripts/merge-substations.mjs "C:\Users\me\Downloads\export.geojson"
import { readFileSync, writeFileSync } from 'fs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('사용법: node scripts/merge-substations.mjs <export.geojson 경로>');
  process.exit(1);
}

const targetPath = new URL('../admin/kepco-test/substations.json', import.meta.url);
const geojson = JSON.parse(readFileSync(inputPath, 'utf8'));
const existing = JSON.parse(readFileSync(targetPath, 'utf8'));

function shortName(name) {
  return name.replace(/\s?(변전소|변환소)$/, '').trim();
}

function haversineKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

let added = 0, skipped = 0;
for (const feature of geojson.features || []) {
  const rawName = feature.properties?.name;
  const coords = feature.geometry?.coordinates;
  if (!rawName || !coords) { skipped++; continue; }
  const name = shortName(rawName);
  const lng = coords[0], lat = coords[1];
  const dup = existing.find(x => x.name === name && haversineKm(x, { lat, lng }) < 2);
  if (dup) { skipped++; continue; }
  existing.push({ name, lat, lng });
  added++;
}

existing.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
writeFileSync(targetPath, JSON.stringify(existing, null, 0));
console.log(`추가: ${added}개, 중복/이름없음 제외: ${skipped}개, 전체: ${existing.length}개`);
