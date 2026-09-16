document.querySelectorAll('.market-area-switch').forEach(function (group) {
  const card = group.closest('.market-info-card');
  const isRec = card.getAttribute('aria-labelledby') === 'rec-info-title';
  const marketName = isRec ? 'REC' : 'SMP';
  let marketData = null;
  let selectedArea = '육지';
  function render(area) {
    selectedArea = area;
      if (!marketData) return;
      const prices = marketData.areas[area === '육지' ? 'land' : 'jeju'];
      const format = value => value === null ? '—' : Number(value).toLocaleString('ko-KR', { minimumFractionDigits: isRec ? 0 : 2, maximumFractionDigits: 2 });
      const values = [marketData.tradeDate.replaceAll('-', '.'), format(prices.max), format(prices.min), format(prices.average)];
      card.querySelectorAll('.market-values dd').forEach((value, index) => { value.textContent = values[index]; });
      const updated = new Date(marketData.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
      card.querySelector('.market-data-status').textContent = '출처: 한국전력거래소 · ' + updated + ' 조회' + (prices.noTrades ? ' · 거래 없음' : '') + (marketData.stale ? ' · 갱신 지연' : '') + (marketData.previousDay ? ' · 최근 제공 자료' : '');
  }
  render('육지');
    fetch('/api/market/' + (isRec ? 'rec' : 'smp')).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('MARKET_UNAVAILABLE');
      marketData = data;
      render(selectedArea);
    }).catch(() => {
      card.querySelector('.market-data-status').textContent = marketName + ' 가격정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';
    });
  group.addEventListener('click', function (event) {
    const selected = event.target.closest('button');
    if (!selected) return;
    group.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button === selected));
    });
    render(selected.textContent);
  });
});

document.getElementById('home-ordin-form').addEventListener('submit', function (event) {
  const region = this.elements.namedItem('region');
  const keyword = this.elements.namedItem('keyword');
  region.value = region.value.trim();
  keyword.value = keyword.value.trim();
  if (!this.reportValidity()) {
    event.preventDefault();
    return;
  }
  const url = new URL(this.action, window.location.href);
  url.search = new URLSearchParams({region: region.value, keyword: keyword.value}).toString();
  const width = Math.min(1000, window.screen.availWidth);
  const height = Math.min(820, window.screen.availHeight);
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const popup = window.open('about:blank', '_blank',
    `popup=yes,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes,width=${width},height=${height},left=${left},top=${top}`);
  // When popups are blocked, leave the native new-window form submission available.
  if (!popup) return;
  popup.opener = null;
  popup.location.replace(url.href);
  event.preventDefault();
});
