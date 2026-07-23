/**
 * 태도사 공통 Floating Shortcut
 * 페이지별 문구와 링크는 variant 설정으로 구분합니다.
 */
(function () {
  'use strict';
  var variants = {
    "start": `<section class="floating-shortcut">
<div class="floating-card">
<a class="float-item" href="#packages">
<div class="float-icon">📦</div>
<div>
<strong>발전사업 패키지</strong>
<p>사업 유형에 맞는 패키지를 선택하여 인허가 절차를 한번에 진행합니다.</p>
</div>
</a>
<a class="float-item" href="#services">
<div class="float-icon">📋</div>
<div>
<strong>개별 서비스</strong>
<p>필요한 서비스만 선택하여 원하는 절차만 신청할 수 있습니다.</p>
</div>
</a>
<a class="float-item" href="#process">
<div class="float-icon">💻</div>
<div>
<strong>온라인 진행</strong>
<p>상담, 계약, 서류접수 및 진행현황을 온라인으로 확인할 수 있습니다.</p>
</div>
</a>
</div>
</section>`,
    "precheck": `<section class="floating-shortcut precheck-floating" id="service-intro" aria-labelledby="intro-title">
<div class="floating-card">
<a class="float-item" href="#process">
<div class="float-icon" aria-hidden="true">🔎</div>
<div>
<strong id="intro-title">사업 가능성 검토</strong>
<p>사업지의 위치와 건축물·토지 조건을 기준으로 기본 진행 가능성을 확인합니다.</p>
</div>
</a>
<a class="float-item" href="#targets">
<div class="float-icon" aria-hidden="true">🏭</div>
<div>
<strong>검토 대상 확인</strong>
<p>공장, 창고, 축사, 상가, 건물 옥상과 유휴부지 등 다양한 사업지를 검토합니다.</p>
</div>
</a>
<a class="float-item" href="#apply">
<div class="float-icon" aria-hidden="true">💻</div>
<div>
<strong>온라인 무료 신청</strong>
<p>기본정보를 입력하면 검토 결과와 이어서 가능한 서비스를 안내받을 수 있습니다.</p>
</div>
</a>
</div>
</section>`
  };
  var loader = document.currentScript;
  if (!loader) return;
  var variant = loader.getAttribute('data-variant');
  if (!variants[variant]) return;
  loader.insertAdjacentHTML('beforebegin', variants[variant]);
})();
