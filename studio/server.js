const path = require('path');
const express = require('express');
const session = require('express-session');
const { loadManifest, buildEmailHtml } = require('../scripts/assemble');
const { requireAuth, mountAuthRoutes } = require('./auth');
const {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require('./db');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

mountAuthRoutes(app);

app.get('/api/modules', requireAuth, (req, res) => {
  const { modules } = loadManifest();
  const categories = [...new Set(modules.map((m) => m.category))];
  res.json({ modules, categories });
});

app.post('/api/build', requireAuth, (req, res) => {
  try {
    const { title = 'Email', modules = [] } = req.body || {};
    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules must be an array' });
    }
    const html = buildEmailHtml({ title, modules });
    res.json({ html });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/campaigns', requireAuth, (req, res) => {
  res.json({ campaigns: listCampaigns() });
});

app.get('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = getCampaign(Number(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  res.json({ campaign });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const { title, modules = [] } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const campaign = createCampaign({ title, modules, userId: req.user.id });
  res.status(201).json({ campaign });
});

app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const { title, modules = [] } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const existing = getCampaign(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const campaign = updateCampaign(Number(req.params.id), {
    title,
    modules,
    userId: req.user.id,
  });
  res.json({ campaign });
});

app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
  const existing = getCampaign(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  deleteCampaign(Number(req.params.id));
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Email Studio running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Login: admin@weidmuller.local / changeme (or set ADMIN_EMAIL / ADMIN_PASSWORD)');
  }
});
