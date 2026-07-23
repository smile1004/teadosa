/**
 * 태도사 홈페이지 공통 설정
 * 메뉴 주소나 외부 채널 주소가 변경될 때 이 파일을 먼저 수정합니다.
 * 로컬 file:// 실행과 GitHub·Cloudflare 배포를 모두 지원합니다.
 */
(function (window) {
  'use strict';

  window.TAEDOSA_CONFIG = Object.freeze({
    siteName: '태양광도사',
    routes: Object.freeze({
      home: 'index.html',
      about: 'index.html#about',
      precheck: 'precheck/index.html',
      precheckApply: 'precheck/apply/index.html',
      precheckResult: 'precheck/result/index.html',
      precheckService: 'precheck/service/index.html',
      start: 'start/index.html',
      services: 'start/index.html#services',
      enterprise: 'index.html#enterprise-services',
      materials: 'index.html#materials',
      plantListings: 'index.html#plant-listings',
      sitemap: 'sitemap/index.html'
    }),
    channels: Object.freeze({
      homepage: 'https://teadosa.pages.dev/',
      blog: 'https://blog.naver.com/kgen1014',
      youtube: 'https://www.youtube.com/@KoreaGreenEnergy',
      contact: 'mailto:no-reply@kgen.kr'
    })
  });
})(window);
