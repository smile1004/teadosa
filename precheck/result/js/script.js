(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const message = document.getElementById('result-message');
  const content = document.getElementById('result-content');
  const VWORLD_KEY = '01BB25F3-74B3-4781-B43C-6F38B9D90208';

  init();

  async function init() {
    try {
      const member = await auth.requireAuth({ redirect: false });

      if (!member) {
        const params = new URLSearchParams({
          next: window.location.pathname + window.location.search,
          reason: 'login-required'
        });
        window.location.replace('/login/?' + params.toString());
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestId = params.get('id') || '';
      const outcome = await auth.getPrecheckResult(requestId);
      const result = outcome.result || {};

      if (outcome.response.status === 404) {
        showMessage(result.message || '아직 공개된 검토결과가 없습니다.', false);
        return;
      }

      if (!outcome.response.ok || !result.success) {
        throw new Error(result.message || '검토결과를 불러오지 못했습니다.');
      }

      render(result.request, result.review);
      showMessage('');
      content.hidden = false;
    } catch (error) {
      showMessage(error.message || '검토결과를 불러오지 못했습니다.', true);
    }
  }

  function render(request, review) {
    setText('summary-possibility', possibilityLabel(review.installationPossible));
    const serviceButton = document.getElementById('available-service-button');
    if (serviceButton) {
      serviceButton.onclick = function () {
        const query = request && request.id ? ('?id=' + encodeURIComponent(request.id)) : '';
        window.location.href = '/precheck/service/' + query;
      };
    }
    setText('summary-request-no', request.requestNo || '-');
    setText('summary-published-at', formatDate(review.publishedAt));

    const data = request.formData || {};
    const rows = [
      ['신청자', request.applicantName || '-'],
      ['설치주소', request.siteAddress || '-'],
      ['사업지 유형', siteTypeLabel(data.siteType || request.siteType)],
      ['용도', purposeLabel(data.purpose || request.purpose)],
      ['검토 기준 예상용량', review.expectedCapacity === null || review.expectedCapacity === undefined ? '-' : Number(review.expectedCapacity).toLocaleString('ko-KR') + ' kW']
    ];

    document.getElementById('result-basic-info').innerHTML = rows.map(function (row) {
      return '<div class="label">' + escapeHtml(row[0]) + '</div><div class="value">' + escapeHtml(row[1]) + '</div>';
    }).join('');

    renderInstallationMap(request.siteAddress || '');

    const items = review.resultData?.items || [];
    const box = document.getElementById('result-items');

    if (!items.length) {
      box.innerHTML = '<p class="result-empty">등록된 세부 검토 항목이 없습니다.</p>';
    } else {
      box.innerHTML = items.map(function (item) {
        return '<article class="result-item">' +
          '<div class="result-item-head">' +
            '<h3>' + escapeHtml(item.title || '검토 항목') + '</h3>' +
            '<span class="result-status status-' + escapeHtml(item.status || 'info') + '">' + escapeHtml(itemStatusLabel(item.status)) + '</span>' +
          '</div>' +
          '<div class="result-item-content' + (!item.content ? ' is-empty' : '') + '">' +
            (item.content ? escapeHtml(item.content).replace(/\n/g, '<br>') : '세부 내용은 추가 확인이 필요합니다.') +
          '</div>' +
        '</article>';
      }).join('');
    }

    renderExpectedCapacity(review);

    document.getElementById('overall-opinion-view').textContent = review.overallOpinion || '-';

    const noticeCard = document.getElementById('customer-notice-card');
    const notice = document.getElementById('customer-notice-view');

    if (review.customerNotice) {
      notice.textContent = review.customerNotice;
      noticeCard.hidden = false;
    } else {
      noticeCard.hidden = true;
    }
  }

  function renderExpectedCapacity(review) {
    const card = document.getElementById('expected-capacity-card');
    const valueNode = document.getElementById('expected-capacity-value');
    const basisNode = document.getElementById('expected-capacity-basis');
    const figure = document.getElementById('capacity-layout-figure');
    const image = document.getElementById('capacity-layout-image');
    if (!card || !valueNode || !basisNode || !figure || !image) return;

    const capacity = review.resultData?.capacityAssessment || {};
    const hasValue = review.expectedCapacity !== null && review.expectedCapacity !== undefined && review.expectedCapacity !== '';
    const hasImage = /^data:image\/(jpeg|png|webp);base64,/i.test(String(capacity.layoutImageDataUrl || ''));
    card.hidden = false;

    valueNode.textContent = hasValue ? Number(review.expectedCapacity).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kW' : '면적 확인 후 산정';
    const calculationNode = document.getElementById('expected-capacity-calculation');
    if (calculationNode) calculationNode.textContent = capacity.formulaText || '';
    basisNode.textContent = capacity.basis || '신청자료와 확인 가능한 면적을 기준으로 개략 산정했습니다.';
    figure.hidden = !hasImage;
    if (hasImage) image.src = capacity.layoutImageDataUrl;
    else image.removeAttribute('src');
  }

  function renderInstallationMap(address) {
    const mapNode = document.getElementById('result-map');
    const addressNode = document.getElementById('result-map-address');
    const mapMessage = document.getElementById('result-map-message');

    if (!mapNode || !addressNode || !mapMessage) return;
    addressNode.textContent = address || '신청 주소 정보 없음';

    if (!address) {
      mapMessage.textContent = '표시할 신청 주소가 없습니다.';
      return;
    }

    if (!window.kakao || !window.kakao.maps) {
      mapMessage.textContent = '지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      return;
    }

    window.kakao.maps.load(function () {
      findCoordinates(address).then(function (coordinates) {
        const center = new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng);
        const map = new window.kakao.maps.Map(mapNode, {
          center: center,
          level: 3,
          mapTypeId: window.kakao.maps.MapTypeId.SKYVIEW
        });
        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);

        const marker = new window.kakao.maps.Marker({ map: map, position: center });
        const markerContent = document.createElement('div');
        markerContent.className = 'result-map-marker';
        markerContent.innerHTML = '<strong>사전검토 신청 위치</strong><span>' + escapeHtml(address) + '</span>';
        const overlay = new window.kakao.maps.CustomOverlay({
          map: map,
          position: center,
          content: markerContent,
          yAnchor: 1.55
        });

        void marker;
        void overlay;
        bindMapControls(map, mapNode);
        mapMessage.hidden = true;
        mapNode.setAttribute('aria-label', address + ' 태양광 설치 가능 위치 지도');
      }).catch(function () {
        mapMessage.textContent = '신청 주소의 지도 위치를 찾지 못했습니다.';
      });
    });
  }

  function findCoordinates(address) {
    return findCoordinatesWithKakao(address).catch(function () {
      return findCoordinatesWithVWorld(address, 'road').catch(function () {
        return findCoordinatesWithVWorld(address, 'parcel');
      });
    });
  }

  function findCoordinatesWithKakao(address) {
    return new Promise(function (resolve, reject) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, function (result, status) {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        } else {
          reject(new Error('KAKAO_ADDRESS_NOT_FOUND'));
        }
      });
    });
  }

  function findCoordinatesWithVWorld(address, type) {
    const params = new URLSearchParams({
      service: 'address', request: 'getcoord', version: '2.0',
      crs: 'epsg:4326', address: address, refine: 'true', simple: 'false',
      format: 'json', type: type, key: VWORLD_KEY
    });

    return fetch('https://api.vworld.kr/req/address?' + params.toString())
      .then(function (response) {
        if (!response.ok) throw new Error('VWORLD_REQUEST_FAILED');
        return response.json();
      })
      .then(function (data) {
        const point = data?.response?.result?.point;
        if (!point) throw new Error('VWORLD_ADDRESS_NOT_FOUND');
        return { lat: Number(point.y), lng: Number(point.x) };
      });
  }

  function bindMapControls(map, mapNode) {
    const typeButtons = document.querySelectorAll('[data-map-type]');
    const cadastralButton = document.getElementById('result-map-cadastral');
    const trafficButton = document.getElementById('result-map-traffic');
    const distanceButton = document.getElementById('result-map-distance');
    const areaButton = document.getElementById('result-map-area');
    const cancelButton = document.getElementById('result-map-measure-cancel');
    const measureGuide = document.getElementById('result-map-measure-guide');
    const measureResult = document.getElementById('result-map-measure-result');
    let cadastralVisible = false;
    let trafficVisible = false;
    let measureMode = '';
    let measurePath = [];
    let measureShape = null;
    let measureDots = [];
    let pointerStart = null;

    typeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const isSkyview = button.dataset.mapType === 'skyview';
        map.setMapTypeId(isSkyview ? window.kakao.maps.MapTypeId.SKYVIEW : window.kakao.maps.MapTypeId.ROADMAP);
        typeButtons.forEach(function (item) {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });

    if (cadastralButton) {
      cadastralButton.addEventListener('click', function () {
        cadastralVisible = !cadastralVisible;
        if (cadastralVisible) map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        else map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        cadastralButton.classList.toggle('is-active', cadastralVisible);
        cadastralButton.setAttribute('aria-pressed', String(cadastralVisible));
        cadastralButton.textContent = '지적도 ' + (cadastralVisible ? 'ON' : 'OFF');
      });
    }

    if (trafficButton) {
      trafficButton.addEventListener('click', function () {
        trafficVisible = !trafficVisible;
        if (trafficVisible) map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
        else map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.TRAFFIC);
        trafficButton.classList.toggle('is-active', trafficVisible);
        trafficButton.setAttribute('aria-pressed', String(trafficVisible));
        trafficButton.textContent = '교통정보 ' + (trafficVisible ? 'ON' : 'OFF');
      });
    }

    if (distanceButton) distanceButton.addEventListener('click', function () { toggleMeasure('distance'); });
    if (areaButton) areaButton.addEventListener('click', function () { toggleMeasure('area'); });
    if (cancelButton) cancelButton.addEventListener('click', resetMeasure);

    mapNode.addEventListener('pointerdown', function (event) {
      pointerStart = { x: event.clientX, y: event.clientY };
    }, true);

    mapNode.addEventListener('pointerup', function (event) {
      if (!measureMode || !pointerStart || event.button !== 0) return;
      const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      pointerStart = null;
      if (moved > 7) return;
      const rect = mapNode.getBoundingClientRect();
      const point = new window.kakao.maps.Point(event.clientX - rect.left, event.clientY - rect.top);
      const position = map.getProjection().coordsFromContainerPoint(point);
      if (!position) return;
      measurePath.push(position);
      addMeasureDot(position);
      drawMeasureShape();
      updateMeasureGuide();
    }, true);

    window.kakao.maps.event.addListener(map, 'rightclick', function () {
      if (!canFinishMeasure()) return;
      finishMeasure(measurePath[measurePath.length - 1]);
    });

    function toggleMeasure(mode) {
      if (measureMode === mode) {
        if (canFinishMeasure()) finishMeasure(measurePath[measurePath.length - 1]);
        else {
          updateMeasureGuide(true);
        }
        return;
      }
      resetMeasure();
      measureMode = mode;
      map.setCursor('crosshair');
      setMeasureButtonState();
    }

    function setMeasureButtonState() {
      if (distanceButton) {
        const active = measureMode === 'distance';
        distanceButton.classList.toggle('is-active', active);
        distanceButton.setAttribute('aria-pressed', String(active));
        distanceButton.textContent = active ? '✓ 완료' : '거리 재기';
        distanceButton.hidden = measureMode === 'area';
      }
      if (areaButton) {
        const active = measureMode === 'area';
        areaButton.classList.toggle('is-active', active);
        areaButton.setAttribute('aria-pressed', String(active));
        areaButton.textContent = active ? '✓ 완료' : '면적 재기';
        areaButton.hidden = measureMode === 'distance';
      }
      if (cancelButton) cancelButton.hidden = !measureMode;
      if (cancelButton && measureMode) {
        const activeButton = measureMode === 'area' ? areaButton : distanceButton;
        if (activeButton) activeButton.insertAdjacentElement('afterend', cancelButton);
      } else if (cancelButton && trafficButton) {
        trafficButton.insertAdjacentElement('afterend', cancelButton);
      }
      if (measureGuide) {
        measureGuide.hidden = !measureMode;
        updateMeasureGuide();
      }
    }

    function updateMeasureGuide(showMinimumWarning) {
      if (!measureGuide || !measureMode) return;
      const count = measurePath.length;
      if (showMinimumWarning) {
        measureGuide.textContent = measureMode === 'area'
          ? '면적 측정은 경계 지점을 3개 이상 선택해야 합니다.'
          : '거리 측정은 경로 지점을 2개 이상 선택해야 합니다.';
        return;
      }
      measureGuide.textContent = measureMode === 'area'
        ? '선택 ' + count + '개 · 경계 지점을 3개 이상 선택한 뒤 “✓ 완료”를 누르세요.'
        : '선택 ' + count + '개 · 경로 지점을 2개 이상 선택한 뒤 “✓ 완료”를 누르세요.';
    }

    function canFinishMeasure() {
      return measureMode === 'area' ? measurePath.length >= 3 : measureMode === 'distance' && measurePath.length >= 2;
    }

    function drawMeasureShape() {
      if (measureShape) measureShape.setMap(null);
      measureShape = null;
      const displayPath = measurePath.slice();
      if (displayPath.length < 2) return;
      const options = {
        map: map,
        path: displayPath,
        strokeWeight: 4,
        strokeColor: '#3182f6',
        strokeOpacity: 0.95,
        strokeStyle: 'solid'
      };
      if (measureMode === 'area' && displayPath.length >= 3) {
        options.fillColor = '#3182f6';
        options.fillOpacity = 0.22;
        measureShape = new window.kakao.maps.Polygon(options);
      } else {
        measureShape = new window.kakao.maps.Polyline(options);
      }
    }

    function addMeasureDot(position) {
      const dot = document.createElement('span');
      dot.className = 'result-map-measure-dot';
      measureDots.push(new window.kakao.maps.CustomOverlay({
        map: map,
        position: position,
        content: dot,
        zIndex: 5,
        xAnchor: 0.5,
        yAnchor: 0.5
      }));
    }

    function finishMeasure(position) {
      const mode = measureMode;
      drawMeasureShape();
      const value = mode === 'area' ? measureShape.getArea() : measureShape.getLength();
      showMeasureResult(mode, value);
      measureMode = '';
      measurePath = [];
      map.setCursor('default');
      setMeasureButtonState();
    }

    function resetMeasure() {
      measureMode = '';
      measurePath = [];
      if (measureShape) measureShape.setMap(null);
      measureDots.forEach(function (dot) { dot.setMap(null); });
      measureShape = null;
      measureDots = [];
      if (measureResult) {
        measureResult.hidden = true;
        measureResult.innerHTML = '';
      }
      map.setCursor('default');
      setMeasureButtonState();
    }

    function formatDistance(metres) {
      if (metres >= 1000) return '총거리 ' + (metres / 1000).toFixed(2) + 'km';
      return '총거리 ' + Math.round(metres).toLocaleString('ko-KR') + 'm';
    }

    function formatArea(squareMetres) {
      return '총면적 ' + Math.round(squareMetres).toLocaleString('ko-KR') + '㎡';
    }

    function showMeasureResult(mode, value) {
      if (!measureResult) return;
      const rounded = Math.round(value).toLocaleString('ko-KR');
      const unit = mode === 'area' ? '㎡' : 'm';
      const label = mode === 'area' ? '측정 면적' : '측정 거리';
      measureResult.innerHTML = '<span>' + label + '</span><strong>' + rounded + ' ' + unit + '</strong><span>(참조용)</span>';
      measureResult.hidden = false;
    }
  }

  function showMessage(text, error) {
    message.textContent = text || '';
    message.hidden = !text;
    message.classList.toggle('error', Boolean(error));
  }
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function possibilityLabel(value) {
    return ({ undetermined: '판정 전', possible: '진행 가능', conditional: '조건부 가능', not_possible: '진행 어려움' })[value] || value || '-';
  }
  function itemStatusLabel(value) {
    return ({ info: '검토', ok: '적합/가능', conditional: '조건부', hold: '추가확인', not_possible: '어려움' })[value] || '검토';
  }
  function siteTypeLabel(value) {
    return ({ land: '토지', building: '건물', mixed: '복합(토지+건물)' })[value] || value || '-';
  }
  function purposeLabel(value) {
    return ({ self_consumption: '자가소비', power_business: '발전사업(매전)', undecided: '미정 / 상담 희망' })[value] || value || '-';
  }
  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }
})(window, document);
