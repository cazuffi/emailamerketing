#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { ROOT, buildFile } = require('./assemble');

function findSources(dir, filename) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSources(fullPath, filename));
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  execSync('node scripts/generate-catalog.js', { cwd: ROOT, stdio: 'inherit' });

  const jobs = [];

  for (const entry of fs.readdirSync(path.join(ROOT, 'templates'), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('_')) {
      jobs.push({
        source: path.join(ROOT, 'templates', entry.name),
        output: path.join(ROOT, 'dist/templates', entry.name),
      });
    }
  }

  for (const source of findSources(path.join(ROOT, 'campaigns'), 'source.html')) {
    if (source.includes('_studio')) continue;
    const campaignDir = path.dirname(source);
    jobs.push({ source, output: path.join(campaignDir, 'email.html') });
  }

  if (jobs.length === 0) {
    console.log('No source files found.');
    return;
  }

  console.log('Building emails...\n');
  for (const { source, output } of jobs) {
    const out = buildFile(source, output);
    console.log(`✓ ${path.relative(ROOT, source)} → ${out}`);
  }
  console.log(`\nBuilt ${jobs.length} file(s).`);
}

main();
