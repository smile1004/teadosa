/**
 * 태도사 공통 Footer
 * 이 파일만 수정하면 Footer가 적용된 모든 페이지에 반영됩니다.
 */
(function () {
  'use strict';
  var footerHtml = `<section aria-labelledby="bottom-service-title" class="bottom-service">
<div class="bottom-service-inner">
<div class="bottom-service-head bottom-service-brand-head">
<a aria-label="태양광도사 홈" class="bottom-service-identity" href="index.html">
<img alt="태양광도사 로고" class="bottom-service-main-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDEwLjAtYzAwMCA3OS5kMjBlNDY2MzAsIDIwMjUvMTIvMDktMDI6MTE6MjMgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNy43IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2MkFCREQ1RjY2MjExMUYxQTg0NEZGNURDOEM3QkUzNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2MkFCREQ2MDY2MjExMUYxQTg0NEZGNURDOEM3QkUzNCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjYyQUJERDVENjYyMTExRjFBODQ0RkY1REM4QzdCRTM0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjYyQUJERDVFNjYyMTExRjFBODQ0RkY1REM4QzdCRTM0Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+jr53FQAACTJJREFUeNrs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">
<div class="bottom-service-name">
<span>TAEDOSA</span>
<strong id="bottom-service-title">태양광도사</strong>
</div>
</a>
<div aria-label="태양광도사 공식 채널" class="bottom-service-actions bottom-channel-actions">
<button aria-label="홈페이지" class="bottom-action channel-home" title="홈페이지" type="button">
<svg aria-hidden="true" viewbox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2v-6.4H8.7V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z"></path><path d="m1.8 11.6 10.2-8.8 10.2 8.8"></path></svg>
<span class="channel-tooltip">홈페이지</span>
</button>
<button aria-label="네이버 블로그" class="bottom-action channel-blog" title="네이버 블로그" type="button">
<svg aria-hidden="true" viewbox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-4.8 4V17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"></path><path d="M8 8h8M8 12h5"></path></svg>
<span class="channel-tooltip">네이버 블로그</span>
</button>
<button aria-label="유튜브" class="bottom-action channel-youtube" title="유튜브" type="button">
<svg aria-hidden="true" viewbox="0 0 24 24"><rect height="12" rx="4" width="18" x="3" y="6"></rect><path d="m10 9 5 3-5 3V9Z"></path></svg>
<span class="channel-tooltip">유튜브</span>
</button>
<button aria-label="문의하기" class="bottom-action channel-contact" title="문의하기" type="button">
<svg aria-hidden="true" viewbox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"></path><path d="M8 9h8M8 13h5"></path></svg>
<span class="channel-tooltip">문의하기</span>
</button>
</div>
</div>
<div class="bottom-service-grid">
<div class="bottom-guide-card">
<div class="bottom-guide-head">
<span class="bottom-guide-index">GUIDE</span>
<strong>서비스 이용 안내</strong>
</div>
<div class="bottom-guide-steps">
<a href="precheck/apply/index.html"><span>01</span><em>사전검토 신청</em></a>
<a href="start/index.html"><span>02</span><em>서비스 선택</em></a>
<a href="start/index.html#services"><span>03</span><em>온라인 계약</em></a>
</div>
</div>
<div class="bottom-link-card">
<h3>사전검토</h3>
<a href="precheck/apply/index.html">사전검토 신청</a>
<a href="precheck/result/index.html">검토결과 확인</a>
<a href="precheck/service/index.html">가능서비스 확인</a>
</div>
<div class="bottom-link-card">
<h3>발전사업 서비스</h3>
<a href="start/index.html">패키지 서비스</a>
<a href="start/index.html#services">개별 서비스</a>
<a href="start/index.html">진행절차 안내</a>
</div>
<div class="bottom-link-card">
<h3>바로가기</h3>
<a href="index.html#enterprise-services">기업 전문서비스</a>
<a href="sitemap/index.html">사이트맵</a>
<a href="index.html#about">맨 위로</a>
</div>
</div>
</div>
</section><div class="site-copyright">
Copyrights © TAEDO Co., Ltd All Rights Reserved.
</div>`;

  var config = window.TAEDOSA_CONFIG || {};
  var routes = config.routes || {};
  var channels = config.channels || {};
  var routeMap = {
    'index.html#enterprise-services': routes.enterprise,
    'precheck/apply/index.html': routes.precheckApply,
    'precheck/result/index.html': routes.precheckResult,
    'precheck/service/index.html': routes.precheckService,
    'start/index.html#services': routes.services,
    'start/index.html': routes.start,
    'sitemap/index.html': routes.sitemap,
    'index.html#about': routes.about,
    'index.html': routes.home
  };

  Object.keys(routeMap).forEach(function (fallback) {
    var target = routeMap[fallback];
    if (target) footerHtml = footerHtml.split('href="' + fallback + '"').join('href="' + target + '"');
  });

  var loader = document.currentScript;
  if (!loader) return;
  loader.insertAdjacentHTML('beforebegin', footerHtml);
})();
