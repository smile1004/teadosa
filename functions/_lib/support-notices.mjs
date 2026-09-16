export const SOURCE_URL = 'https://www.knrec.or.kr/biz/pds/businoti/list.do';

function plainText(html) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/\s+/g, ' ').trim();
}

export function parseSupportNotices(html) {
  const unique = new Map();
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    if (cells.length < 6) continue;
    const link = cells[3].match(/<a\b[^>]*href=["'](?:\.\/|\/biz\/pds\/businoti\/)view\.do\?no=(\d+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = plainText(link[2]);
    const publishedAt = plainText(cells[5]);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || !Number.isFinite(Date.parse(publishedAt))) continue;
    const number = plainText(cells[0]);
    const deadlineText = plainText(cells[6] || '');
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineText) && Number.isFinite(Date.parse(deadlineText)) ? deadlineText : null;
    const previous = unique.get(link[1]);
    const hasAttachments = /<a\b[^>]*\bclass=["'][^"']*\bico_(?:pdf|hwp|xls|xlsx|zip|doc|ppt|file)[\w-]*\b/i.test(cells[7] || '')
      || /\bfile_down\s*\(/i.test(cells[7] || '');
    unique.set(link[1], { id: link[1], number: /^\d+$/.test(number) ? number : previous?.number || number,
      status: plainText(cells[1]), department: plainText(cells[4]),
      title, publishedAt, deadline, hasAttachments, url: `https://www.knrec.or.kr/biz/pds/businoti/view.do?no=${link[1]}` });
  }
  const items = [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || Number(b.id) - Number(a.id)).slice(0, 5);
  if (!items.length) throw new Error('NOTICE_FORMAT_CHANGED');
  return items;
}

export async function fetchSupportNotices() {
  const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(15000), headers: {
    Accept: '*/*', 'User-Agent': 'Teadosa-NoticeReader/1.0', 'Accept-Encoding': 'identity'
  } });
  if (!response.ok) throw new Error('NOTICE_SOURCE_UNAVAILABLE_' + response.status);
  const items = parseSupportNotices(await response.text());
  return { items, sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString() };
}
