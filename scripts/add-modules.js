#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { findCampaignFolder, loadManifest } = require('./lib');

const MARKER_END = '<!-- MODULES:END -->';
const INCLUDE_PREFIX = '<!-- @include ../../components/modules/';

function usage(modules) {
  console.log('Add modules into a campaign shell without breaking layout or fonts.\n');
  console.log('Usage: npm run add -- <slug> <module-id> [module-id...]\n');
  console.log('Example:');
  console.log('  npm run add -- july-promo hero-split icon-grid-four cta-primary-center\n');
  console.log('Browse modules: npm run preview -- catalog');
  console.log('List all IDs:   npm run list\n');
  if (modules) {
    const byCat = {};
    for (const m of modules) {
      (byCat[m.category] ||= []).push(m.id);
    }
    console.log('Available modules:');
    for (const [cat, ids] of Object.entries(byCat)) {
      console.log(`  ${cat}: ${ids.join(', ')}`);
    }
  }
}

function main() {
  const slug = process.argv[2];
  const moduleIds = process.argv.slice(3);
  const { modules, byId } = loadManifest();

  if (!slug || moduleIds.length === 0) {
    usage(modules);
    process.exit(1);
  }

  const folder = findCampaignFolder(slug);
  if (!folder) {
    console.error(`Campaign not found for slug "${slug}".`);
    console.error('Create one first: npm run new -- <slug>');
    process.exit(1);
  }

  const sourcePath = path.join(__dirname, '..', 'campaigns', folder, 'source.html');
  let source = fs.readFileSync(sourcePath, 'utf8');

  if (!source.includes(MARKER_END)) {
    console.error('source.html is missing <!-- MODULES:END --> marker.');
    console.error('Recreate the campaign with: npm run new -- <slug>');
    process.exit(1);
  }

  const invalid = moduleIds.filter((id) => !byId.has(id));
  if (invalid.length) {
    console.error(`Unknown module(s): ${invalid.join(', ')}`);
    console.error('Run npm run list to see all module IDs.');
    process.exit(1);
  }

  const added = [];
  const skipped = [];

  for (const id of moduleIds) {
    const includeLine = `${INCLUDE_PREFIX}${id}.html -->`;
    if (source.includes(includeLine)) {
      skipped.push(id);
      continue;
    }
    source = source.replace(
      MARKER_END,
      `${includeLine}\n${MARKER_END}`
    );
    added.push(id);
  }

  fs.writeFileSync(sourcePath, source);

  if (added.length) {
    console.log(`✓ Added to campaigns/${folder}/source.html:`);
    added.forEach((id) => console.log(`  • ${id}`));
  }
  if (skipped.length) {
    console.log(`Already present (skipped): ${skipped.join(', ')}`);
  }

  console.log('\nNext:');
  console.log(`  npm run build`);
  console.log(`  npm run preview -- ${slug}`);
  console.log(`  Paste campaigns/${folder}/email.html into D365`);
}

main();
