// Only the public result page opts in to searches passed from the homepage.
(function () {
  const params = new URLSearchParams(window.location.search);
  const region = (params.get('region') || '').trim();
  if (!region || region.length > 150) return;
  const form = document.getElementById('ordin-form');
  const keyword = (params.get('keyword') || '개발행위허가').trim();
  if (!keyword || keyword.length > 100) return;
  form.elements.namedItem('region').value = region;
  form.elements.namedItem('keyword').value = keyword;
  form.requestSubmit();
})();
