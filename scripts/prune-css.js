const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_CSS_DIR = path.join(ROOT, 'components/_base');
const MODULES_DIR = path.join(ROOT, 'components/modules');
const FOOTER_PATH = path.join(ROOT, 'components/blocks/footer.html');
const MANIFEST_PATH = path.join(MODULES_DIR, 'manifest.json');

const PRUNABLE_CSS = new Set([
  'styles.css',
  'module-styles.css',
  'd365-send-compat.css',
  'outlook-fallbacks.css',
]);

/** Classes required in every export (footer, buttons, layout shell). */
const GLOBAL_SCOPE_CLASSES = new Set([
  'accent-band',
  'align-center',
  'align-left',
  'align-right',
  'bullet-item',
  'buttonCell',
  'buttonClass',
  'button-outline-cell',
  'button-outline-link',
  'button-outline-table',
  'button-primary',
  'buttonTable',
  'buttonWrapper',
  'caption-text',
  'col-pad-left',
  'col-pad-right',
  'columnContainer',
  'columns-equal-class',
  'containerWrapper',
  'contentBlockWrapper',
  'cta-button-block',
  'disclaimer-text',
  'emptyContainer',
  'email-canvas-cell',
  'email-canvas-outer',
  'footer-band-address',
  'footer-band-contact',
  'footer-band-content',
  'footer-band-inner',
  'footer-band-text-table',
  'footer-band-title',
  'footer-legal-text-table',
  'footer-legal',
  'footer-legal-center',
  'imageWrapper',
  'inner',
  'mobile-center',
  'mobile-center-on-stack',
  'mobile-padding',
  'mobile-padding-sm',
  'mobile-text-left',
  'orange-footer',
  'outer',
  'preheader-text',
  'section-pad',
  'section-pad-accent',
  'section-pad-compact',
  'section-pad-compact-bottom',
  'section-pad-divider',
  'section-pad-tight',
  'section-gap-shim',
  'body-text-section',
  'divider-line-img',
  'divider-line-section',
  'divider-line-table',
  'stack-column',
  'stack-column-gap',
  'subhead-orange',
  'tbContainer',
  'text-bold',
  'text-spacer',
  'wrap-section',
]);

function loadManifestById() {
  const { modules } = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return new Map(modules.map((m) => [m.id, m]));
}

function resolveIncludesShallow(content, baseDir, depth = 0) {
  if (depth > 12) return content;
  return content.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, includePath) => {
    const fullPath = path.resolve(baseDir, includePath);
    if (!fs.existsSync(fullPath)) return '';
    const included = fs.readFileSync(fullPath, 'utf8');
    return resolveIncludesShallow(included, path.dirname(fullPath), depth + 1);
  });
}

function extractClassTokens(html) {
  const tokens = new Set();
  if (!html) return tokens;
  const classAttr = /class\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = classAttr.exec(html))) {
    for (const cls of match[1].split(/\s+/)) {
      if (cls) tokens.add(cls);
    }
  }
  return tokens;
}

function readModuleHtml(moduleId, byId) {
  const entry = byId.get(moduleId);
  if (!entry) return '';
  const filePath = path.join(MODULES_DIR, entry.file);
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  return resolveIncludesShallow(raw, path.dirname(filePath));
}

function extractModuleIdsFromSource(source) {
  const ids = [];
  const re = /<!--\s*@include\s+[^"']*modules\/([a-z0-9-]+)\.html\s*-->/gi;
  let match;
  while ((match = re.exec(source))) {
    if (match[1] !== 'footer') ids.push(match[1]);
  }
  return ids;
}

function collectActiveClasses({ moduleIds = [], bodyHtml = '' } = {}) {
  const active = new Set(GLOBAL_SCOPE_CLASSES);
  const byId = loadManifestById();

  for (const token of extractClassTokens(bodyHtml)) active.add(token);

  for (const moduleId of moduleIds) {
    const html = readModuleHtml(moduleId, byId);
    for (const token of extractClassTokens(html)) active.add(token);
  }

  if (fs.existsSync(FOOTER_PATH)) {
    const footerHtml = resolveIncludesShallow(
      fs.readFileSync(FOOTER_PATH, 'utf8'),
      path.dirname(FOOTER_PATH),
    );
    for (const token of extractClassTokens(footerHtml)) active.add(token);
  }

  return active;
}

function extractSelectorClasses(selector) {
  const classes = [];
  const re = /\.([a-zA-Z_][\w-]*)/g;
  let match;
  while ((match = re.exec(selector))) classes.push(match[1]);
  return classes;
}

function isStructuralSelector(selector) {
  const part = selector.trim();
  if (!part) return false;
  if (!part.includes('.') && !part.includes('#')) return true;
  if (/\[data-(layout|container|editorblocktype|protected|ogsc|ogsb)/i.test(part)) return true;
  if (/a\[x-apple-data-detectors\]/i.test(part)) return true;
  if (/u\s*\+\s*\.body/i.test(part)) return true;
  if (/\[style\*=/i.test(part)) return true;
  return false;
}

function selectorIsActive(selector, activeClasses) {
  const parts = selector.split(',');
  return parts.some((part) => {
    if (isStructuralSelector(part)) return true;
    const classes = extractSelectorClasses(part);
    if (classes.length === 0) return true;
    return classes.some((cls) => activeClasses.has(cls) || GLOBAL_SCOPE_CLASSES.has(cls));
  });
}

function skipWhitespaceAndComments(css, index) {
  let i = index;
  while (i < css.length) {
    if (/\s/.test(css[i])) {
      i += 1;
      continue;
    }
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }
    break;
  }
  return i;
}

function readBlock(css, startIndex) {
  const open = css.indexOf('{', startIndex);
  if (open === -1) return { header: css.slice(startIndex), inner: '', end: css.length, raw: css.slice(startIndex) };
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          header: css.slice(startIndex, open).trim(),
          inner: css.slice(open + 1, i),
          end: i + 1,
          raw: css.slice(startIndex, i + 1),
        };
      }
    }
  }
  return { header: css.slice(startIndex), inner: '', end: css.length, raw: css.slice(startIndex) };
}

function pruneStylesheet(css, activeClasses) {
  const kept = [];
  let i = skipWhitespaceAndComments(css, 0);

  while (i < css.length) {
    i = skipWhitespaceAndComments(css, i);
    if (i >= css.length) break;

    const block = readBlock(css, i);
    const header = block.header;

    if (header.startsWith('@')) {
      const name = header.slice(1).trim().split(/[\s({]/)[0].toLowerCase();
      if (name === 'font-face') {
        kept.push(block.raw.trim());
      } else if (name === 'media' || name === 'supports') {
        const inner = pruneStylesheet(block.inner, activeClasses).trim();
        if (inner) kept.push(`${header}{${inner}}`);
      } else {
        kept.push(block.raw.trim());
      }
    } else if (selectorIsActive(header, activeClasses)) {
      kept.push(block.raw.trim());
    }

    i = skipWhitespaceAndComments(css, block.end);
  }

  return kept.join('\n\n');
}

function injectPrunedCss(sourceContent, baseDir, activeClasses) {
  return sourceContent.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (full, includePath) => {
    if (!includePath.endsWith('.css')) return full;
    const basename = path.basename(includePath);
    const fullPath = path.resolve(baseDir, includePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CSS include not found: ${includePath} (resolved: ${fullPath})`);
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    if (!PRUNABLE_CSS.has(basename)) return raw;
    return pruneStylesheet(raw, activeClasses);
  });
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();
}

module.exports = {
  PRUNABLE_CSS,
  GLOBAL_SCOPE_CLASSES,
  collectActiveClasses,
  pruneStylesheet,
  injectPrunedCss,
  extractModuleIdsFromSource,
  extractClassTokens,
  minifyCss,
  GMAIL_CLIP_BYTES: 102400,
};
