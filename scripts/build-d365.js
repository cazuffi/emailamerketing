#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const D365_ROOT = path.join(ROOT, 'components/d365');
const TEMPLATES_D365 = path.join(ROOT, 'templates/d365');
const DIST_D365 = path.join(ROOT, 'dist/d365');
const WRAPPED_DIR = path.join(ROOT, 'components/d365-wrapped');

function resolveIncludes(content, baseDir, depth = 0) {
  if (depth > 20) throw new Error('Include depth exceeded');
  return content.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, includePath) => {
    const fullPath = path.join(baseDir, includePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Include not found: ${includePath} (resolved: ${fullPath})`);
    }
    const included = fs.readFileSync(fullPath, 'utf8');
    const includeBase = path.dirname(fullPath);
    return resolveIncludes(included, includeBase, depth + 1);
  });
}

function buildBlocks() {
  const blocksDir = path.join(D365_ROOT, 'blocks');
  const outDir = path.join(DIST_D365, 'blocks');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(WRAPPED_DIR, { recursive: true });

  for (const file of fs.readdirSync(blocksDir)) {
    if (!file.endsWith('.html')) continue;
    const content = fs.readFileSync(path.join(blocksDir, file), 'utf8');
    fs.writeFileSync(path.join(outDir, file), content);

    const mjmlFile = file.replace('.html', '.mjml');
    const wrapped = `<mj-raw>\n<!-- D365 block: ${file} — edit components/d365/blocks/${file} then npm run build:d365 -->\n${content}</mj-raw>\n`;
    fs.writeFileSync(path.join(WRAPPED_DIR, mjmlFile), wrapped);
    console.log(`✓ block ${file} → dist/d365/blocks/ + components/d365-wrapped/${mjmlFile}`);
  }
}

function buildTemplates() {
  const outDir = path.join(DIST_D365, 'templates');
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of fs.readdirSync(TEMPLATES_D365)) {
    if (!file.endsWith('.html')) continue;
    const source = fs.readFileSync(path.join(TEMPLATES_D365, file), 'utf8');
    const assembled = resolveIncludes(source, D365_ROOT);
    fs.writeFileSync(path.join(outDir, file), assembled);
    console.log(`✓ template ${file} → dist/d365/templates/${file}`);
  }
}

function copyManifest() {
  fs.mkdirSync(DIST_D365, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'd365-manifest.json'), path.join(DIST_D365, 'manifest.json'));
  console.log('✓ manifest → dist/d365/manifest.json');
}

function buildDraftEmails() {
  const draftsDir = path.join(ROOT, 'drafts');
  if (!fs.existsSync(draftsDir)) return;

  for (const entry of fs.readdirSync(draftsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sourcePath = path.join(draftsDir, entry.name, 'email.d365.html');
    if (!fs.existsSync(sourcePath)) continue;

    const source = fs.readFileSync(sourcePath, 'utf8');
    const assembled = resolveIncludes(source, path.dirname(sourcePath));
    const outputPath = path.join(draftsDir, entry.name, 'email.html');
    fs.writeFileSync(outputPath, assembled);
    console.log(`✓ draft ${entry.name}/email.d365.html → drafts/${entry.name}/email.html`);
  }
}

function main() {
  const draftsOnly = process.argv.includes('--drafts-only');

  if (draftsOnly) {
    console.log('Building D365 draft emails...\n');
    buildDraftEmails();
    console.log('\nDraft D365 build complete.');
    return;
  }

  console.log('Building D365 blocks and templates...\n');
  buildBlocks();
  buildTemplates();
  copyManifest();
  buildDraftEmails();
  console.log('\nD365 build complete. Import from dist/d365/ — see docs/d365-publish-guide.md');
}

main();
