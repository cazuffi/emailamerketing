const state = {
  user: null,
  modules: [],
  categories: [],
  instances: [],
  overrides: {},
  editUid: null,
  previewScope: 'full',
  campaignId: null,
  campaignStatus: 'draft',
  savedSnapshot: '',
  previewWidth: 640,
  buildTimer: null,
  hoverModuleId: null,
  hoverTimer: null,
  hoverAbort: null,
  fieldsCache: new Map(),
  thumbObserver: null,
};

const previewCache = new Map();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function newUid() {
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildPayload() {
  return {
    title: $('#email-title').value,
    status: $('#campaign-status').value,
    modules: state.instances.map((i) => i.moduleId),
    instances: state.instances,
    overrides: state.overrides,
    indexOverrides: Object.fromEntries(
      state.instances.map((inst, idx) => [String(idx), state.overrides[inst.uid] || {}]),
    ),
  };
}

function getSnapshot() {
  const p = buildPayload();
  return JSON.stringify({
    title: p.title,
    status: p.status,
    instances: p.instances,
    overrides: p.overrides,
  });
}

function markDirty() {
  const dirty = getSnapshot() !== state.savedSnapshot;
  $('#unsaved-dot').classList.toggle('hidden', !dirty);
  updateProgress();
}

function clearDirty() {
  state.savedSnapshot = getSnapshot();
  $('#unsaved-dot').classList.add('hidden');
}

function updateProgress() {
  const steps = ['compose', 'edit', 'preview', 'export'];
  let active = 'compose';
  const hasModules = state.instances.length > 0;
  const hasEdits = Object.keys(state.overrides).some((k) => Object.keys(state.overrides[k] || {}).length > 0);

  if (hasModules && hasEdits) active = 'edit';
  if (hasModules && hasEdits && state.instances.length >= 2) active = 'preview';
  if (hasModules && ($('#campaign-status').value === 'ready' || hasEdits)) active = 'export';

  const activeIdx = steps.indexOf(active);
  $$('.progress-step').forEach((el, i) => {
    el.classList.toggle('active', steps[i] === active);
    el.classList.toggle('done', i < activeIdx);
  });
}

function updateStatusSelect() {
  const sel = $('#campaign-status');
  sel.dataset.status = sel.value;
}

function updateImagePreview(previewEl, url) {
  const trimmed = (url || '').trim();
  previewEl.innerHTML = '';
  if (!trimmed) {
    const empty = document.createElement('span');
    empty.className = 'image-preview-empty';
    empty.textContent = 'Enter a URL to preview';
    previewEl.appendChild(empty);
    return;
  }
  const img = document.createElement('img');
  img.alt = 'Preview';
  img.loading = 'lazy';
  img.onerror = () => {
    previewEl.innerHTML = '';
    const err = document.createElement('span');
    err.className = 'image-preview-empty';
    err.textContent = 'Could not load image — check URL';
    previewEl.appendChild(err);
  };
  img.src = trimmed;
  previewEl.appendChild(img);
}

async function saveCampaign() {
  const payload = buildPayload();
  const title = payload.title.trim() || 'Untitled email';
  const body = {
    title,
    status: payload.status,
    modules: payload.modules,
    instances: payload.instances,
    overrides: payload.overrides,
  };
  if (state.campaignId) {
    await api(`/api/campaigns/${state.campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    toast('Campaign saved');
  } else {
    const { campaign } = await api('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    state.campaignId = campaign.id;
    toast('Campaign created');
  }
  await loadCampaigns();
  $('#campaign-select').value = state.campaignId;
  clearDirty();
}

async function copyHtmlExport() {
  if (!state.instances.length) {
    toast('Add at least one module first');
    return;
  }
  const payload = buildPayload();
  const { html } = await api('/api/build', {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title,
      modules: payload.modules,
      overrides: payload.indexOverrides,
    }),
  });
  await navigator.clipboard.writeText(html);
  toast('HTML copied — paste into D365 → Design → HTML', 'success');
}

async function loadBrand() {
  try {
    const { logo } = await api('/api/brand');
    $('#topbar-logo').src = logo;
    $('#login-logo').src = logo;
  } catch { /* fallback: hide broken img */ }
}

function initTheme() {
  const saved = localStorage.getItem('studio-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('studio-theme', next);
}

function showOnboardingIfNeeded() {
  if (localStorage.getItem('studio-onboarded')) return;
  $('#onboarding-modal').classList.remove('hidden');
}

function setupThumbnailObserver() {
  if (state.thumbObserver) state.thumbObserver.disconnect();
  state.thumbObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const thumb = entry.target;
      const id = thumb.dataset.moduleId;
      if (!id || thumb.dataset.loaded) return;
      thumb.dataset.loaded = '1';
      loadThumbnail(thumb, id);
    });
  }, { root: $('#module-categories'), rootMargin: '40px' });
}

async function loadThumbnail(thumbEl, moduleId) {
  const iframe = thumbEl.querySelector('iframe');
  const placeholder = thumbEl.querySelector('.module-thumb-placeholder');
  try {
    const html = await fetchModulePreview(moduleId);
    if (iframe) iframe.srcdoc = html;
    if (placeholder) placeholder.classList.add('hidden');
  } catch {
    if (placeholder) placeholder.textContent = 'Preview';
  }
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function show(view) {
  $('#login-view').classList.toggle('hidden', view !== 'login');
  $('#studio-view').classList.toggle('hidden', view !== 'studio');
}

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast visible${type ? ` ${type}` : ''}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    el.classList.remove('visible');
  }, 2800);
}

// ── Auth ──────────────────────────────────────────────

async function checkAuth() {
  try {
    const { user } = await api('/api/auth/me');
    state.user = user;
    show('studio');
    initStudio();
  } catch {
    show('login');
  }
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.classList.add('hidden');
  try {
    const { user } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value,
        password: $('#login-password').value,
      }),
    });
    state.user = user;
    show('studio');
    initStudio();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove('hidden');
  }
});

$('#btn-logout').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  state.user = null;
  state.instances = [];
  state.overrides = {};
  state.editUid = null;
  state.campaignId = null;
  show('login');
});

// ── Studio init ───────────────────────────────────────

async function initStudio() {
  initTheme();
  await loadBrand();

  if (state.user.role === 'editor') {
    document.body.classList.add('editor-mode');
  }

  $('#user-name').textContent = state.user.name;
  if (state.user.role === 'admin' && !document.getElementById('btn-team')) {
    const btn = document.createElement('button');
    btn.id = 'btn-team';
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = 'Team';
    btn.onclick = openAdminModal;
    $('#user-name').after(btn);
  }

  const { modules, categories } = await api('/api/modules');
  state.modules = modules;
  state.categories = categories;
  setupThumbnailObserver();
  renderLibrary();
  await loadCampaigns();
  updateStatusSelect();
  updatePreviewScopeUI();
  clearDirty();
  scheduleBuild();
  showOnboardingIfNeeded();
}

function renderLibrary(filter = '') {
  hideModuleHover();
  const q = filter.toLowerCase();
  const container = $('#module-categories');
  container.innerHTML = '';

  for (const cat of state.categories) {
    const items = state.modules.filter((m) => {
      if (m.category !== cat || m.id === 'footer') return false;
      if (!q) return true;
      return m.id.includes(q) || m.description.toLowerCase().includes(q);
    });
    if (!items.length) continue;

    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<div class="category-label">${cat}</div>`;

    for (const mod of items) {
      const el = document.createElement('div');
      el.className = 'module-item';
      el.innerHTML = `
        <div class="module-item-body">
          <div class="module-thumb" data-module-id="${mod.id}">
            <div class="module-thumb-placeholder">…</div>
            <iframe title="${mod.id} thumbnail" sandbox="allow-same-origin" loading="lazy"></iframe>
          </div>
          <div class="module-item-info">
            <div class="module-item-id">${mod.id}</div>
            <div class="module-item-desc">${mod.description}</div>
          </div>
        </div>
        <button class="module-add-btn" title="Add ${mod.id}">+</button>
      `;
      const thumb = el.querySelector('.module-thumb');
      if (state.thumbObserver) state.thumbObserver.observe(thumb);

      el.querySelector('.module-add-btn').onclick = (e) => {
        e.stopPropagation();
        addModule(mod.id);
      };
      el.onclick = () => addModule(mod.id);
      el.addEventListener('mouseenter', () => scheduleModuleHover(mod, el));
      el.addEventListener('mouseleave', cancelModuleHover);
      group.appendChild(el);
    }
    container.appendChild(group);
  }
}

$('#module-search').addEventListener('input', (e) => renderLibrary(e.target.value));
$('#module-categories').addEventListener('scroll', hideModuleHover, { passive: true });

// ── Module hover preview ──────────────────────────────

function scheduleModuleHover(mod, anchorEl) {
  clearTimeout(state.hoverTimer);
  state.hoverTimer = setTimeout(() => showModuleHover(mod, anchorEl), 280);
}

function cancelModuleHover() {
  clearTimeout(state.hoverTimer);
  hideModuleHover();
}

function hideModuleHover() {
  if (state.hoverAbort) {
    state.hoverAbort.abort();
    state.hoverAbort = null;
  }
  state.hoverModuleId = null;
  $$('.module-item.hover-active').forEach((el) => el.classList.remove('hover-active'));
  const pop = $('#module-hover-preview');
  pop.classList.add('hidden');
  pop.classList.remove('visible');
  pop.setAttribute('aria-hidden', 'true');
}

function positionModuleHover(anchorEl) {
  const pop = $('#module-hover-preview');
  const rect = anchorEl.getBoundingClientRect();
  const popW = 320;
  const popH = 290;
  const gap = 10;

  let left = rect.right + gap;
  if (left + popW > window.innerWidth - 8) {
    left = rect.left - popW - gap;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));

  let top = rect.top;
  top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));

  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

async function fetchModulePreview(id) {
  if (previewCache.has(id)) return previewCache.get(id);

  state.hoverAbort = new AbortController();
  const res = await fetch(`/api/modules/${id}/preview`, {
    credentials: 'same-origin',
    signal: state.hoverAbort.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  previewCache.set(id, data.html);
  return data.html;
}

async function showModuleHover(mod, anchorEl) {
  if (state.hoverModuleId === mod.id) return;

  if (state.hoverAbort) state.hoverAbort.abort();
  state.hoverModuleId = mod.id;

  $$('.module-item.hover-active').forEach((el) => el.classList.remove('hover-active'));
  anchorEl.classList.add('hover-active');

  const pop = $('#module-hover-preview');
  const frame = $('#module-hover-frame');
  const loading = $('#hover-loading');

  $('#hover-module-id').textContent = mod.id;
  $('#hover-module-desc').textContent = mod.description;
  positionModuleHover(anchorEl);
  pop.classList.remove('hidden');
  pop.classList.add('visible');
  pop.setAttribute('aria-hidden', 'false');

  if (previewCache.has(mod.id)) {
    loading.classList.add('hidden');
    frame.srcdoc = previewCache.get(mod.id);
    return;
  }

  loading.classList.remove('hidden');
  frame.srcdoc = '';

  try {
    const html = await fetchModulePreview(mod.id);
    if (state.hoverModuleId !== mod.id) return;
    frame.srcdoc = html;
    loading.classList.add('hidden');
  } catch (ex) {
    if (ex.name === 'AbortError') return;
    if (state.hoverModuleId !== mod.id) return;
    frame.srcdoc = `<p style="font-family:sans-serif;padding:16px;color:#c00;font-size:12px;">${ex.message}</p>`;
    loading.classList.add('hidden');
  }
}

// ── Composer ──────────────────────────────────────────

function addModule(moduleId) {
  const uid = newUid();
  state.instances.push({ uid, moduleId });
  state.editUid = uid;
  state.previewScope = 'module';
  renderComposer();
  updatePreviewScopeUI();
  switchPanel('preview');
  scheduleBuild();
  markDirty();
}

function removeModule(index) {
  const [removed] = state.instances.splice(index, 1);
  delete state.overrides[removed.uid];
  if (state.editUid === removed.uid) {
    state.editUid = state.instances[0]?.uid || null;
    if (!state.editUid) {
      state.previewScope = 'full';
      clearEditForm();
    } else {
      const editTab = $('#edit-tab');
      if (editTab && !editTab.classList.contains('hidden')) {
        loadEditForm(state.editUid);
      }
    }
  }
  updatePreviewScopeUI();
  renderComposer();
  scheduleBuild();
  markDirty();
}

function moveModule(index, dir) {
  const next = index + dir;
  if (next < 0 || next >= state.instances.length) return;
  const [item] = state.instances.splice(index, 1);
  state.instances.splice(next, 0, item);
  renderComposer();
  scheduleBuild();
  markDirty();
}

function selectInstance(uid) {
  state.editUid = uid;
  state.previewScope = 'module';
  renderComposer();
  updatePreviewScopeUI();
  switchPanel('preview');
  scheduleBuild();
}

function openEditPanel(uid) {
  state.editUid = uid;
  renderComposer();
  loadEditForm(uid);
  switchPanel('edit');
}

function renderComposer() {
  const list = $('#composer-list');
  const empty = $('#composer-empty');
  $('#module-count').textContent = `${state.instances.length} module${state.instances.length !== 1 ? 's' : ''}`;

  if (!state.instances.length) {
    empty.classList.remove('hidden');
    list.querySelectorAll('.composer-item').forEach((el) => el.remove());
    clearEditForm();
    return;
  }
  empty.classList.add('hidden');
  list.querySelectorAll('.composer-item').forEach((el) => el.remove());

  state.instances.forEach((inst, i) => {
    const mod = state.modules.find((m) => m.id === inst.moduleId);
    const hasEdits = state.overrides[inst.uid] && Object.keys(state.overrides[inst.uid]).length > 0;
    const el = document.createElement('div');
    el.className = `composer-item${state.editUid === inst.uid ? ' selected' : ''}`;
    el.draggable = true;
    el.dataset.index = i;
    el.innerHTML = `
      <span class="composer-index">${i + 1}</span>
      <span class="composer-drag">⠿</span>
      <div class="composer-info">
        <div class="composer-id">${inst.moduleId}${hasEdits ? '<span class="composer-edited">edited</span>' : ''}</div>
        <div class="composer-cat">${mod?.category || ''}</div>
      </div>
      <div class="composer-actions">
        <button class="btn btn-ghost btn-sm" data-preview title="Preview">◎</button>
        <button class="btn btn-ghost btn-sm" data-edit title="Edit">✎</button>
        <button class="btn btn-ghost btn-sm" data-up>▲</button>
        <button class="btn btn-ghost btn-sm" data-down>▼</button>
        <button class="btn btn-ghost btn-sm" data-remove>✕</button>
      </div>
    `;

    el.querySelector('[data-preview]').onclick = (e) => { e.stopPropagation(); selectInstance(inst.uid); };
    el.querySelector('[data-edit]').onclick = (e) => { e.stopPropagation(); openEditPanel(inst.uid); };
    el.querySelector('[data-up]').onclick = (e) => { e.stopPropagation(); moveModule(i, -1); };
    el.querySelector('[data-down]').onclick = (e) => { e.stopPropagation(); moveModule(i, 1); };
    el.querySelector('[data-remove]').onclick = (e) => { e.stopPropagation(); removeModule(i); };
    el.querySelector('.composer-info').onclick = () => selectInstance(inst.uid);

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = i;
      if (from === to) return;
      const [item] = state.instances.splice(from, 1);
      state.instances.splice(to, 0, item);
      renderComposer();
      scheduleBuild();
      markDirty();
    });

    list.appendChild(el);
  });
}

// ── Edit panel ────────────────────────────────────────

function switchPanel(name) {
  $$('.panel-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.panel === name);
  });
  $('#preview-tab').classList.toggle('hidden', name !== 'preview');
  $('#edit-tab').classList.toggle('hidden', name !== 'edit');
  $('#preview-controls').classList.toggle('hidden', name !== 'preview');

  if (name === 'edit' && state.editUid) {
    loadEditForm(state.editUid);
  }
  if (name === 'preview') {
    scheduleBuild();
  }
}

function updatePreviewScopeUI() {
  const hasSelection = Boolean(state.editUid);
  const moduleBtn = $('#scope-module-btn');
  moduleBtn.disabled = !hasSelection;
  moduleBtn.title = hasSelection ? 'Preview selected module only' : 'Select a module first';

  if (!hasSelection && state.previewScope === 'module') {
    state.previewScope = 'full';
  }

  $$('.scope-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scope === state.previewScope);
  });

  const ctx = $('#preview-context');
  if (state.previewScope === 'module' && state.editUid) {
    const inst = state.instances.find((i) => i.uid === state.editUid);
    ctx.textContent = inst ? `Module: ${inst.moduleId}` : 'This module';
  } else {
    ctx.textContent = 'Full email';
  }
}

$$('.scope-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    state.previewScope = btn.dataset.scope;
    updatePreviewScopeUI();
    scheduleBuild();
  });
});

$$('.panel-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
});

function clearEditForm() {
  state.editUid = null;
  $('#edit-empty').classList.remove('hidden');
  $('#edit-form-wrap').classList.add('hidden');
  $('#edit-form').innerHTML = '';
}

async function loadEditForm(uid) {
  const inst = state.instances.find((i) => i.uid === uid);
  if (!inst) {
    clearEditForm();
    return;
  }

  $('#edit-empty').classList.add('hidden');
  $('#edit-form-wrap').classList.remove('hidden');
  $('#edit-module-id').textContent = inst.moduleId;

  let fields;
  if (state.fieldsCache.has(inst.moduleId)) {
    fields = state.fieldsCache.get(inst.moduleId);
  } else {
    const data = await api(`/api/modules/${inst.moduleId}/fields`);
    fields = data.fields;
    state.fieldsCache.set(inst.moduleId, fields);
  }

  const current = state.overrides[uid] || {};
  const form = $('#edit-form');
  form.innerHTML = '';

  if (!fields.length) {
    form.innerHTML = '<p class="muted">No editable fields detected for this module.</p>';
    return;
  }

  for (const field of fields) {
    const value = Object.prototype.hasOwnProperty.call(current, field.key)
      ? current[field.key]
      : field.value;

    const wrap = document.createElement('div');
    wrap.className = 'edit-field';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.setAttribute('for', `field-${field.key}`);

    let input;
    if (field.multiline) {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = field.type.includes('href') || field.type === 'image-src' ? 'url' : 'text';
    }
    input.id = `field-${field.key}`;
    input.dataset.key = field.key;
    input.value = value;

    input.addEventListener('input', () => {
      if (!state.overrides[uid]) state.overrides[uid] = {};
      state.overrides[uid][field.key] = input.value;
      renderComposer();
      scheduleBuild();
      markDirty();
      if (field.type === 'image-src') {
        const preview = wrap.querySelector('.image-preview');
        if (preview) updateImagePreview(preview, input.value);
      }
      if (state.previewScope === 'module' && state.editUid === uid) {
        scheduleBuild();
      }
    });

    wrap.appendChild(label);
    wrap.appendChild(input);

    if (field.type === 'image-src') {
      const hint = document.createElement('div');
      hint.className = 'edit-field-hint';
      hint.textContent = 'Paste a D365 CDN image URL (assets-eur.mkt.dynamics.com)';
      wrap.appendChild(hint);

      const preview = document.createElement('div');
      preview.className = 'image-preview';
      updateImagePreview(preview, value);
      wrap.appendChild(preview);
    }

    form.appendChild(wrap);
  }
}

$('#btn-reset-module').addEventListener('click', () => {
  if (!state.editUid) return;
  delete state.overrides[state.editUid];
  renderComposer();
  loadEditForm(state.editUid);
  scheduleBuild();
  markDirty();
  if (state.previewScope === 'module') scheduleBuild();
  toast('Module reset to defaults');
});

// ── Preview & build ───────────────────────────────────

function scheduleBuild() {
  clearTimeout(state.buildTimer);
  state.buildTimer = setTimeout(buildPreview, 300);
}

async function buildPreview() {
  const frame = $('#preview-frame');
  const loading = $('#preview-loading');
  if (!state.instances.length) {
    loading.classList.add('hidden');
    frame.srcdoc = '<p style="font-family:sans-serif;padding:24px;color:#666;">Add modules to preview</p>';
    updatePreviewScopeUI();
    return;
  }

  const showModuleOnly = state.previewScope === 'module' && state.editUid;
  const inst = showModuleOnly ? state.instances.find((i) => i.uid === state.editUid) : null;

  if (showModuleOnly && !inst) {
    state.previewScope = 'full';
    updatePreviewScopeUI();
  }

  loading.classList.remove('hidden');
  try {
    let html;
    if (showModuleOnly && inst) {
      const overrides = state.overrides[inst.uid] || {};
      const qs = Object.keys(overrides).length
        ? `?overrides=${encodeURIComponent(JSON.stringify(overrides))}`
        : '';
      const data = await api(`/api/modules/${inst.moduleId}/preview${qs}`);
      html = data.html;
    } else {
      const payload = buildPayload();
      const { html: fullHtml } = await api('/api/build', {
        method: 'POST',
        body: JSON.stringify({
          title: payload.title,
          modules: payload.modules,
          overrides: payload.indexOverrides,
        }),
      });
      html = fullHtml;
    }
    frame.srcdoc = html;
    updatePreviewScopeUI();
  } catch (ex) {
    frame.srcdoc = `<p style="color:red;padding:24px;font-family:sans-serif;">${ex.message}</p>`;
  } finally {
    loading.classList.add('hidden');
  }
}

$('#email-title').addEventListener('input', () => {
  scheduleBuild();
  markDirty();
});

$('#campaign-status').addEventListener('change', () => {
  updateStatusSelect();
  markDirty();
});

$('#btn-theme').addEventListener('click', toggleTheme);

$('#btn-onboarding-close').addEventListener('click', () => {
  localStorage.setItem('studio-onboarded', '1');
  $('#onboarding-modal').classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (!$('#studio-view') || $('#studio-view').classList.contains('hidden')) return;
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCampaign().catch((ex) => toast(`Save failed: ${ex.message}`));
  }
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
    copyHtmlExport().catch((ex) => toast(`Export failed: ${ex.message}`));
  }
});

$$('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.toggle-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const w = Number(btn.dataset.width);
    state.previewWidth = w;
    const frame = $('#device-frame');
    const label = $('#device-label');
    if (w <= 375) {
      frame.classList.remove('device-desktop');
      frame.classList.add('device-mobile');
      label.textContent = '375px';
    } else {
      frame.classList.remove('device-mobile');
      frame.classList.add('device-desktop');
      label.textContent = '640px';
    }
  });
});

// ── Export ────────────────────────────────────────────

$('#btn-export').addEventListener('click', () => {
  copyHtmlExport().catch((ex) => toast(`Export failed: ${ex.message}`));
});

// ── Campaigns ─────────────────────────────────────────

async function loadCampaigns() {
  const { campaigns } = await api('/api/campaigns');
  const sel = $('#campaign-select');
  sel.innerHTML = '<option value="">Load campaign…</option>';
  const statusLabel = { draft: 'Draft', ready: 'Ready', sent: 'Sent' };
  for (const c of campaigns) {
    const opt = document.createElement('option');
    opt.value = c.id;
    const count = c.instances?.length || c.modules.length;
    const status = statusLabel[c.status] || 'Draft';
    opt.textContent = `${c.title} · ${status} (${count} modules)`;
    sel.appendChild(opt);
  }
}

$('#campaign-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  if (!id) return;
  const { campaign } = await api(`/api/campaigns/${id}`);
  state.campaignId = campaign.id;
  state.instances = campaign.instances?.length
    ? [...campaign.instances]
    : campaign.modules.map((moduleId, i) => ({ uid: `legacy-${i}`, moduleId }));
  state.overrides = { ...(campaign.overrides || {}) };
  state.editUid = null;
  state.previewScope = 'full';
  $('#email-title').value = campaign.title;
  $('#campaign-status').value = campaign.status || 'draft';
  updateStatusSelect();
  updatePreviewScopeUI();
  renderComposer();
  clearEditForm();
  switchPanel('preview');
  scheduleBuild();
  clearDirty();
  updateProgress();
  toast(`Loaded "${campaign.title}"`);
});

$('#btn-save').addEventListener('click', () => {
  saveCampaign().catch((ex) => toast(`Save failed: ${ex.message}`));
});

// ── Admin modal ───────────────────────────────────────

async function openAdminModal() {
  $('#admin-modal').classList.remove('hidden');
  await refreshUsers();
}

async function refreshUsers() {
  const { users } = await api('/api/users');
  const list = $('#users-list');
  list.innerHTML = users.map((u) => `
    <div class="user-row">
      <span>${u.name} <span class="muted">(${u.email})</span></span>
      <span class="badge">${u.role}</span>
    </div>
  `).join('');
}

$('#invite-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#invite-name').value,
        email: $('#invite-email').value,
        password: $('#invite-password').value,
      }),
    });
    $('#invite-name').value = '';
    $('#invite-email').value = '';
    $('#invite-password').value = '';
    toast('User added');
    await refreshUsers();
  } catch (ex) {
    toast(ex.message);
  }
});

$('#btn-close-admin').addEventListener('click', () => {
  $('#admin-modal').classList.add('hidden');
});

// ── Boot ──────────────────────────────────────────────

checkAuth();
