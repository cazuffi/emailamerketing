#!/usr/bin/env node

const assert = require('assert');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { buildEmailHtml, loadManifest, assembleFromSource } = require('./assemble');
const { hardenEmailHtml, sanitizeExportHtml } = require('./harden-email');
const {
  getOutlookFallbackCss,
  getOutlookSimulationCss,
  removeMediaQueriesFromCss,
} = require('./preview-sample');

const options = {
  title: 'Audit fixture',
  modules: [
    'header-standard',
    'cta-dual',
    'cta-band-grey',
    'comparison-split',
    'three-up-benefits',
    'specs-table',
  ],
  overrides: {},
  annotate: false,
};

const exported = buildEmailHtml(options);
const sendPreview = buildEmailHtml({
  ...options,
  previewSample: false,
  previewOutlookSim: false,
});
const noMediaPreview = buildEmailHtml({
  ...options,
  previewCssOff: true,
});

assert.strictEqual(
  sendPreview,
  exported,
  'Send preview markup must exactly match Copy HTML when Outlook simulation is off',
);

const $ = cheerio.load(exported, { xml: false }, false);

assert.strictEqual($('[data-studio-field], [data-studio-label], [data-studio-specs-rows]').length, 0);
assert.match(
  $('[data-layout="true"]').attr('style') || '',
  /background-color:\s*#ffffff/i,
  'The email content wrapper must carry an inline white background',
);
assert.strictEqual(
  $('.header-standard-section > table.outer').attr('bgcolor'),
  '#ffffff',
  'Neutral sections must have a table-level white fallback',
);
assert.strictEqual($('.header-standard-section .header-logo-cell').length, 1);
assert.strictEqual($('.header-standard-section .header-tagline-cell[align="right"]').length, 1);
assert.strictEqual($('.header-standard-section [data-container]').length, 0);
assert.strictEqual($('.header-standard-section .containerWrapper').length, 0);
assert.strictEqual($('.header-standard-section .tbContainer, .header-standard-section .columnContainer').length, 0);
assert.strictEqual($('.header-standard-section .header-layout-table').length, 1);
const taglineCell = $('.header-standard-section .header-tagline-cell');
const logoCell = $('.header-standard-section .header-logo-cell');
assert.strictEqual(logoCell.attr('align'), 'center');
assert.strictEqual(taglineCell.attr('valign'), 'middle');
assert.match(taglineCell.attr('style') || '', /vertical-align:middle/i);
assert.match(
  exported,
  /\.header-standard-section \.header-tagline-cell \[data-editorblocktype="Text"\]\s*\{\s*text-align:\s*center !important;/i,
  'Mobile header text block must center below the logo',
);
assert.match(
  exported,
  /\.header-standard-section \.header-logo-column[\s\S]*?\.header-standard-section \.header-logo-column \.imageWrapper\s*\{\s*text-align:\s*center !important;/i,
  'Mobile header logo wrappers must center across the email',
);
assert.match(
  noMediaPreview,
  /\.header-standard-section \.header-logo-column,\s*\.header-standard-section \.header-tagline-column\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/i,
  'No-media fallback must stack header columns at full width',
);
assert.match(
  noMediaPreview,
  /\.header-standard-section \.header-logo-column \.imageWrapper\s*\{\s*text-align:\s*center !important;/i,
  'No-media fallback must center the logo across the email',
);
assert.match(
  getOutlookFallbackCss(),
  /OUTLOOK_DESKTOP_STRUCTURE_START[\s\S]*?header-logo-column/i,
  'Real Outlook fallback must retain desktop header structure',
);
assert.doesNotMatch(
  getOutlookFallbackCss(),
  /OUTLOOK_DESKTOP_STRUCTURE_START[\s\S]*?display:\s*table-cell/i,
  'Outlook Word must retain native table-cell display instead of overriding a stacked cell',
);
assert.doesNotMatch(
  getOutlookSimulationCss(),
  /header-standard-section \.header-logo-column/i,
  'Browser Outlook simulation must not force desktop header structure on mobile',
);
assert.match(
  getOutlookFallbackCss(),
  /td\.buttonCell\s*\{[\s\S]*?background-color:\s*#ef7800 !important;[\s\S]*?mso-shading:\s*#ef7800;[\s\S]*?mso-padding-alt:\s*14px 28px;/i,
  'Outlook desktop must paint the primary button fill on the td with mso padding',
);
assert.match(
  getOutlookFallbackCss(),
  /a\.button-primary\s*\{[\s\S]*?background:\s*transparent !important;/i,
  'Outlook desktop must keep the primary anchor transparent so the td fill shows',
);
assert.strictEqual($('.orange-footer > table > tbody > tr > td > center').length, 1);
assert.strictEqual($('.orange-footer.columns-equal-class, .orange-footer .tbContainer').length, 0);
assert.strictEqual($('.orange-footer .footer-band-inner').attr('width'), '576');

const benefitTitleCells = $('.three-up-benefits-section .three-up-title-cell');
assert.strictEqual(benefitTitleCells.length, 3);
benefitTitleCells.each((_, cell) => {
  assert.strictEqual($(cell).attr('height'), '42');
  assert.strictEqual($(cell).attr('valign'), 'middle');
});

const dualColumns = $('.cta-dual-section .cta-dual-column');
assert.strictEqual(dualColumns.length, 2);
dualColumns.each((_, cell) => {
  const style = $(cell).attr('style') || '';
  assert.match(style, /display:inline-block/i);
  assert.match(style, /width:100%/i);
  assert.match(style, /max-width:296px/i);
});
assert.strictEqual($('.cta-dual-section [data-container]').length, 0);
assert.match(
  exported,
  /<!--\[if mso\]>[\s\S]*?<table[^>]*width="592"[\s\S]*?<td width="296"[\s\S]*?<td width="296"/i,
  'Dual CTA must include an Outlook desktop ghost table',
);

const dualCells = $('.cta-dual-section .buttonCell, .cta-dual-section .button-outline-cell');
assert.strictEqual(dualCells.length, 2);
assert.match($('.cta-dual-section .buttonCell').attr('style') || '', /border:1px solid #ef7800/i);
assert.match($('.cta-dual-section .button-outline-cell').attr('style') || '', /border:2px solid #ef7800/i);
dualCells.each((_, cell) => {
  assert.match($(cell).attr('style') || '', /width:100%/i);
  assert.strictEqual($(cell).attr('height'), undefined);
  assert.doesNotMatch($(cell).attr('style') || '', /(?:^|;)\s*height:/i);
});
assert.match(
  $('.cta-dual-section .buttonCell').attr('style') || '',
  /mso-shading:#ef7800/i,
  'Primary dual CTA cell must carry inline Outlook shading',
);

const dualTables = $('.cta-dual-section .buttonTable, .cta-dual-section .button-outline-table');
dualTables.each((_, table) => {
  assert.strictEqual($(table).attr('width'), '100%');
  assert.strictEqual($(table).attr('height'), undefined);
  assert.match($(table).attr('style') || '', /table-layout:fixed/i);
});

const dualLinks = $('.cta-dual-section a');
assert.strictEqual(dualLinks.length, 2);
dualLinks.each((_, link) => {
  const style = $(link).attr('style') || '';
  assert.match(style, /padding:14px 28px/i);
  assert.match(style, /width:auto/i);
  assert.doesNotMatch(style, /(?:^|;)\s*height:/i);
});
assert.match(
  exported,
  /\.cta-dual-section \.cta-dual-primary \.inner[\s\S]*?padding-left:\s*0 !important;[\s\S]*?padding-right:\s*0 !important;/i,
  'Mobile CTA stack must remove both desktop inner gutters',
);
assert.match(
  exported,
  /\.cta-dual-section a\.button-outline-link[\s\S]*?width:\s*auto !important;/i,
  'Mobile outline CTA must use auto width to keep padding inside the email',
);

const comparisonTitle = $('.comparison-heading-section .comparison-title');
assert.strictEqual(comparisonTitle.attr('align'), 'left');
assert.match(comparisonTitle.attr('style') || '', /text-align:left/i);
assert.strictEqual($('.comparison-heading-section .comparison-heading-cell').attr('align'), 'left');
assert.strictEqual($('.comparison-heading-section.columns-equal-class').length, 0);
assert.strictEqual($('.comparison-heading-section + .comparison-split-section').length, 1);

const greyCtaTable = $('.cta-band-grey .cta-band-grey-button .buttonTable');
const greyCtaLink = $('.cta-band-grey .cta-band-grey-button a.buttonClass');
const greyCtaColumns = $('.cta-band-grey [data-container="true"]');
const greyCtaShell = $('.cta-band-grey .cta-band-grey-shell');
const greyCtaCopyInner = $('.cta-band-grey .cta-band-grey-copy-inner');
assert.strictEqual(greyCtaColumns.eq(0).attr('data-container-width'), '68.00');
assert.strictEqual(greyCtaColumns.eq(1).attr('data-container-width'), '32.00');
assert.match(greyCtaShell.attr('style') || '', /border-left:4px solid #ef7800/i);
assert.match(greyCtaCopyInner.attr('style') || '', /padding:0 16px 0 0/i);
assert.strictEqual(greyCtaTable.attr('width'), '160');
assert.match(greyCtaLink.attr('style') || '', /width:auto/i);
assert.match(greyCtaLink.attr('style') || '', /padding:14px 16px/i);
assert.match(greyCtaLink.attr('style') || '', /white-space:normal/i);
assert.match(
  exported,
  /\.cta-band-grey \.cta-band-grey-button \.buttonTable[\s\S]*?max-width:\s*180px !important;/i,
  'Mobile grey CTA button must remain compact',
);
assert.match(
  exported,
  /\.cta-band-grey \.cta-band-grey-shell[\s\S]*?border-left:\s*0 !important;/i,
  'Mobile grey CTA must remove the desktop accent border',
);

assert.strictEqual(
  $('.specs-table [data-container], .specs-table [data-container-width]').length,
  0,
  'Specification cells must not be tagged as D365 layout containers',
);

$('a.buttonClass').each((_, link) => {
  assert($(link).hasClass('button-primary'), 'Every buttonClass link must receive button-primary');
});

assert.strictEqual((exported.match(/<v:roundrect\b/gi) || []).length, 0);
$('.buttonCell a.button-primary').each((_, link) => {
  const linkStyle = $(link).attr('style') || '';
  assert.doesNotMatch(linkStyle, /mso-hide\s*:\s*all/i);
  assert.doesNotMatch(linkStyle, /background-color:\s*#ef7800/i);
  assert.match(linkStyle, /background(?:-color)?:\s*transparent/i, 'Primary anchor must be transparent so the td paints the fill');
  assert.strictEqual($(link).children('span').length, 1);
  assert.match($(link).children('span').attr('style') || '', /color:#ffffff/i);
  assert.doesNotMatch($(link).children('span').attr('style') || '', /background-color/i);
  const cellStyle = $(link).closest('.buttonCell').attr('style') || '';
  assert.match(cellStyle, /mso-padding-alt:\s*14px/i);
  assert.match(cellStyle, /background-color:\s*#ef7800/i, 'Primary button fill must live on the td');
  assert.doesNotMatch(cellStyle, /(?:^|;)\s*padding:\s*14px 28px/i, 'td must not carry real padding (doubles modern anchor padding)');
  assert.match($(link).closest('.buttonCell').attr('bgcolor'), /#ef7800/i);
});

const overriddenButtonExport = buildEmailHtml({
  title: 'Native button override audit',
  modules: ['cta-primary-center'],
  overrides: {
    0: {
      button_0_label: 'Custom Outlook CTA',
      button_0_href: 'https://example.com/outlook-cta',
    },
  },
  annotate: false,
});
const $overriddenButton = cheerio.load(overriddenButtonExport, { xml: false }, false);
const overriddenAnchor = $overriddenButton('.buttonCell a.button-primary');
assert.strictEqual(overriddenAnchor.attr('href'), 'https://example.com/outlook-cta');
assert.strictEqual(overriddenAnchor.text(), 'Custom Outlook CTA');

const allModuleIds = loadManifest().modules.map((module) => module.id);
const editableLayoutModules = new Set([
  'comparison-split',
  'cta-band-grey',
  'three-up-benefits',
]);
const allModulesExport = buildEmailHtml({
  title: 'All-modules audit',
  modules: allModuleIds,
  overrides: {},
  annotate: false,
});
const $all = cheerio.load(allModulesExport, { xml: false }, false);
const allModulesNoMedia = buildEmailHtml({
  title: 'All-modules fallback audit',
  modules: allModuleIds,
  overrides: {},
  annotate: false,
  previewCssOff: true,
});
const $fallback = cheerio.load(allModulesNoMedia, { xml: false }, false);

assert.strictEqual(
  $all('[data-studio-field], [data-studio-label], [data-studio-module], [data-studio-repeat]').length,
  0,
  'Studio metadata must not leak from any module',
);
assert(!/\[if !mso\]/i.test(allModulesExport), 'Non-MSO wrappers must not survive export');
assert(!/@media\b/i.test(allModulesNoMedia), 'Compatibility preview must remove every media query');
assert.strictEqual(
  $all('table.outer').filter((_, table) => /display\s*:\s*block/i.test($all(table).attr('style') || '')).length,
  0,
  'Outer email tables must retain table display semantics',
);

$all('img').each((_, image) => {
  assert.notStrictEqual($all(image).attr('alt'), undefined, 'Every exported image must have alt text');
});

$all('a.buttonClass').each((_, link) => {
  assert($all(link).hasClass('button-primary'), 'Every exported buttonClass link must be primary');
});
assert.strictEqual(
  (allModulesExport.match(/<v:roundrect\b/gi) || []).length,
  0,
  'Dynamics-safe exports must not rely on VML buttons',
);

$fallback('a.buttonClass, a.button-outline-link').each((_, link) => {
  const style = $fallback(link).attr('style') || '';
  const isFullWidth = /(?:^|;)\s*width\s*:\s*100%/i.test(style);
  const hasHorizontalPadding =
    /(?:^|;)\s*padding\s*:\s*(?!0(?:px)?(?:\s|;|$))/i.test(style) ||
    /(?:^|;)\s*padding-(?:left|right)\s*:\s*(?!0(?:px)?(?:\s|;|$))/i.test(style);
  assert(
    !(isFullWidth && hasHorizontalPadding),
    'Fallback buttons must not combine inline width:100% with horizontal padding',
  );
});

$all('[data-container="true"]').each((_, cell) => {
  assert.match(
    $all(cell).attr('data-container-width') || '',
    /^\d+\.\d{2}$/,
    'Every D365 layout container must have a two-decimal width',
  );
});

for (const moduleId of allModuleIds) {
  if (editableLayoutModules.has(moduleId)) continue;
  const moduleExport = buildEmailHtml({
    title: `${moduleId} source-safety audit`,
    modules: [moduleId],
    overrides: {},
    annotate: false,
  });
  const $module = cheerio.load(moduleExport, { xml: false }, false);
  assert.strictEqual(
    $module('[data-container="true"]').length,
    0,
    `${moduleId} must not gain Dynamics editable-column metadata`,
  );
}

const headerLogoStyle = $all('.header-standard-section img.header-logo-img').first().attr('style') || '';
assert.match(headerLogoStyle, /width:100%/i, 'Header logo must shrink inside its source column');
assert.match(headerLogoStyle, /max-width:200px/i, 'Header logo must retain its desktop cap');

for (const selector of ['.article-thumb img', '.team-photo img']) {
  const style = $all(selector).first().attr('style') || '';
  assert.match(style, /width:100%/i, `${selector} must shrink with its percentage column`);
  assert.match(style, /max-width:\d+px/i, `${selector} must retain a desktop cap`);
}

for (const selector of [
  '.download-resource-cta.compact-button-column',
  '.accent-band .compact-button-column',
  '.compact-button-column',
]) {
  $fallback(selector).find('a.buttonClass, a.button-outline-link').each((_, link) => {
    const style = $fallback(link).attr('style') || '';
    assert.match(style, /width:auto/i, 'Compact fallback CTA anchors must use auto width');
    assert.match(style, /padding:14px 12px/i, 'Compact fallback CTA anchors must use safe padding');
  });
}

$fallback('.tbContainer.multi').each((_, table) => {
  const $table = $fallback(table);
  $table.children('tbody').children('tr').each((__, row) => {
    let percentageTotal = 0;
    $fallback(row).children('th, td').each((___, cell) => {
      const $cell = $fallback(cell);
      const width = String($cell.attr('width') || '');
      const percentage = width.match(/^(\d+(?:\.\d+)?)%$/);
      if (percentage) percentageTotal += Number(percentage[1]);
      const style = $cell.attr('style') || '';
      assert(
        !(percentage && /(?:^|;)\s*width\s*:\s*\d+px/i.test(style)),
        'Percentage layout cells must not also force a fixed pixel width',
      );
      if (percentage) {
        $cell.find('img').each((____, image) => {
          const imageStyle = $fallback(image).attr('style') || '';
          const fixedWidth = /(?:^|;)\s*width\s*:\s*\d+px/i.test(imageStyle);
          const fluidCap = /max-width\s*:\s*100%/i.test(imageStyle);
          assert(
            !(fixedWidth && !fluidCap),
            'Images in percentage columns must be fluid or capped by the column',
          );
        });
      }
    });
    assert(percentageTotal <= 100.01, 'Multi-column row widths must not exceed 100%');
  });
});

assert.strictEqual(
  $all('.header-standard-section .tbContainer, .header-standard-section .columnContainer').length,
  0,
  'Headers must not use Dynamics designer-column hooks',
);
assert.strictEqual(
  $all('.orange-footer.columns-equal-class, .orange-footer .tbContainer').length,
  0,
  'The single-column orange footer must not use Dynamics column hooks',
);

$all('[data-layout="true"] > [data-section="true"]').each((_, section) => {
  const $section = $all(section);
  assert.match(
    $section.attr('style') || '',
    /background(?:-color)?\s*:/i,
    'Every top-level section must export with an explicit background',
  );
});
assert.match(
  $all('.accent-band').first().attr('style') || '',
  /background-color:\s*#ef7800/i,
  'Intentional accent backgrounds must survive neutral fallback hardening',
);

const nestedCss =
  '.base{color:red}@media only screen and (max-width:640px){.a{content:"{"}.b{color:blue}}.end{color:black}';
assert.strictEqual(
  removeMediaQueriesFromCss(nestedCss),
  '.base{color:red}.end{color:black}',
  'Media-query stripper must handle nested braces and strings',
);
assert.throws(
  () => removeMediaQueriesFromCss('@media only screen {.a{color:red}'),
  /missing closing brace/,
  'Malformed media CSS must fail loudly',
);

function listCampaignSources(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...listCampaignSources(fullPath));
    else if (entry.name === 'source.html') results.push(fullPath);
  }
  return results;
}

for (const sourcePath of listCampaignSources(path.join(__dirname, '../campaigns'))) {
  if (sourcePath.includes(`${path.sep}_studio${path.sep}`)) continue;
  const source = fs.readFileSync(sourcePath, 'utf8');
  const assembled = assembleFromSource(source, path.dirname(sourcePath));
  const campaignExport = sanitizeExportHtml(hardenEmailHtml(assembled));
  const $campaign = cheerio.load(campaignExport, { xml: false }, false);
  $campaign('[data-container-width]').each((_, cell) => {
    assert.match(
      $campaign(cell).attr('data-container-width') || '',
      /^\d+\.\d{2}$/,
      `${path.relative(process.cwd(), sourcePath)} has a non-normalized container width`,
    );
  });
  assert.strictEqual(
    $campaign('table.outer').filter(
      (_, table) => /display\s*:\s*block/i.test($campaign(table).attr('style') || ''),
    ).length,
    0,
    `${path.relative(process.cwd(), sourcePath)} must not export block outer tables`,
  );
}

const sharedFeatureBlock = fs.readFileSync(
  path.join(__dirname, '../components/blocks/feature-block.html'),
  'utf8',
);
const $featureBlock = cheerio.load(sharedFeatureBlock, { xml: false }, false);
assert.strictEqual(
  $featureBlock('[data-editorblocktype="Button"] .buttonTable .buttonCell a.buttonClass').length,
  1,
  'Legacy feature block must use a table-backed button',
);

console.log('✓ export and Send preview use identical markup');
console.log('✓ header alignment metadata is canonical');
console.log('✓ dual CTA dimensions are equal');
console.log('✓ specs table cells are not D365 layout containers');
console.log('✓ primary button classes are normalized');
console.log(`✓ all ${allModuleIds.length} modules pass export safeguards`);
console.log('✓ no-media-query fallback remains structurally safe');
console.log('✓ campaign sources and legacy blocks pass export safeguards');
