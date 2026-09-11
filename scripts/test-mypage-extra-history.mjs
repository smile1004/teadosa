import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../common/js/mypage.js', import.meta.url), 'utf8'))
  .replace('  if (!session ||', '  window.testHistory = { renderExtraHistory, extraStatusLabel };\n  if (!session ||');
const window = { TaeDoSAApplicationActions: { buttons: (type, id) => `<button data-type="${type}" data-id="${id}">수정</button>` } };
vm.runInNewContext(source, { window, document: { getElementById: () => null }, Intl, Date });
const { renderExtraHistory, extraStatusLabel } = window.testHistory;
for (const type of ['ppa', 'construction-plan']) {
  const html = renderExtraHistory(type, '서비스', [{
    id: 5, requestNo: 'TEST-5', siteAddress: '테스트 주소', status: 'completed',
    submittedAt: '2026-09-11T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
    statusHistory: [
      { status: 'submitted', changedAt: '2026-09-11T00:00:00Z', customerNotice: '접수가 완료되었습니다.\n추가 안내를 확인해 주세요.' },
      { status: 'completed', changedAt: '2026-09-12T00:00:00Z', customerNotice: '<script>unsafe</script>' }
    ]
  }]);
  assert.equal((html.match(/class="license-timeline-marker"/g) || []).length, 2);
  assert.equal((html.match(/class="license-timeline-content"/g) || []).length, 2);
  assert.match(html, /접수완료/);
  assert.match(html, /license-completed/);
  assert.match(html, /최근 변경/);
  assert.match(html, /<br>추가 안내/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /허가접수|허가완료|<script>/);
  assert.match(html, new RegExp('data-type="' + type + '"'));
  const fallback = renderExtraHistory(type, '서비스', [{ id: 6, submittedAt: '2026-09-11', statusHistory: null, customerNotice: '별도 안내' }]);
  assert.match(fallback, /license-timeline-marker/);
  assert.match(fallback, /별도 안내/);
  assert.doesNotMatch(fallback, /undefined|null/);
  assert.match(renderExtraHistory(type, '서비스', []), /신청내역이 없습니다/);
  const noDuplicate = renderExtraHistory(type, '서비스', [{ id: 7, customerNotice: '동일 안내', statusHistory: [{ status: 'received', customerNotice: '동일 안내' }] }]);
  assert.equal((noDuplicate.match(/동일 안내/g) || []).length, 1);
}
assert.equal(extraStatusLabel('submitted'), '접수완료');
assert.equal(extraStatusLabel('completed'), '완료');
console.log('PASS: PPA/construction-plan timeline markers, service labels, notices, missing history, escaping, edit actions and empty state.');
