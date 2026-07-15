const fs = require('fs');
const path = require('path');
const { applyOverrides, PREVIEW_INTERACTION_STYLE } = require('./module-fields');
const { hardenEmailHtml, sanitizeExportHtml } = require('./harden-email');
const { preparePreviewHtml } = require('./preview-sample');
const {
  collectActiveClasses,
  extractModuleIdsFromSource,
  minifyCss,
  pruneStylesheet,
  PRUNABLE_CSS,
} = require('./prune-css');

const ROOT = path.join(__dirname, '..');
const STUDIO_BASE = path.join(ROOT, 'campaigns/_studio');
const SHELL_PATH = path.join(ROOT, 'templates/_campaign-shell.html');
const MODULE_PREVIEW_SHELL_PATH = path.join(ROOT, 'templates/_module-preview-shell.html');
const MANIFEST_PATH = path.join(ROOT, 'components/modules/manifest.json');

function resolveIncludes(content, baseDir, depth = 0, options = {}) {
  if (depth > 20) throw new Error('Include depth exceeded');
  return content.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, includePath) => {
    const fullPath = path.resolve(baseDir, includePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Include not found: ${includePath} (resolved: ${fullPath})`);
    }
    let included = fs.readFileSync(fullPath, 'utf8');
    if (includePath.endsWith('.css') && options.activeClasses && options.pruneCss) {
      const basename = path.basename(includePath);
      if (PRUNABLE_CSS.has(basename)) {
        included = pruneStylesheet(included, options.activeClasses);
      }
    }
    return resolveIncludes(included, path.dirname(fullPath), depth + 1, options);
  });
}

function extractModulesRegion(sourceContent) {
  const match = sourceContent.match(/<!-- MODULES:START -->([\s\S]*?)<!-- MODULES:END -->/);
  return match ? match[1] : '';
}

function assembleFromSource(sourceContent, baseDir = STUDIO_BASE, options = {}) {
  let content = sourceContent;
  let resolveOptions = {};
  if (!options.fullCss) {
    const moduleIds = options.moduleIds || extractModuleIdsFromSource(content);
    const bodyHtml = extractModulesRegion(content);
    const activeClasses = collectActiveClasses({ moduleIds, bodyHtml });
    resolveOptions = { activeClasses, pruneCss: true };
  }
  let assembled = resolveIncludes(content, baseDir, 0, resolveOptions);
  if (options.minifyCss) {
    assembled = assembled.replace(
      /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_, open, css, close) => `${open}${minifyCss(css)}${close}`,
    );
  }
  return assembled;
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
  libraryPreview = false,
} = {}) {
  const safeModules = validateModuleIds(modules);
  const shellPath = libraryPreview ? MODULE_PREVIEW_SHELL_PATH : SHELL_PATH;
  let source = fs.readFileSync(shellPath, 'utf8');

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
  const moduleIds = validateModuleIds(options.modules || []);
  const assembled = assembleFromSource(source, STUDIO_BASE, {
    moduleIds,
    fullCss: !!options.fullCss,
    minifyCss: !options.annotate && !options.fullCss,
  });
  let hardened = hardenEmailHtml(assembled);
  const isPreview =
    options.libraryPreview || options.previewSample || options.previewOutlookSim || options.previewCssOff;
  // Every non-editing path must use the exact same D365-safe markup as Copy HTML.
  // Preview-only transforms are applied afterwards and never alter structure.
  if (!options.annotate) {
    hardened = sanitizeExportHtml(hardened);
  }
  if (isPreview) {
    return preparePreviewHtml(hardened, {
      sampleData: !!options.previewSample,
      libraryPreview: !!options.libraryPreview,
      outlookSim: !!options.previewOutlookSim,
      mediaQueriesDisabled: !!options.previewCssOff,
    });
  }
  return hardened;
}

function buildFile(sourcePath, outputPath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const moduleIds = extractModuleIdsFromSource(source);
  const assembled = assembleFromSource(source, path.dirname(sourcePath), {
    moduleIds,
    minifyCss: true,
  });
  const hardened = sanitizeExportHtml(hardenEmailHtml(assembled));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${hardened.trimEnd()}\n`);
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
