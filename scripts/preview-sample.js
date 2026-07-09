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

function preparePreviewHtml(html, { sampleData = false, outlookSim = false } = {}) {
  let out = html;
  if (sampleData) out = applyPreviewSampleData(out);
  if (outlookSim) out = applyOutlookSimStyle(out);
  return out;
}

module.exports = {
  applyPreviewSampleData,
  applyOutlookSimStyle,
  preparePreviewHtml,
  getOutlookFallbackCss,
  buildOutlookSimStyle,
};
