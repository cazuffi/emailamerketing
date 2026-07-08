#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CAMPAIGNS_DIR = path.join(ROOT, 'campaigns');
const SHELL = path.join(ROOT, 'templates/campaign-shell.html');

function findCampaignFolder(slug) {
  if (!fs.existsSync(CAMPAIGNS_DIR)) return null;
  const folders = fs.readdirSync(CAMPAIGNS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  return folders.find((f) => f.includes(slug)) || null;
}

function loadManifest() {
  const manifestPath = path.join(ROOT, 'components/modules/manifest.json');
  const { modules } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const byId = new Map(modules.map((m) => [m.id, m]));
  return { modules, byId };
}

module.exports = { ROOT, CAMPAIGNS_DIR, findCampaignFolder, loadManifest };
