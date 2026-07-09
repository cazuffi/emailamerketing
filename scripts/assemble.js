const fs = require('fs');
const path = require('path');
const { applyOverrides, PREVIEW_INTERACTION_STYLE } = require('./module-fields');
const { hardenEmailHtml } = require('./harden-email');

const ROOT = path.join(__dirname, '..');
const STUDIO_BASE = path.join(ROOT, 'campaigns/_studio');
const SHELL_PATH = path.join(ROOT, 'templates/_campaign-shell.html');
const MANIFEST_PATH = path.join(ROOT, 'components/modules/manifest.json');

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

function assembleFromSource(sourceContent, baseDir = STUDIO_BASE) {
  return resolveIncludes(sourceContent, baseDir);
}

function loadManifest() {
  const { modules } = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const byId = new Map(modules.map((m) => [m.id, m]));
  return { modules, byId };
}

function validateModuleIds(moduleIds) {
  const { byId } = loadManifest();
  const invalid = moduleIds.filter((id) => id !== 'footer' && !byId.has(id));
  if (invalid.length) {
    throw new Error(`Unknown module(s): ${invalid.join(', ')}`);
  }
  return moduleIds.filter((id) => id !== 'footer');
}

function getModuleHtml(moduleId, instanceOverrides = {}, options = {}) {
  return applyOverrides(moduleId, instanceOverrides, options);
}

function buildSourceHtml({
  title = 'Email',
  modules = [],
  overrides = {},
  annotate = false,
  instanceMeta = [],
} = {}) {
  const safeModules = validateModuleIds(modules);
  let source = fs.readFileSync(SHELL_PATH, 'utf8');

  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  source = source.replace(/<title>.*?<\/title>/, `<title>${escapedTitle}</title>`);

  if (annotate && !source.includes('studio-preview-style')) {
    source = source.replace('</head>', `${PREVIEW_INTERACTION_STYLE}</head>`);
  }

  const moduleBlocks = safeModules
    .map((id, index) => {
      const inst = overrides[String(index)] || overrides[index] || {};
      const html = getModuleHtml(id, inst, { annotate });
      if (!annotate) return html;
      const meta = instanceMeta[index] || {};
      const uid = meta.uid || '';
      return `<div data-studio-module data-studio-index="${index}" data-studio-uid="${uid}" data-studio-module-id="${id}">${html}</div>`;
    })
    .join('\n');

  source = source.replace('<!-- MODULES:END -->', `${moduleBlocks}\n<!-- MODULES:END -->`);
  return source;
}

function buildEmailHtml(options = {}) {
  const source = buildSourceHtml(options);
  const assembled = assembleFromSource(source, STUDIO_BASE);
  return hardenEmailHtml(assembled);
}

function buildFile(sourcePath, outputPath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const assembled = assembleFromSource(source, path.dirname(sourcePath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, assembled);
  return path.relative(ROOT, outputPath);
}

module.exports = {
  ROOT,
  STUDIO_BASE,
  resolveIncludes,
  assembleFromSource,
  loadManifest,
  validateModuleIds,
  getModuleHtml,
  buildSourceHtml,
  buildEmailHtml,
  buildFile,
};
