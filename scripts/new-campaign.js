#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { CAMPAIGNS_DIR, findCampaignFolder } = require('./lib');

const ROOT = path.join(__dirname, '..');
const SHELL = path.join(ROOT, 'templates/_campaign-shell.html');

function usage() {
  console.log('Create a new campaign with the D365 shell already in place.\n');
  console.log('Usage: npm run new -- <slug>\n');
  console.log('Example:');
  console.log('  npm run new -- july-promo');
  console.log('  → campaigns/2026-07-july-promo/source.html\n');
  console.log('Then add modules:');
  console.log('  npm run add -- july-promo hero-split icon-grid-four');
}

function main() {
  const slug = process.argv[2];
  if (!slug) {
    usage();
    process.exit(1);
  }

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const month = new Date().toISOString().slice(0, 7);
  const folder = `${month}-${safeSlug}`;
  const campaignDir = path.join(CAMPAIGNS_DIR, folder);

  if (fs.existsSync(campaignDir)) {
    console.error(`Campaign already exists: campaigns/${folder}`);
    process.exit(1);
  }

  fs.mkdirSync(campaignDir, { recursive: true });
  fs.copyFileSync(SHELL, path.join(campaignDir, 'source.html'));

  fs.writeFileSync(path.join(campaignDir, 'notes.md'), `# ${folder}

## Quick workflow

1. Browse modules: \`npm run preview -- catalog\`
2. Add modules: \`npm run add -- ${safeSlug} <module-id> <module-id>\`
3. Build: \`npm run build\`
4. Preview: \`npm run preview -- ${safeSlug}\`
5. Paste \`email.html\` into D365 → Design → HTML

## Checklist

- [ ] Modules added and copy updated
- [ ] Images replaced
- [ ] CTA links updated
- [ ] D365 Preview and Test (desktop + mobile)
`);

  fs.writeFileSync(path.join(campaignDir, 'subject-lines.md'), `# Subject lines\n\n- \n`);

  console.log(`✓ Created campaigns/${folder}/`);
  console.log(`  source.html  — shell ready (head, styles, wrapper, footer)`);
  console.log(`\nNext:`);
  console.log(`  npm run add -- ${safeSlug} hero-split cta-primary-center`);
  console.log(`  npm run build`);
  console.log(`  npm run preview -- ${safeSlug}`);
}

main();
