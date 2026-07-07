#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const chokidar = require('chokidar');
const mjml2html = require('mjml');

const ROOT = path.join(__dirname, '..');
const PREVIEW_FILE = path.join(ROOT, '.preview.html');
const PORT = 3456;

const TEMPLATE_MAP = {
  newsletter: 'templates/newsletter/weekly-update.mjml',
  promo: 'templates/promo/product-launch.mjml',
  welcome: 'templates/transactional/welcome.mjml',
};

function findDefaultFile() {
  const draftsDir = path.join(ROOT, 'drafts');
  if (fs.existsSync(draftsDir)) {
    for (const entry of fs.readdirSync(draftsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const emailPath = path.join(draftsDir, entry.name, 'email.mjml');
        if (fs.existsSync(emailPath)) return emailPath;
      }
    }
  }
  return path.join(ROOT, TEMPLATE_MAP.newsletter);
}

function resolveInput(arg) {
  if (!arg) return findDefaultFile();

  const candidates = [
    path.resolve(ROOT, arg),
    path.resolve(ROOT, arg, 'email.mjml'),
    path.join(ROOT, 'drafts', arg, 'email.mjml'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  console.error(`File not found: ${arg}`);
  console.error('\nUsage: npm run preview -- [path-to/email.mjml | draft-folder-name]');
  process.exit(1);
}

function compile(inputPath) {
  const source = fs.readFileSync(inputPath, 'utf8');
  const result = mjml2html(source, {
    filePath: inputPath,
    validationLevel: 'soft',
  });

  if (result.errors.length > 0) {
    console.warn('MJML warnings:');
    for (const err of result.errors) {
      console.warn(`  - ${err.formattedMessage || err.message}`);
    }
  }

  const wrapper = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Preview</title>
  <style>
    body { margin: 0; padding: 24px; background: #e5e7eb; font-family: system-ui, sans-serif; }
    .bar { max-width: 640px; margin: 0 auto 12px; padding: 8px 12px; background: #111827; color: #fff; font-size: 13px; border-radius: 6px; }
    .frame { max-width: 640px; margin: 0 auto; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,.12); }
  </style>
</head>
<body>
  <div class="bar">Previewing: ${path.relative(ROOT, inputPath)} — saves on change</div>
  <div class="frame">${result.html}</div>
</body>
</html>`;

  fs.writeFileSync(PREVIEW_FILE, wrapper);
  return result.html;
}

function openBrowser(url) {
  try {
  if (process.platform === 'darwin') {
    execSync(`open "${url}"`);
  } else if (process.platform === 'win32') {
    execSync(`start "" "${url}"`);
  } else {
    execSync(`xdg-open "${url}"`);
  }
  } catch {
    console.log(`Open in browser: ${url}`);
  }
}

function startServer() {
  const server = http.createServer((_req, res) => {
    const html = fs.readFileSync(PREVIEW_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Preview server: ${url}`);
    openBrowser(url);
  });

  return server;
}

function main() {
  const inputPath = resolveInput(process.argv[2]);
  console.log(`Previewing ${path.relative(ROOT, inputPath)}`);

  compile(inputPath);
  startServer();

  const watchPaths = [
    inputPath,
    path.join(ROOT, 'components'),
    path.dirname(inputPath),
  ];

  chokidar.watch(watchPaths).on('change', (changed) => {
    console.log(`Changed: ${path.relative(ROOT, changed)}`);
    compile(inputPath);
  });
}

main();
