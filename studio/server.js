const path = require('path');
const fs = require('fs');
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

app.get('/api/brand', requireAuth, (req, res) => {
  const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '../brand/tokens.json'), 'utf8'));
  res.json({
    logo: tokens.images.logo,
    primary: tokens.colors.primary,
  });
});

app.get('/api/modules', requireAuth, (req, res) => {
  const { modules } = loadManifest();
  const categories = [...new Set(modules.map((m) => m.category))];
  res.json({ modules, categories });
});

app.get('/api/modules/:id/preview', requireAuth, (req, res) => {
  try {
    const overrides = req.query.overrides ? JSON.parse(req.query.overrides) : {};
    const annotate = req.query.annotate === '1';
    const previewSample = req.query.previewSample === '1';
    const previewOutlookSim = req.query.previewOutlookSim === '1';
    const instanceUid = req.query.instanceUid || '';
    const instanceIndex = Number(req.query.instanceIndex || 0);
    const html = buildEmailHtml({
      title: 'Module preview',
      modules: [req.params.id],
      overrides: { 0: overrides },
      annotate,
      previewSample,
      previewOutlookSim,
      instanceMeta: [{ uid: instanceUid, index: instanceIndex }],
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
    const {
      title = 'Email',
      modules = [],
      overrides = {},
      annotate = false,
      previewSample = false,
      previewOutlookSim = false,
      instanceMeta = [],
    } = req.body || {};
    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules must be an array' });
    }
    const html = buildEmailHtml({
      title,
      modules,
      overrides,
      annotate,
      previewSample,
      previewOutlookSim,
      instanceMeta,
    });
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
  const { title, modules = [], instances, overrides = {}, status = 'draft' } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const campaign = createCampaign({ title, modules, instances, overrides, status, userId: req.user.id });
  res.status(201).json({ campaign });
});

app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const { title, modules = [], instances, overrides = {}, status } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const existing = getCampaign(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const campaign = updateCampaign(Number(req.params.id), {
    title,
    modules,
    instances,
    overrides,
    status,
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
