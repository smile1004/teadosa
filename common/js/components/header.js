/**
 * 태도사 공통 Header
 * 이 파일만 수정하면 Header가 적용된 모든 페이지에 반영됩니다.
 */
(function () {
  'use strict';

  var loader = document.currentScript;
  if (!loader) return;

  (function ensureHeaderStylesheet() {
    var stylesheetHref = new URL('../../css/shared-menu.css?v=3.1', loader.src).href;
    var stylesheet = document.querySelector('link[rel="stylesheet"][href*="shared-menu.css"]');
    if (!stylesheet) {
      stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
    }
    stylesheet.href = stylesheetHref;
    document.head.appendChild(stylesheet);
  })();

  var headerHtml = "<header class=\"header\">\n<div class=\"header-inner\">\n<a class=\"logo\" href=\"index.html\">\n<img alt=\"태양광도사 로고\" src=\"data:image/png;base64,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\">\n<div>\n<strong>태양광도사</strong>\n</div>\n</a>\n<nav class=\"nav\">\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"index.html#about\">태도사소개</a>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"precheck/index.html\">사전검토</a>\n<div class=\"mega small precheck-menu precheck-card-menu\">\n<div>\n<h4>사전검토 서비스</h4>\n<a class=\"mega-card menu-package\" href=\"precheck/apply/index.html\"><strong>사전검토 신청</strong><span>발전사업 가능여부 검토</span></a>\n<a class=\"mega-card menu-package\" href=\"precheck/result/index.html\"><strong>검토결과 확인</strong><span>검토 결과보고서 확인</span></a>\n<a class=\"mega-card menu-package\" href=\"precheck/service/index.html\"><strong>가능서비스 확인</strong><span>진행 가능 서비스 확인 및 신청</span></a>\n</div>\n</div>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"start/index.html\">발전사업 시작하기(B2C)</a>\n<div class=\"mega\">\n<div class=\"mega-grid\">\n<div>\n<h4>패키지 서비스</h4>\n<a class=\"mega-card menu-package\" href=\"start/index.html\"><strong>토지형 발전사업 패키지</strong><span>토지 태양광 발전사업 인허가 절차 지원</span></a>\n<a class=\"mega-card menu-package\" href=\"start/index.html\"><strong>지붕형 발전사업 패키지</strong><span>공장·창고·축사 지붕형 발전사업 지원</span></a>\n<a class=\"mega-card menu-package\" href=\"start/index.html\"><strong>건물지원사업 패키지</strong><span>건물지원사업 신청 및 진행 절차 지원</span></a>\n<a class=\"mega-card menu-package\" href=\"start/index.html\"><strong>금융지원사업 패키지</strong><span>금융지원사업 신청 관련 절차 지원</span></a>\n</div>\n<div>\n<h4>개별 서비스</h4>\n<a class=\"mega-card menu-single\" href=\"start/license/index.html\"><strong>발전사업 허가</strong><span>발전사업 허가 신청 및 관련 행정절차 지원</span></a>\n<a class=\"mega-card menu-single\" href=\"start/development/index.html\"><strong>개발행위 허가</strong><span>개발행위 허가 신청 및 협의 절차 지원</span></a>\n<a class=\"mega-card menu-single\" href=\"start/ppa/index.html\"><strong>한전PPA 접수</strong><span>한전 전력수급계약 접수 절차 지원</span></a>\n<a class=\"mega-card menu-single\" href=\"start/index.html#services\"><strong>공사계획신고</strong><span>발전설비 공사 전 신고 절차 지원</span></a>\n<a class=\"mega-card menu-single\" href=\"start/index.html#services\"><strong>에관공 설비 신청</strong><span>발전설비 확인 및 등록 신청 지원</span></a>\n<a class=\"mega-card menu-single\" href=\"start/index.html#services\"><strong>개발행위 준공</strong><span>개발행위 준공검사 및 완료 절차 지원</span></a>\n</div>\n</div>\n</div>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"index.html#enterprise-services\">기업전문서비스(B2B)</a>\n<div class=\"mega small menu-small-card\">\n<div class=\"mega-grid\">\n<div>\n<h4>기술지원 서비스</h4>\n<a class=\"mega-card menu-package\" href=\"index.html#enterprise-services\"><strong>기술검토</strong><span>태양광 발전사업 기술 조건 및 적정성 검토</span></a>\n<a class=\"mega-card menu-package\" href=\"index.html#enterprise-services\"><strong>도면설계</strong><span>태양광 설계도면 및 시공도 작성 지원</span></a>\n</div>\n<div>\n<h4>현장시공 서비스</h4>\n<a class=\"mega-card menu-single\" href=\"index.html#enterprise-services\"><strong>현장실사</strong><span>현장 조사 및 시공 가능 여부 확인</span></a>\n<a class=\"mega-card menu-single\" href=\"index.html#enterprise-services\"><strong>공사</strong><span>태양광 발전설비 시공 서비스</span></a>\n</div>\n</div>\n</div>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"index.html#materials\">자재거래</a>\n<div class=\"mega coming-mega\">\n<div class=\"coming-card\">\n<img alt=\"서비스 준비중\" src=\"common/images/coming-character.png\">\n</div>\n</div>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\">\n<a class=\"nav-link\" href=\"index.html#plant-listings\">발전소 매물</a>\n<div class=\"mega coming-mega\">\n<div class=\"coming-card\">\n<img alt=\"서비스 준비중\" src=\"common/images/coming-character.png\">\n</div>\n</div>\n</div>\n<span class=\"nav-separator\">/</span>\n<div class=\"nav-item\"><a class=\"nav-link\" href=\"reviews/index.html\">고객 후기</a></div>\n<span class=\"nav-separator\">/</span><div class=\"nav-item\"><a class=\"nav-link sitemap-link\" href=\"sitemap/index.html\">SITEMAP</a></div>\n</nav>\n<div class=\"header-action-group\">\n<a class=\"top-btn top-btn-compact\" href=\"precheck/apply/index.html\">무료사전검토 신청</a>\n<div class=\"header-auth\"><a class=\"auth-link auth-login\" href=\"login/index.html\">로그인</a><span class=\"auth-divider\" aria-hidden=\"true\">|</span><a class=\"auth-link auth-signup\" href=\"signup/index.html\">회원가입</a></div>\n</div>\n<div class=\"mobile\">MENU</div>\n</div>\n</header>";

  headerHtml = headerHtml.replace(
    'href="start/index.html#services"><strong>공사계획신고</strong>',
    'href="start/construction-plan/index.html"><strong>공사계획신고</strong>'
  );

  ['materials', 'plant-listings'].forEach(function (section) {
    headerHtml = headerHtml.replace(
      'class="nav-link" href="index.html#' + section + '"',
      'class="nav-link" role="link" aria-disabled="true"'
    );
  });

  var config = window.TAEDOSA_CONFIG || {};
  var routes = config.routes || {};
  var routeMap = {
    'index.html#enterprise-services': routes.enterprise,
    'index.html#plant-listings': routes.plantListings,
    'index.html#materials': routes.materials,
    'precheck/apply/index.html': routes.precheckApply,
    'precheck/result/index.html': routes.precheckResult,
    'precheck/service/index.html': routes.precheckService,
    'precheck/index.html': routes.precheck,
    'start/license/index.html': routes.generationLicense,
    'start/index.html#services': routes.services,
    'start/index.html': routes.start,
    'reviews/index.html': routes.reviews,
    'sitemap/index.html': routes.sitemap,
    'signup/index.html': routes.signup,
    'login/index.html': routes.login,
    'mypage/index.html': routes.mypage,
    'index.html#about': routes.about,
    'index.html': routes.home
  };

  Object.keys(routeMap).forEach(function (fallback) {
    var target = routeMap[fallback];
    if (target) headerHtml = headerHtml.split('href="' + fallback + '"').join('href="' + target + '"');
  });

  // Search sits in a zero-width slot between the nav and the action group, so on desktop it lines up
  // under 고객 후기 / SITEMAP (items without dropdowns) and on mobile it becomes an icon next to MENU.
  headerHtml = headerHtml.replace(
    '<div class="header-action-group">',
    '<div class="header-search">' +
      '<button class="header-search-toggle" type="button" aria-label="검색 열기" aria-expanded="false">' +
        '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M15.5 15.5 13 13"/></svg>' +
      '</button>' +
      '<form class="header-search-box" role="search" autocomplete="off">' +
        '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M15.5 15.5 13 13"/></svg>' +
        '<input class="header-search-input" type="search" placeholder="서비스 검색" aria-label="사이트 검색" maxlength="40">' +
        '<div class="header-search-results" role="listbox" hidden></div>' +
      '</form>' +
    '</div>' +
    '<div class="header-action-group">'
  );

  loader.insertAdjacentHTML('beforebegin', headerHtml);
  initHeaderSearch();

  var header = document.querySelector('.header');
  var mobileMenuButton = header && header.querySelector('.mobile');
  var mobileNavigation = header && header.querySelector('.nav');

  if (mobileMenuButton && mobileNavigation) {
    mobileMenuButton.setAttribute('role', 'button');
    mobileMenuButton.setAttribute('tabindex', '0');
    mobileMenuButton.setAttribute('aria-label', '모바일 메뉴 열기');
    mobileMenuButton.setAttribute('aria-expanded', 'false');

    function setMobileMenu(open) {
      header.classList.toggle('mobile-menu-open', open);
      document.body.classList.toggle('mobile-menu-active', open);
      mobileMenuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileMenuButton.setAttribute('aria-label', open ? '모바일 메뉴 닫기' : '모바일 메뉴 열기');
      mobileMenuButton.textContent = open ? 'CLOSE' : 'MENU';
    }

    function toggleMobileMenu() {
      setMobileMenu(!header.classList.contains('mobile-menu-open'));
    }

    mobileMenuButton.addEventListener('click', toggleMobileMenu);
    mobileMenuButton.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMobileMenu();
      }
    });

    mobileNavigation.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMobileMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMobileMenu(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) setMobileMenu(false);
    });
  }

  function initHeaderSearch() {
    var root = document.querySelector('.header .header-search');
    if (!root) return;
    var headerEl = root.closest('.header');
    var toggle = root.querySelector('.header-search-toggle');
    var form = root.querySelector('.header-search-box');
    var input = root.querySelector('.header-search-input');
    var results = root.querySelector('.header-search-results');
    var activeIndex = -1;
    var matches = [];

    // title · description · extra keywords · path. Paths are absolute because pages use different <base> hrefs.
    var pages = [
      ['사전검토 신청', '발전사업 가능여부 무료 검토 신청', '무료 사전검토 신청서 부지 설치 가능', '/precheck/apply/'],
      ['사전검토 안내', '사전검토 서비스 소개', '사전검토 무료 검토 절차', '/precheck/'],
      ['검토결과 확인', '검토 결과보고서 확인', '결과 보고서 예상 설치용량', '/precheck/result/'],
      ['신청 가능 서비스 확인', '진행 가능 서비스 및 패키지 확인', '가능서비스 패키지 서비스 확인', '/precheck/service/'],
      ['발전사업 시작하기', '토지형·지붕형·건물지원·금융지원 패키지', '패키지 B2C 토지 지붕 건물 금융', '/start/'],
      ['발전사업 허가', '발전사업 허가 신청 및 관련 행정절차 지원', '발전사업허가 인허가 허가', '/start/license/'],
      ['개발행위 허가', '개발행위 허가 신청 및 협의 절차 지원', '개발행위허가 토목 인허가 허가', '/start/development/'],
      ['한전PPA 접수', '한전 전력수급계약 접수 절차 지원', '한전 PPA 전력수급계약 계통', '/start/ppa/'],
      ['공사계획신고', '발전설비 공사 전 신고 절차 지원', '공사계획 신고 전기감리', '/start/construction-plan/'],
      ['에관공 설비 신청', '발전설비 확인 및 등록 신청 지원', '에너지관리공단 에관공 RPS 설비확인', '/start/#services'],
      ['개발행위 준공', '개발행위 준공검사 및 완료 절차 지원', '준공 준공검사 개발행위', '/start/#services'],
      ['기업전문서비스(B2B)', '기술검토·도면설계·현장실사·공사', 'B2B 기업 기술검토 도면 설계 현장실사 시공 공사', '/#enterprise-services'],
      ['조례 검색', '지자체 태양광 조례 확인', '조례 이격거리 지자체 규제', '/#ordin-info-title'],
      ['태도사 소개', '태양광도사 서비스 소개', '회사 소개 태양광도사 태도', '/marketing.html'],
      ['고객 후기', '고객 후기 모음', '후기 리뷰 사례', '/reviews/'],
      ['마이페이지', '신청내역 및 회원정보 관리', '마이페이지 내정보 회원정보 신청내역', '/mypage/'],
      ['사전검토 신청내역', '마이페이지 사전검토 신청내역', '신청내역 진행상태 내 신청', '/mypage/#precheck-history-section'],
      ['사이트맵', '전체 메뉴 보기', 'SITEMAP 전체 메뉴', '/sitemap/']
    ];

    function normalize(text) { return String(text || '').toLowerCase().replace(/\s+/g, ''); }

    function search(query) {
      var q = normalize(query);
      if (!q) return [];
      return pages.map(function (page) {
        var title = normalize(page[0]);
        var score = title.indexOf(q) === 0 ? 3 : title.indexOf(q) >= 0 ? 2 : normalize(page[1] + page[2]).indexOf(q) >= 0 ? 1 : 0;
        return { page: page, score: score };
      }).filter(function (item) { return item.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 7)
        .map(function (item) { return item.page; });
    }

    function render() {
      matches = search(input.value);
      activeIndex = matches.length ? 0 : -1;
      if (!input.value.trim()) { results.hidden = true; results.innerHTML = ''; return; }
      results.innerHTML = matches.length
        ? matches.map(function (page, index) {
            return '<a class="header-search-result' + (index === activeIndex ? ' active' : '') + '" role="option" href="' + escapeAttribute(page[3]) + '"><strong>' + escapeHtml(page[0]) + '</strong><span>' + escapeHtml(page[1]) + '</span></a>';
          }).join('')
        : '<p class="header-search-empty">검색 결과가 없습니다.</p><a class="header-search-result sitemap" href="/sitemap/"><strong>전체 사이트맵 보기</strong><span>모든 메뉴를 한눈에 확인</span></a>';
      results.hidden = false;
    }

    function highlight(index) {
      var items = results.querySelectorAll('.header-search-result');
      if (!items.length) return;
      activeIndex = (index + items.length) % items.length;
      items.forEach(function (item, i) { item.classList.toggle('active', i === activeIndex); });
    }

    function close() {
      results.hidden = true;
      headerEl.classList.remove('header-search-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value.trim()) render(); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); highlight(activeIndex + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(activeIndex - 1); }
      else if (event.key === 'Escape') { close(); input.blur(); }
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var target = results.querySelectorAll('.header-search-result')[Math.max(activeIndex, 0)];
      if (target) window.location.href = target.getAttribute('href');
    });
    toggle.addEventListener('click', function () {
      var open = !headerEl.classList.contains('header-search-open');
      headerEl.classList.toggle('header-search-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) input.focus(); else close();
    });
    document.addEventListener('click', function (event) {
      if (!root.contains(event.target)) close();
    });
  }

  var authContainer = document.querySelector('.header-auth');
  if (!authContainer) return;

  var loginHref = routes.login || '/login/';
  var signupHref = routes.signup || '/signup/';
  var mypageHref = routes.mypage || '/mypage/';
  var adminLoginHref = '/admin/login/';

  renderLoading();

  function renderLoading() {
    authContainer.setAttribute('aria-busy', 'true');
    authContainer.innerHTML = '<span class="auth-status">회원정보 확인 중</span>';
  }

  function renderGuest() {
    authContainer.removeAttribute('aria-busy');
    authContainer.innerHTML = '<a class="auth-link auth-login" href="' + escapeAttribute(loginHref) + '">로그인</a><span class="auth-divider" aria-hidden="true">|</span><a class="auth-link auth-signup" href="' + escapeAttribute(signupHref) + '">회원가입</a><span class="auth-divider" aria-hidden="true">|</span><a class="auth-link auth-admin" href="' + escapeAttribute(adminLoginHref) + '">관리자</a>';
  }

  function renderMember(member) {
    var displayName = (member && member.name) ? member.name : '회원';
    authContainer.removeAttribute('aria-busy');
    var adminHref = member && member.role === 'admin' ? '/admin/' : adminLoginHref;
    authContainer.innerHTML = '<span class="auth-member-name">' + escapeHtml(displayName) + '님</span><span class="auth-divider" aria-hidden="true">|</span><a class="auth-link auth-mypage" href="' + escapeAttribute(mypageHref) + '">마이페이지</a><span class="auth-divider" aria-hidden="true">|</span><a class="auth-link auth-admin" href="' + escapeAttribute(adminHref) + '">관리자</a><span class="auth-divider" aria-hidden="true">|</span><button class="auth-link auth-logout" type="button">로그아웃</button>';

    var logoutButton = authContainer.querySelector('.auth-logout');
    if (!logoutButton) return;

    logoutButton.addEventListener('click', async function () {
      logoutButton.disabled = true;
      logoutButton.textContent = '처리 중';

      try {
        if (window.TaeDoSAAuth) {
          await window.TaeDoSAAuth.logout();
        } else {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
          });
        }
      } catch (error) {
        console.error('로그아웃 요청 오류:', error);
      } finally {
        renderGuest();
        window.location.replace('/');
      }
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function escapeAttribute(value) {
    return escapeHtml(value || '');
  }

  function applyAuthState(detail) {
    if (detail && detail.authenticated && detail.member) renderMember(detail.member);
    else renderGuest();
  }

  window.addEventListener('teadosa:authchange', function (event) {
    applyAuthState(event.detail || {});
  });

  if (window.TaeDoSAAuth) {
    window.TaeDoSAAuth.getSession()
      .then(function (outcome) {
        var result = outcome.result || {};
        applyAuthState({ authenticated: outcome.response.ok && result.authenticated, member: result.member || null });
      })
      .catch(function () { renderGuest(); });
  } else {
    fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (result) {
        if (result && result.authenticated && result.member) renderMember(result.member);
        else renderGuest();
      })
      .catch(function () { renderGuest(); });
  }
})();
