const state = {
  user: null,
  modules: [],
  categories: [],
  selected: [],
  campaignId: null,
  previewWidth: 640,
  buildTimer: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2800);
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
  state.selected = [];
  state.campaignId = null;
  show('login');
});

// ── Studio init ───────────────────────────────────────

async function initStudio() {
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
  renderLibrary();
  await loadCampaigns();
  scheduleBuild();
}

function renderLibrary(filter = '') {
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
        <div class="module-item-info">
          <div class="module-item-id">${mod.id}</div>
          <div class="module-item-desc">${mod.description}</div>
        </div>
        <button class="module-add-btn" title="Add ${mod.id}">+</button>
      `;
      el.querySelector('.module-add-btn').onclick = (e) => {
        e.stopPropagation();
        addModule(mod.id);
      };
      el.onclick = () => addModule(mod.id);
      group.appendChild(el);
    }
    container.appendChild(group);
  }
}

$('#module-search').addEventListener('input', (e) => renderLibrary(e.target.value));

// ── Composer ──────────────────────────────────────────

function addModule(id) {
  state.selected.push(id);
  renderComposer();
  scheduleBuild();
}

function removeModule(index) {
  state.selected.splice(index, 1);
  renderComposer();
  scheduleBuild();
}

function moveModule(index, dir) {
  const next = index + dir;
  if (next < 0 || next >= state.selected.length) return;
  const [item] = state.selected.splice(index, 1);
  state.selected.splice(next, 0, item);
  renderComposer();
  scheduleBuild();
}

function renderComposer() {
  const list = $('#composer-list');
  const empty = $('#composer-empty');
  $('#module-count').textContent = `${state.selected.length} module${state.selected.length !== 1 ? 's' : ''}`;

  if (!state.selected.length) {
    empty.classList.remove('hidden');
    list.querySelectorAll('.composer-item').forEach((el) => el.remove());
    return;
  }
  empty.classList.add('hidden');

  list.querySelectorAll('.composer-item').forEach((el) => el.remove());

  state.selected.forEach((id, i) => {
    const mod = state.modules.find((m) => m.id === id);
    const el = document.createElement('div');
    el.className = 'composer-item';
    el.draggable = true;
    el.dataset.index = i;
    el.innerHTML = `
      <span class="composer-drag">⠿</span>
      <div class="composer-info">
        <div class="composer-id">${id}</div>
        <div class="composer-cat">${mod?.category || ''}</div>
      </div>
      <div class="composer-actions">
        <button class="btn btn-ghost btn-sm" data-up>▲</button>
        <button class="btn btn-ghost btn-sm" data-down>▼</button>
        <button class="btn btn-ghost btn-sm" data-remove>✕</button>
      </div>
    `;

    el.querySelector('[data-up]').onclick = () => moveModule(i, -1);
    el.querySelector('[data-down]').onclick = () => moveModule(i, 1);
    el.querySelector('[data-remove]').onclick = () => removeModule(i);

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
      const [item] = state.selected.splice(from, 1);
      state.selected.splice(to, 0, item);
      renderComposer();
      scheduleBuild();
    });

    list.appendChild(el);
  });
}

// ── Preview & build ───────────────────────────────────

function scheduleBuild() {
  clearTimeout(state.buildTimer);
  state.buildTimer = setTimeout(buildPreview, 300);
}

async function buildPreview() {
  const frame = $('#preview-frame');
  if (!state.selected.length) {
    frame.srcdoc = '<p style="font-family:sans-serif;padding:24px;color:#666;">Add modules to preview</p>';
    return;
  }
  try {
    const { html } = await api('/api/build', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#email-title').value,
        modules: state.selected,
      }),
    });
    frame.srcdoc = html;
  } catch (ex) {
    frame.srcdoc = `<p style="color:red;padding:24px;font-family:sans-serif;">${ex.message}</p>`;
  }
}

$('#email-title').addEventListener('input', scheduleBuild);

$$('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.toggle-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const w = Number(btn.dataset.width);
    state.previewWidth = w;
    $('#preview-frame').style.width = `${w}px`;
  });
});

// ── Export ────────────────────────────────────────────

$('#btn-export').addEventListener('click', async () => {
  if (!state.selected.length) {
    toast('Add at least one module first');
    return;
  }
  try {
    const { html } = await api('/api/build', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#email-title').value,
        modules: state.selected,
      }),
    });
    await navigator.clipboard.writeText(html);
    toast('HTML copied — paste into D365 → Design → HTML');
  } catch (ex) {
    toast(`Export failed: ${ex.message}`);
  }
});

// ── Campaigns ─────────────────────────────────────────

async function loadCampaigns() {
  const { campaigns } = await api('/api/campaigns');
  const sel = $('#campaign-select');
  sel.innerHTML = '<option value="">— Load campaign —</option>';
  for (const c of campaigns) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.title} (${c.modules.length} modules)`;
    sel.appendChild(opt);
  }
}

$('#campaign-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  if (!id) return;
  const { campaign } = await api(`/api/campaigns/${id}`);
  state.campaignId = campaign.id;
  state.selected = [...campaign.modules];
  $('#email-title').value = campaign.title;
  renderComposer();
  scheduleBuild();
  toast(`Loaded "${campaign.title}"`);
});

$('#btn-save').addEventListener('click', async () => {
  const title = $('#email-title').value.trim() || 'Untitled email';
  const modules = [...state.selected];
  try {
    if (state.campaignId) {
      await api(`/api/campaigns/${state.campaignId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, modules }),
      });
      toast('Campaign saved');
    } else {
      const { campaign } = await api('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ title, modules }),
      });
      state.campaignId = campaign.id;
      toast('Campaign created');
    }
    await loadCampaigns();
    $('#campaign-select').value = state.campaignId;
  } catch (ex) {
    toast(`Save failed: ${ex.message}`);
  }
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
