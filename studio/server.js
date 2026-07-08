const path = require('path');
const express = require('express');
const session = require('express-session');
const { loadManifest, buildEmailHtml } = require('../scripts/assemble');
const { extractFields } = require('../scripts/module-fields');
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

app.get('/api/modules/:id/preview', requireAuth, (req, res) => {
  try {
    const overrides = req.query.overrides ? JSON.parse(req.query.overrides) : {};
    const html = buildEmailHtml({
      title: 'Module preview',
      modules: [req.params.id],
      overrides: { 0: overrides },
    });
    res.json({ html, id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/modules/:id/fields', requireAuth, (req, res) => {
  try {
    const fields = extractFields(req.params.id);
    res.json({ id: req.params.id, fields });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/build', requireAuth, (req, res) => {
  try {
    const { title = 'Email', modules = [], overrides = {} } = req.body || {};
    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules must be an array' });
    }
    const html = buildEmailHtml({ title, modules, overrides });
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
  const { title, modules = [], instances, overrides = {} } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const campaign = createCampaign({ title, modules, instances, overrides, userId: req.user.id });
  res.status(201).json({ campaign });
});

app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const { title, modules = [], instances, overrides = {} } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const existing = getCampaign(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const campaign = updateCampaign(Number(req.params.id), {
    title,
    modules,
    instances,
    overrides,
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

const server = app.listen(PORT, () => {
  console.log(`Email Studio running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Login: admin@weidmuller.local / changeme (or set ADMIN_EMAIL / ADMIN_PASSWORD)');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Either:`);
    console.error(`  1. Stop the other process:  npx kill-port ${PORT}`);
    console.error(`     or:  lsof -ti:${PORT} | xargs kill -9`);
    console.error(`  2. Use a different port:  PORT=3001 npm run studio\n`);
    process.exit(1);
  }
  throw err;
});
