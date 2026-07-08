#!/usr/bin/env node

const { loadManifest } = require('./lib');

function main() {
  const { modules } = loadManifest();
  const byCat = {};
  for (const m of modules) {
    (byCat[m.category] ||= []).push(m);
  }

  console.log(`${modules.length} modules — use IDs with: npm run add -- <slug> <id>\n`);

  for (const [cat, items] of Object.entries(byCat)) {
    console.log(`${cat}`);
    for (const m of items) {
      console.log(`  ${m.id.padEnd(22)} ${m.description}`);
    }
    console.log('');
  }

  console.log('Browse visually: npm run preview -- catalog');
}

main();
