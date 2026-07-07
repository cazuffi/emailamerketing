#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mjml2html = require('mjml');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIRS = ['templates', 'drafts', 'campaigns'];
const DIST_DIR = path.join(ROOT, 'dist');

function findMjmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMjmlFiles(fullPath));
    } else if (entry.name.endsWith('.mjml')) {
      results.push(fullPath);
    }
  }
  return results;
}

function compileFile(inputPath) {
  const relative = path.relative(ROOT, inputPath);
  const outputPath = path.join(DIST_DIR, relative.replace(/\.mjml$/, '.html'));

  const source = fs.readFileSync(inputPath, 'utf8');
  const result = mjml2html(source, {
    filePath: inputPath,
    validationLevel: 'soft',
  });

  if (result.errors.length > 0) {
    console.error(`\nErrors in ${relative}:`);
    for (const err of result.errors) {
      console.error(`  - ${err.formattedMessage || err.message}`);
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.html);
  return { relative, outputPath, errors: result.errors.length };
}

function main() {
  const files = SOURCE_DIRS.flatMap((dir) => findMjmlFiles(path.join(ROOT, dir)));

  if (files.length === 0) {
    console.log('No .mjml files found in templates/, drafts/, or campaigns/.');
    return;
  }

  let errorCount = 0;
  for (const file of files) {
    const { relative, outputPath, errors } = compileFile(file);
    console.log(`✓ ${relative} → ${path.relative(ROOT, outputPath)}`);
    errorCount += errors;
  }

  console.log(`\nBuilt ${files.length} file(s) to dist/`);
  if (errorCount > 0) {
    process.exit(1);
  }
}

main();
