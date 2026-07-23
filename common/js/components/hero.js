/** 태도사 공통 Hero */
(function(){'use strict';var variants={
  'start':'<section class="hero">\n<div class="hero-inner">\n<div>\n<div class="badge">발전사업 시작하기</div>\n<h1>태양광 발전사업을<br/><span>쉽고 체계적으로 시작하세요</span></h1>\n<p>\n          패키지 서비스부터 개별 인허가 서비스까지\n          필요한 서비스를 선택하여 간편하게 신청\n        </p></div>\n</div>\n</section>',
  'precheck':'<section class="hero">\n<div class="hero-inner">\n<div>\n<div class="badge">사전검토</div>\n<h1 id="hero-title">발전사업 가능 여부를<br/><span>온라인으로 간편하게 확인하세요</span></h1>\n<p>\n          사업 예정지 입지와 기본 조건을 검토하고\n          진행 가능 여부와 필요한 후속 절차를 쉽게 제공\n        </p>\n</div>\n</div>\n</section>'
};var loader=document.currentScript;if(!loader)return;var variant=loader.getAttribute('data-variant');if(!variants[variant])return;loader.insertAdjacentHTML('beforebegin',variants[variant]);})();
