/** 태도사 공통 UI 동작 */
(function () {
  'use strict';
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = this.getAttribute('href');
      if (!id || id === '#') return;
      var target;
      try { target = document.querySelector(id); } catch (error) { return; }
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.querySelectorAll('.pc-faq-q').forEach(function (button) {
    button.addEventListener('click', function () {
      var item = this.closest('.pc-faq-item');
      if (!item) return;
      var open = item.classList.contains('open');
      document.querySelectorAll('.pc-faq-item.open').forEach(function (other) {
        other.classList.remove('open');
        var otherButton = other.querySelector('.pc-faq-q');
        if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
      });
      if (!open) { item.classList.add('open'); this.setAttribute('aria-expanded', 'true'); }
    });
  });
  var targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (element) { element.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(function (element) { observer.observe(element); });
})();
