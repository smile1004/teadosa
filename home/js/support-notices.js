(async function () {
  const list = document.getElementById('support-notice-list');
  const status = document.getElementById('support-notice-status');
  if (!list || !status) return;
  try {
    const response = await fetch('/api/support-notices');
    const data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.items) || !data.items.length) throw new Error('UNAVAILABLE');
    const fragment = document.createDocumentFragment();
    data.items.slice(0, 5).forEach(item => {
      const url = new URL(item.url);
      if (url.origin !== 'https://www.knrec.or.kr' || url.pathname !== '/biz/pds/businoti/view.do') throw new Error('INVALID_LINK');
      const row = document.createElement('tr');
      function cell(className, text) {
        const element = document.createElement('td');
        element.className = className;
        if (text !== undefined) element.textContent = text;
        row.append(element);
        return element;
      }
      cell('notice-number', item.number || '—');
      const state = document.createElement('span');
      state.className = 'notice-state' + (item.status === '진행' ? ' is-active' : '');
      state.textContent = item.status || '—';
      cell('notice-status').append(state);
      const link = document.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const title = document.createElement('span');
      title.textContent = item.title;
      const date = document.createElement('time');
      date.dateTime = item.publishedAt;
      date.textContent = item.publishedAt.replaceAll('-', '.');
      link.append(title);
      cell('notice-title').append(link);
      cell('notice-department', item.department || '—');
      cell('notice-date').append(date);
      const deadlineCell = cell('notice-deadline');
      if (item.deadline) {
        const deadline = document.createElement('time');
        deadline.dateTime = item.deadline;
        deadline.textContent = item.deadline.replaceAll('-', '.');
        deadlineCell.append(deadline);
      } else {
        deadlineCell.textContent = '—';
      }
      fragment.append(row);
    });
    list.replaceChildren(fragment);
    status.textContent = data.stale ? '갱신이 지연되어 최근 조회한 공고를 표시합니다.' : '';
  } catch {
    status.textContent = '공고를 불러오지 못했습니다. 더보기에서 확인해 주세요.';
  }
}());
