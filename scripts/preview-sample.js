/**
 * Preview-only transforms — never applied to exported HTML.
 */
const SAMPLE_MERGE_TAGS = {
  '{{FirstName}}': 'Alex',
  '{{LastName}}': 'Smith',
  '{{CompanyAddress}}': 'Weidmüller Inc. | 821 Southlake Blvd. | Richmond, VA 23236',
  '{{PreferenceCenter}}': '#',
};

const PREVIEW_OUTLOOK_SIM_STYLE = `<style id="studio-outlook-sim">
/* Approximate Outlook desktop (Word engine) — no custom web fonts */
body, table, td, th, p, a, li, span, div {
  font-family: Arial, Helvetica, sans-serif !important;
}
h1, h3, b, strong, .text-bold {
  font-weight: bold !important;
  font-family: Arial, Helvetica, sans-serif !important;
}
h2 {
  font-family: Arial, Helvetica, sans-serif !important;
}
</style>`;

function applyPreviewSampleData(html) {
  let out = html;
  for (const [token, value] of Object.entries(SAMPLE_MERGE_TAGS)) {
    out = out.split(token).join(value);
  }
  return out;
}

function applyOutlookSimStyle(html) {
  if (!html || html.includes('studio-outlook-sim')) return html;
  // Assembled D365 HTML is often a fragment (no <head>); inject after main </style>.
  if (html.includes('</head>')) {
    return html.replace('</head>', `${PREVIEW_OUTLOOK_SIM_STYLE}</head>`);
  }
  const styleClose = html.indexOf('</style>');
  if (styleClose !== -1) {
    const insertAt = styleClose + '</style>'.length;
    return `${html.slice(0, insertAt)}${PREVIEW_OUTLOOK_SIM_STYLE}${html.slice(insertAt)}`;
  }
  return `${PREVIEW_OUTLOOK_SIM_STYLE}${html}`;
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
  PREVIEW_OUTLOOK_SIM_STYLE,
};
