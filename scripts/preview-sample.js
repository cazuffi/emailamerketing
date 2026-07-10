/**
 * Preview-only transforms — never applied to exported HTML.
 */
const fs = require('fs');
const path = require('path');

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

function buildOutlookSimStyle() {
  return `<style id="studio-outlook-sim">\n${getOutlookFallbackCss()}\n</style>`;
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

function preparePreviewHtml(html, { sampleData = false, outlookSim = false, libraryPreview = false } = {}) {
  let out = html;
  if (sampleData) out = applyPreviewSampleData(out);
  if (libraryPreview) out = applyLibraryPreviewStyle(out);
  if (outlookSim) out = applyOutlookSimStyle(out);
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
  preparePreviewHtml,
  getOutlookFallbackCss,
  buildOutlookSimStyle,
  LIBRARY_PREVIEW_STYLE,
};
