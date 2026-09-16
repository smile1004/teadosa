import assert from 'node:assert/strict';
import { parseSupportNotices } from '../functions/_lib/support-notices.mjs';

const row = (id, date, title = '지원사업 &amp; 안내', href = `./view.do?no=${id}`) =>
  `<tr><td>공지</td><td>진행</td><td>공고</td><td class="left"><a href="${href}">${title}</a></td><td>담당부서</td><td>${date}</td><td>2050-01-01</td></tr>`;
const result = parseSupportNotices(row(1, '2025-01-01') + row(7, '2026-09-11') + row(7, '2026-09-11') +
  row(6, '2026-09-11') + row(5, '2026-09-09') + row(4, '2026-09-08') + row(3, '2026-09-07') + row(2, '2026-09-06') +
  row(99, '2026-10-01', '위조 링크', 'https://example.com/view.do?no=99'));
assert.deepEqual(result.map(item => item.id), ['7', '6', '5', '4', '3']);
assert.equal(result[0].title, '지원사업 & 안내');
assert.equal(result[0].publishedAt, '2026-09-11');
assert.equal(result[0].deadline, '2050-01-01');
assert.equal(parseSupportNotices(row(7, '2026-09-11').replace('2050-01-01', ''))[0].deadline, null);
assert.equal(result[0].status, '진행');
assert.equal(result[0].department, '담당부서');
const numbered = row(7, '2026-09-11').replace('<td>공지</td>', '<td>307</td>');
assert.equal(parseSupportNotices(numbered + row(7, '2026-09-11'))[0].number, '307');
assert.equal(parseSupportNotices(row(7, '2026-09-11') + numbered)[0].number, '307');
assert.equal(result[0].url, 'https://www.knrec.or.kr/biz/pds/businoti/view.do?no=7');
assert.throws(() => parseSupportNotices('<html>점검 중</html>'), /NOTICE_FORMAT_CHANGED/);
console.log('지원사업공고: 중복 제거, 최신순 5개, 제목 디코딩, 원문 링크 제한, 비정상 응답 검사 통과');
