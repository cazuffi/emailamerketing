#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const chokidar = require('chokidar');

const ROOT = path.join(__dirname, '..');

function findCampaignEmail(campaignSlug) {
  const campaignsDir = path.join(ROOT, 'campaigns');
  if (!fs.existsSync(campaignsDir)) return null;

  const folders = fs.readdirSync(campaignsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (!campaignSlug) {
    const match = folders.sort().reverse().find((f) =>
      fs.existsSync(path.join(campaignsDir, f, 'email.html'))
    );
    return match ? path.join(campaignsDir, match, 'email.html') : null;
  }

  const folder = folders.find((f) => f.includes(campaignSlug));
  return folder ? path.join(campaignsDir, folder, 'email.html') : null;
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? `open "${url}"`
    : process.platform === 'win32' ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd);
}

function resolveEmailPath(target) {
  if (!target || target === 'catalog' || target === 'module-catalog') {
    const catalog = path.join(ROOT, 'dist/templates/module-catalog.html');
    if (fs.existsSync(catalog)) return catalog;
  }

  if (target === 'long-form' || target === 'long-form-promo') {
    const longForm = path.join(ROOT, 'dist/templates/long-form-promo.html');
    if (fs.existsSync(longForm)) return longForm;
  }

  const campaignPath = findCampaignEmail(target);
  if (campaignPath) return campaignPath;

  return null;
}

function main() {
  const target = process.argv[2];
  const emailPath = resolveEmailPath(target);

  if (!emailPath || !fs.existsSync(emailPath)) {
    console.error('Run npm run build first.');
    console.error('Usage: npm run preview -- [campaign-slug | catalog | long-form]');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/email.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(emailPath, 'utf8'));
      return;
    }
    res.writeHead(404).end('Not found');
  });

  const port = 4173;
  server.listen(port, () => {
    const url = `http://localhost:${port}/email.html`;
    console.log(`Preview: ${url}`);
    console.log(`Source:  ${path.relative(ROOT, emailPath)}`);
    console.log('Watching for changes... (Ctrl+C to stop)\n');
    openBrowser(url);
  });

  const watchPaths = [
    path.join(ROOT, 'components'),
    path.join(ROOT, 'campaigns'),
    path.join(ROOT, 'templates'),
    path.join(ROOT, 'brand'),
  ];

  let building = false;
  chokidar.watch(watchPaths, { ignoreInitial: true }).on('all', () => {
    if (building) return;
    building = true;
    exec('node scripts/build.js', { cwd: ROOT }, (err) => {
      building = false;
      if (err) {
        console.error('Build failed:', err.message);
        return;
      }
      console.log('Rebuilt — refresh browser');
    });
  });
}

main();
