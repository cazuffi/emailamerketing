#!/usr/bin/env node

/**
 * Pre-publish validation for D365 blocks and templates.
 * Run after `npm run build:d365` and before pasting into Insight Hub.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST_D365 = path.join(ROOT, 'dist/d365');
const MANIFEST_PATH = path.join(ROOT, 'd365-manifest.json');

const MAX_BYTES = 1024 * 1024; // 1 MB D365 limit
const DRAFT_PLACEHOLDERS = [
  '{{headline}}',
  '{{subheadline}}',
  '{{body_copy}}',
  '{{cta_text}}',
  '{{email_label}}',
  '{{email_tagline}}',
  '{{offer_text}}',
];

const REQUIRED_FOOTER_TOKENS = ['{{CompanyAddress}}', '{{PreferenceCenter}}'];
const BRAND_COLOR = '#ef7800';

let errorCount = 0;
let warnCount = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errorCount += 1;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
  warnCount += 1;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function readFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
}

function validateFile(filePath, { requireFooter = false, label }) {
  const content = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  const size = Buffer.byteLength(content, 'utf8');

  console.log(`\n${label}: ${name}`);

  if (size > MAX_BYTES) {
    fail(`Exceeds 1 MB limit (${(size / 1024).toFixed(1)} KB)`);
  } else {
    pass(`Size OK (${(size / 1024).toFixed(1)} KB)`);
  }

  if (!content.includes('data-editorblocktype')) {
    warn('No data-editorblocktype attributes — designer editability may be limited');
  } else {
    pass('Contains editable designer blocks');
  }

  if (!content.includes(BRAND_COLOR) && !content.includes('rgb(239, 120, 0)')) {
    warn('Brand orange not detected — verify styles are included');
  }

  for (const token of DRAFT_PLACEHOLDERS) {
    if (content.includes(token)) {
      warn(`Draft placeholder still present: ${token}`);
    }
  }

  if (requireFooter) {
    for (const token of REQUIRED_FOOTER_TOKENS) {
      if (!content.includes(token)) {
        fail(`Missing required compliance token: ${token}`);
      } else {
        pass(`Compliance token present: ${token}`);
      }
    }

    if (!content.includes('WM_footer') && !content.includes('data-lookup-name="WM_footer"')) {
      warn('Footer content block reference not found');
    }
  }

  if (content.includes('border-radius') && content.match(/border-radius:\s*[^0]/)) {
    warn('Non-zero border-radius detected — brand uses square buttons');
  }
}

function validateManifest() {
  console.log('\nManifest');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  for (const block of manifest.contentBlocks) {
    const source = path.join(ROOT, 'components/d365', block.source);
    if (!fs.existsSync(source)) {
      fail(`Manifest block source missing: ${block.source}`);
      continue;
    }
    const built = path.join(DIST_D365, 'blocks', path.basename(block.source));
    if (!fs.existsSync(built)) {
      fail(`Built block missing: ${path.basename(block.source)} — run npm run build:d365`);
    }
  }

  for (const template of manifest.emailTemplates) {
    const source = path.join(ROOT, 'templates/d365', template.source);
    if (!fs.existsSync(source)) {
      fail(`Manifest template source missing: ${template.source}`);
      continue;
    }
    const built = path.join(DIST_D365, 'templates', template.source);
    if (!fs.existsSync(built)) {
      fail(`Built template missing: ${template.source} — run npm run build:d365`);
    }
  }

  if (errorCount === 0) {
    pass(`All ${manifest.contentBlocks.length} blocks and ${manifest.emailTemplates.length} templates accounted for`);
  }
}

function main() {
  console.log('Validating D365 exports...\n');

  if (!fs.existsSync(DIST_D365)) {
    console.error('dist/d365/ not found. Run: npm run build:d365');
    process.exit(1);
  }

  const blockFiles = readFiles(path.join(DIST_D365, 'blocks'));
  const templateFiles = readFiles(path.join(DIST_D365, 'templates'));

  if (blockFiles.length === 0 || templateFiles.length === 0) {
    console.error('No built files in dist/d365/. Run: npm run build:d365');
    process.exit(1);
  }

  for (const file of blockFiles) {
    const isFooter = path.basename(file) === 'wm-footer.html';
    validateFile(file, { requireFooter: isFooter, label: 'Block' });
  }

  for (const file of templateFiles) {
    validateFile(file, { requireFooter: true, label: 'Template' });
  }

  validateManifest();

  console.log('\n---');
  console.log(`Errors: ${errorCount}  Warnings: ${warnCount}`);

  if (errorCount > 0) {
    console.log('\nFix errors before publishing to D365.');
    process.exit(1);
  }

  console.log('\nReady to publish. See docs/d365-publish-guide.md');
  if (warnCount > 0) {
    console.log('Review warnings — they may be acceptable for draft blocks.');
  }
}

main();
