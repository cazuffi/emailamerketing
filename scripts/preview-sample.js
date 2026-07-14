/**
 * Preview-only transforms — never applied to exported HTML.
 */
const fs = require('fs');
const path = require('path');
const { simulateDynamicsSend } = require('./simulate-dynamics');

const OUTLOOK_FALLBACKS_PATH = path.join(__dirname, '../components/_base/outlook-fallbacks.css');

const SAMPLE_MERGE_TAGS = {
  '{{FirstName}}': 'Alex',
  '{{LastName}}': 'Smith',
  '{{CompanyAddress}}': 'Weidmüller Inc. | 821 Southlake Blvd. | Richmond, VA 23236',
  '{{PreferenceCenter}}': '#',
};

function getOutlookFallbackCss() {
  return fs.readFileSync(OUTLOOK_FALLBACKS_PATH, 'utf8');
}

function getOutlookSimulationCss() {
  return getOutlookFallbackCss().replace(
    /\/\*\s*OUTLOOK_DESKTOP_STRUCTURE_START[\s\S]*?OUTLOOK_DESKTOP_STRUCTURE_END\s*\*\//g,
    '',
  );
}

function buildOutlookSimStyle() {
  return `<style id="studio-outlook-sim">\n${getOutlookSimulationCss()}\n</style>`;
}

function applyPreviewSampleData(html) {
  let out = html;
  for (const [token, value] of Object.entries(SAMPLE_MERGE_TAGS)) {
    out = out.split(token).join(value);
  }
  return out;
}

function applyOutlookSimStyle(html) {
  if (!html || html.includes('studio-outlook-sim')) return html;
  const block = buildOutlookSimStyle();
  // Assembled D365 HTML is often a fragment (no <head>); inject after main </style>.
  if (html.includes('</head>')) {
    return html.replace('</head>', `${block}</head>`);
  }
  const styleClose = html.indexOf('</style>');
  if (styleClose !== -1) {
    const insertAt = styleClose + '</style>'.length;
    return `${html.slice(0, insertAt)}${block}${html.slice(insertAt)}`;
  }
  return `${block}${html}`;
}

function findAtRuleEnd(css, openBraceIndex) {
  let depth = 1;
  let quote = '';
  let inComment = false;
  for (let i = openBraceIndex + 1; i < css.length; i += 1) {
    const char = css[i];
    const next = css[i + 1];
    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        i += 1;
      }
      continue;
    }
    if (!quote && char === '/' && next === '*') {
      inComment = true;
      i += 1;
      continue;
    }
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function removeMediaQueriesFromCss(css) {
  let output = '';
  let cursor = 0;
  const mediaPattern = /@media\b/gi;
  let match;
  while ((match = mediaPattern.exec(css))) {
    output += css.slice(cursor, match.index);
    const openBrace = css.indexOf('{', mediaPattern.lastIndex);
    if (openBrace === -1) {
      throw new Error('Malformed @media rule: missing opening brace');
    }
    const end = findAtRuleEnd(css, openBrace);
    if (end === -1) {
      throw new Error('Malformed @media rule: missing closing brace');
    }
    cursor = end;
    mediaPattern.lastIndex = end;
  }
  return output + css.slice(cursor);
}

function disableMediaQueries(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_, open, css, close) => `${open}${removeMediaQueriesFromCss(css)}${close}`,
  );
}

function preparePreviewHtml(
  html,
  {
    sampleData = false,
    outlookSim = false,
    libraryPreview = false,
    mediaQueriesDisabled = false,
    dynamicsSim = false,
  } = {},
) {
  let out = html;
  // Apply the Dynamics send transform FIRST, so all other preview layers render
  // against the markup that actually ships (not the clean export).
  if (dynamicsSim) out = simulateDynamicsSend(out);
  if (sampleData) out = applyPreviewSampleData(out);
  if (libraryPreview) out = applyLibraryPreviewStyle(out);
  if (outlookSim) out = applyOutlookSimStyle(out);
  if (mediaQueriesDisabled) out = disableMediaQueries(out);
  return out;
}

const LIBRARY_PREVIEW_STYLE = `<style id="studio-library-preview">
html, body.studio-library-preview-body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  background-color: #f4f4f4 !important;
}
.studio-library-preview-body [data-layout="true"] {
  margin: 0 auto !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.studio-library-preview-body .wrap-section:last-child {
  margin-bottom: 0 !important;
}
</style>`;

function applyLibraryPreviewStyle(html) {
  if (!html || html.includes('studio-library-preview')) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${LIBRARY_PREVIEW_STYLE}</head>`);
  }
  const styleClose = html.indexOf('</style>');
  if (styleClose !== -1) {
    const insertAt = styleClose + '</style>'.length;
    return `${html.slice(0, insertAt)}${LIBRARY_PREVIEW_STYLE}${html.slice(insertAt)}`;
  }
  return `${LIBRARY_PREVIEW_STYLE}${html}`;
}

module.exports = {
  applyPreviewSampleData,
  applyOutlookSimStyle,
  applyLibraryPreviewStyle,
  disableMediaQueries,
  removeMediaQueriesFromCss,
  simulateDynamicsSend,
  preparePreviewHtml,
  getOutlookFallbackCss,
  getOutlookSimulationCss,
  buildOutlookSimStyle,
  LIBRARY_PREVIEW_STYLE,
};
