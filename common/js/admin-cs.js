(function (w, d) {
  'use strict';
  var auth = w.TaeDoSAAuth;
  if (!auth) return;
  var state = { page: 1, totalPages: 1 };

  w.addEventListener('teadosa:adminready', init, { once: true });

  function init() {
    bind();
    var q = new URLSearchParams(location.search);
    d.getElementById('cs-search').value = q.get('search') || '';
    d.getElementById('cs-category-filter').value = q.get('category') || '';
    d.getElementById('cs-status-filter').value = q.get('status') || '';
    state.page = Number(q.get('page')) || 1;
    d.getElementById('cs-new-date').value = todayStr();
    load();
  }

  function bind() {
    d.getElementById('cs-search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      state.page = 1;
      load();
    });
    d.getElementById('cs-reset-filter').addEventListener('click', function () {
      d.getElementById('cs-search').value = '';
      d.getElementById('cs-category-filter').value = '';
      d.getElementById('cs-status-filter').value = '';
      state.page = 1;
      load();
    });
    d.getElementById('refresh-cs').addEventListener('click', load);
    d.getElementById('cs-previous-page').addEventListener('click', function () { if (state.page > 1) { state.page--; load(); } });
    d.getElementById('cs-next-page').addEventListener('click', function () { if (state.page < state.totalPages) { state.page++; load(); } });

    d.getElementById('open-cs-create').addEventListener('click', openCreate);
    d.getElementById('cs-create-close').addEventListener('click', closeCreate);
    d.getElementById('cs-create-cancel').addEventListener('click', closeCreate);
    d.getElementById('cs-create-modal').addEventListener('click', function (e) { if (e.target.id === 'cs-create-modal') closeCreate(); });
    d.getElementById('cs-create-form').addEventListener('submit', submitCreate);
  }

  async function load() {
    message('상담목록을 불러오고 있습니다.');
    try {
      var search = d.getElementById('cs-search').value.trim();
      var category = d.getElementById('cs-category-filter').value;
      var status = d.getElementById('cs-status-filter').value;
      var out = await auth.getAdminCsCalls({ search: search, category: category, status: status, page: state.page, pageSize: 30 });
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '목록을 불러오지 못했습니다.');
      render(r.calls || []);
      summary(r.summary || {});
      state.totalPages = (r.pagination && r.pagination.totalPages) || 1;
      d.getElementById('cs-page-status').textContent = state.page + ' / ' + state.totalPages;
      d.getElementById('cs-previous-page').disabled = state.page <= 1;
      d.getElementById('cs-next-page').disabled = state.page >= state.totalPages;
      history.replaceState(null, '', '/admin/cs/?' + new URLSearchParams({ search: search, category: category, status: status, page: state.page }).toString());
      message('');
    } catch (e) {
      message(e.message, true);
    }
  }

  function render(items) {
    d.getElementById('cs-table-body').innerHTML = items.length ? items.map(function (x) {
      return '<tr>' +
        '<td class="cs-cell-date">' + esc(date(x.callDate)) + '</td>' +
        '<td><span class="category-chip ' + esc(x.category) + '">' + esc(categoryLabel(x.category)) + '</span></td>' +
        '<td><strong>' + esc(x.name || '-') + '</strong></td>' +
        '<td class="cs-cell-phone">' + esc(phone(x.phone)) + '</td>' +
        '<td class="cs-cell-clamp" title="' + esc(x.content || '') + '">' + esc(x.content || '') + '</td>' +
        '<td>' + esc(x.channel || '-') + '</td>' +
        '<td>' + esc(x.receiver || '-') + '</td>' +
        '<td><span class="status-badge ' + esc(x.status) + '">' + esc(statusLabel(x.status)) + '</span></td>' +
        '<td class="cs-cell-clamp" title="' + esc(x.lastNote || '') + '">' + esc(x.lastNote || '') + '</td>' +
        '<td><a class="admin-table-link" href="/admin/cs/detail/?id=' + encodeURIComponent(x.id) + '">상세관리</a></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="10" class="empty-row">상담내역이 없습니다.</td></tr>';
  }

  function summary(s) {
    var by = s.byStatus || {};
    set('cs-total-count', s.total);
    set('cs-waiting-count', by.waiting);
    set('cs-progress-count', by.in_progress);
    set('cs-done-count', by.done);
  }

  function openCreate() {
    d.getElementById('cs-create-form').reset();
    d.getElementById('cs-new-date').value = todayStr();
    d.getElementById('cs-new-category').value = d.getElementById('cs-category-filter').value || 'homepage';
    actionMessage('cs-create-message', '');
    d.getElementById('cs-create-modal').hidden = false;
  }
  function closeCreate() { d.getElementById('cs-create-modal').hidden = true; }

  async function submitCreate(e) {
    e.preventDefault();
    var button = d.getElementById('cs-create-form').querySelector('button[type="submit"]');
    button.disabled = true;
    actionMessage('cs-create-message', '등록하고 있습니다.');
    try {
      var payload = {
        category: d.getElementById('cs-new-category').value,
        callDate: d.getElementById('cs-new-date').value,
        phone: d.getElementById('cs-new-phone').value.trim(),
        name: d.getElementById('cs-new-name').value.trim(),
        address: d.getElementById('cs-new-address').value.trim(),
        content: d.getElementById('cs-new-content').value.trim(),
        channel: d.getElementById('cs-new-channel').value.trim(),
        receiver: d.getElementById('cs-new-receiver').value.trim(),
        status: d.getElementById('cs-new-status').value,
        firstNote: d.getElementById('cs-new-first-note').value.trim(),
        firstNoteAuthor: d.getElementById('cs-new-receiver').value.trim()
      };
      var out = await auth.createCsCall(payload);
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '등록하지 못했습니다.');
      closeCreate();
      state.page = 1;
      await load();
    } catch (err) {
      actionMessage('cs-create-message', err.message || '등록 중 오류가 발생했습니다.', true);
    } finally {
      button.disabled = false;
    }
  }

  function message(t, e) {
    var x = d.getElementById('cs-list-message');
    x.textContent = t || '';
    x.hidden = !t;
    x.classList.toggle('error', !!e);
  }
  function actionMessage(id, t, e) {
    var x = d.getElementById(id);
    x.textContent = t || '';
    x.hidden = !t;
    x.classList.toggle('error', !!e);
  }
  function set(id, v) { d.getElementById(id).textContent = Number(v || 0).toLocaleString('ko-KR'); }
  function categoryLabel(v) { return ({ homepage: '홈페이지', taedo: '태투사', eightsolar: '에잇솔라' })[v] || v; }
  function statusLabel(v) { return ({ waiting: '대기', in_progress: '진행중', done: '완료' })[v] || v; }
  function phone(v) { var x = String(v || '').replace(/\D/g, ''); return x.length === 11 ? x.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : (v || '-'); }
  function date(v) { return v ? String(v).replace(/-/g, '.') : '-'; }
  function todayStr() { var d2 = new Date(); return d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0'); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
})(window, document);
