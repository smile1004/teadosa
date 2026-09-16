// Layout samples only; these are not live prices.
const marketSamples = {
  rec: { '육지': ['2026.09', '71,900', '70,500', '71,335'], '제주': ['2026.09', '70,800', '69,200', '70,000'] },
  smp: { '육지': ['2026.09.16(수)', '161.59', '90.09', '104.45'], '제주': ['2026.09.16(수)', '165.20', '92.30', '108.70'] }
};
document.querySelectorAll('.market-area-switch').forEach(function (group) {
  const card = group.closest('.market-info-card');
  const samples = marketSamples[card.getAttribute('aria-labelledby') === 'rec-info-title' ? 'rec' : 'smp'];
  function render(area) {
    card.querySelectorAll('.market-values dd').forEach(function (value, index) {
      value.textContent = samples[area][index];
    });
  }
  render('육지');
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
  const input = this.elements.namedItem('region');
  input.value = input.value.trim();
  if (!input.value) {
    event.preventDefault();
    input.reportValidity();
  }
});
