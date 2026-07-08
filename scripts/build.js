#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function resolveIncludes(content, baseDir, depth = 0) {
  if (depth > 20) throw new Error('Include depth exceeded');
  return content.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, includePath) => {
    const fullPath = path.resolve(baseDir, includePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Include not found: ${includePath} (resolved: ${fullPath})`);
    }
    const included = fs.readFileSync(fullPath, 'utf8');
    return resolveIncludes(included, path.dirname(fullPath), depth + 1);
  });
}

function buildFile(sourcePath, outputPath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const assembled = resolveIncludes(source, path.dirname(sourcePath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, assembled);
  return path.relative(ROOT, outputPath);
}

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
  const jobs = [];

  for (const entry of fs.readdirSync(path.join(ROOT, 'templates'), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      jobs.push({
        source: path.join(ROOT, 'templates', entry.name),
        output: path.join(ROOT, 'dist/templates', entry.name),
      });
    }
  }

  for (const source of findSources(path.join(ROOT, 'campaigns'), 'source.html')) {
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
