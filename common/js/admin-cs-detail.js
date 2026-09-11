(function (w, d) {
  'use strict';
  var auth = w.TaeDoSAAuth;
  if (!auth) return;
  var id = 0, started = false, currentCall = null;

  w.addEventListener('teadosa:adminready', init, { once: true });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', wait); else wait();
  function wait() {
    var c = d.getElementById('admin-protected-content');
    if (c && !c.hidden) return init();
    w.setTimeout(function () { if (!started) wait(); }, 250);
  }

  async function init() {
    if (started) return;
    started = true;
    id = Number(new URLSearchParams(location.search).get('id'));
    if (!id) return message('올바른 상담 ID가 아닙니다.', true);
    bind();
    await load();
  }

  function bind() {
    d.getElementById('cs-note-show').addEventListener('click', expandNote);
    d.getElementById('cs-note-cancel').addEventListener('click', collapseNote);
    d.getElementById('cs-note-form').addEventListener('submit', submitNote);
    d.getElementById('cs-delete').addEventListener('click', openConfirm);
    d.getElementById('cs-confirm-cancel').addEventListener('click', closeConfirm);
    d.getElementById('cs-confirm-delete').addEventListener('click', doDelete);
    d.getElementById('cs-confirm-overlay').addEventListener('click', function (e) { if (e.target.id === 'cs-confirm-overlay') closeConfirm(); });

    var editForm = d.getElementById('cs-edit-form');
    [['cs-edit-category', 'category'], ['cs-edit-date', 'callDate'], ['cs-edit-phone', 'phone'],
     ['cs-edit-name', 'name'], ['cs-edit-address', 'address'], ['cs-edit-content', 'content'],
     ['cs-edit-channel', 'channel'], ['cs-edit-receiver', 'receiver']].forEach(function (pair) {
      d.getElementById(pair[0]).addEventListener('change', function (e) {
        var patch = {};
        patch[pair[1]] = e.target.value;
        saveField(patch);
      });
    });
    editForm.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  async function load() {
    message('상담내역을 불러오고 있습니다.');
    try {
      var out = await auth.getAdminCsCallDetail(id);
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '상담내역을 불러오지 못했습니다.');
      currentCall = r.call;
      render(r.call, r.notes || []);
      message('');
    } catch (e) {
      message(e.message, true);
    }
  }

  function render(call, notes) {
    if (!d.getElementById('cs-note-author').value) d.getElementById('cs-note-author').value = call.receiver || '';
    d.getElementById('cs-detail-title').textContent = (call.name || '이름 미입력') + ' · ' + phone(call.phone);
    var badge = d.getElementById('cs-detail-status');
    badge.textContent = statusLabel(call.status);
    badge.className = 'status-badge ' + call.status;
    setIfNotFocused('cs-edit-category', call.category);
    setIfNotFocused('cs-edit-date', call.callDate || '');
    setIfNotFocused('cs-edit-phone', call.phone || '');
    setIfNotFocused('cs-edit-name', call.name || '');
    setIfNotFocused('cs-edit-address', call.address || '');
    setIfNotFocused('cs-edit-content', call.content || '');
    setIfNotFocused('cs-edit-channel', call.channel || '');
    setIfNotFocused('cs-edit-receiver', call.receiver || '');
    d.getElementById('cs-note-status').value = call.status;
    renderNotes(notes);
  }

  function setIfNotFocused(fieldId, value) {
    var el = d.getElementById(fieldId);
    if (d.activeElement === el) return;
    el.value = value;
  }

  function renderNotes(notes) {
    var list = d.getElementById('cs-notes-list');
    if (!notes.length) {
      list.innerHTML = '<p class="cs-note-empty">아직 처리 기록이 없습니다.</p>';
      return;
    }
    list.innerHTML = notes.map(function (n) {
      return '<article class="cs-note-item">' +
        '<div class="cs-note-meta">' + esc(datetime(n.createdAt)) + ' · ' + esc(n.author || '-') +
        ' <span class="status-badge ' + esc(n.status) + '">' + esc(statusLabel(n.status)) + '</span></div>' +
        '<p>' + esc(n.note || '').replace(/\n/g, '<br>') + '</p>' +
        '</article>';
    }).join('');
  }

  async function saveField(patch) {
    try {
      var out = await auth.updateCsCall(id, patch);
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '저장하지 못했습니다.');
      message('수정 내용이 저장되었습니다.');
      await load();
    } catch (e) {
      message(e.message || '저장 중 오류가 발생했습니다.', true);
    }
  }

  function expandNote() {
    d.getElementById('cs-note-form').hidden = false;
    d.getElementById('cs-note-show').hidden = true;
    d.getElementById('cs-note-text').focus();
  }
  function collapseNote() {
    d.getElementById('cs-note-form').hidden = true;
    d.getElementById('cs-note-show').hidden = false;
    d.getElementById('cs-note-text').value = '';
    actionMessage('cs-note-message', '');
  }

  async function submitNote(e) {
    e.preventDefault();
    var button = d.getElementById('cs-note-form').querySelector('button[type="submit"]');
    var note = d.getElementById('cs-note-text').value.trim();
    if (!note) return actionMessage('cs-note-message', '처리내용을 입력해 주세요.', true);
    var author = d.getElementById('cs-note-author').value.trim();
    if (!author) return actionMessage('cs-note-message', '담당자(작성자)를 입력해 주세요.', true);
    button.disabled = true;
    actionMessage('cs-note-message', '저장하고 있습니다.');
    try {
      var out = await auth.addCsCallNote(id, { status: d.getElementById('cs-note-status').value, author: author, note: note });
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '기록을 추가하지 못했습니다.');
      collapseNote();
      await load();
    } catch (err) {
      actionMessage('cs-note-message', err.message || '기록 추가 중 오류가 발생했습니다.', true);
    } finally {
      button.disabled = false;
    }
  }

  function openConfirm() { d.getElementById('cs-confirm-overlay').hidden = false; }
  function closeConfirm() { d.getElementById('cs-confirm-overlay').hidden = true; }
  async function doDelete() {
    var button = d.getElementById('cs-confirm-delete');
    button.disabled = true;
    try {
      var out = await auth.deleteCsCall(id);
      var r = out.result || {};
      if (!out.response.ok || !r.success) throw new Error(r.message || '삭제하지 못했습니다.');
      window.location.replace('/admin/cs/');
    } catch (e) {
      closeConfirm();
      message(e.message || '삭제 중 오류가 발생했습니다.', true);
    } finally {
      button.disabled = false;
    }
  }

  function message(t, e) {
    var x = d.getElementById('cs-detail-message');
    x.textContent = t || '';
    x.hidden = !t;
    x.classList.toggle('error', !!e);
  }
  function actionMessage(id2, t, e) {
    var x = d.getElementById(id2);
    x.textContent = t || '';
    x.hidden = !t;
    x.classList.toggle('error', !!e);
  }
  function statusLabel(v) { return ({ waiting: '대기', in_progress: '진행중', done: '완료' })[v] || v; }
  function phone(v) { var x = String(v || '').replace(/\D/g, ''); return x.length === 11 ? x.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : (v || '-'); }
  function datetime(v) { var x = new Date(v); return isNaN(x) ? '-' : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(x); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
})(window, document);
