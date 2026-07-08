#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'components/modules/manifest.json');
const OUT = path.join(ROOT, 'templates/module-catalog.html');

function main() {
  const { modules } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const includes = modules.map((mod) => {
    return [
      `<div class="catalog-label" style="background-color:#e8e8e8;padding:6px 24px;font-family:Arial,monospace;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;">${mod.id} — ${mod.description}</div>`,
      `<!-- @include ../components/modules/${mod.file} -->`,
    ].join('\n');
  }).join('\n\n');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<title>Module Catalog — Weidmüller Email Studio</title>
<!-- @include ../components/_base/head.html -->
</head>
<body dir="ltr">
<!-- @include ../components/_base/body-open.html -->
${includes}
<!-- @include ../components/_base/body-close.html -->
</body>
</html>
`;

  fs.writeFileSync(OUT, html);
  console.log(`✓ generated templates/module-catalog.html (${modules.length} modules)`);
}

main();
