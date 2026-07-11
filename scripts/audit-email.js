#!/usr/bin/env node

const assert = require('assert');
const cheerio = require('cheerio');
const { buildEmailHtml, loadManifest } = require('./assemble');

const options = {
  title: 'Audit fixture',
  modules: ['header-standard', 'cta-dual', 'cta-band-grey', 'comparison-split', 'specs-table'],
  overrides: {},
  annotate: false,
};

const exported = buildEmailHtml(options);
const sendPreview = buildEmailHtml({
  ...options,
  previewSample: false,
  previewOutlookSim: false,
});

assert.strictEqual(
  sendPreview,
  exported,
  'Send preview markup must exactly match Copy HTML when Outlook simulation is off',
);

const $ = cheerio.load(exported, { xml: false }, false);

assert.strictEqual($('[data-studio-field], [data-studio-label], [data-studio-specs-rows]').length, 0);
assert.strictEqual($('.header-standard-section .header-logo-cell').length, 1);
assert.strictEqual($('.header-standard-section .header-tagline-cell[align="right"]').length, 1);
assert.strictEqual($('.header-standard-section [data-container]').length, 0);
assert.strictEqual($('.header-standard-section .containerWrapper').length, 0);
assert.strictEqual($('.header-standard-section .tbContainer, .header-standard-section .columnContainer').length, 0);
assert.strictEqual($('.header-standard-section .header-layout-table').length, 1);
const taglineCell = $('.header-standard-section .header-tagline-cell');
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
assert.strictEqual($('.orange-footer > table > tbody > tr > td > center').length, 1);
assert.strictEqual($('.orange-footer.columns-equal-class, .orange-footer .tbContainer').length, 0);
assert.strictEqual($('.orange-footer .footer-band-inner').attr('width'), '576');

const dualColumns = $('.cta-dual-section [data-container="true"]');
assert.strictEqual(dualColumns.length, 2);
dualColumns.each((_, cell) => {
  assert.strictEqual($(cell).attr('data-container-width'), '50.00');
});

const dualCells = $('.cta-dual-section .buttonCell, .cta-dual-section .button-outline-cell');
assert.strictEqual(dualCells.length, 2);
dualCells.each((_, cell) => {
  assert.match($(cell).attr('style') || '', /border:2px solid #ef7800/i);
  assert.strictEqual($(cell).attr('height'), '52');
  assert.match($(cell).attr('style') || '', /height:52px/i);
});

const dualTables = $('.cta-dual-section .buttonTable, .cta-dual-section .button-outline-table');
dualTables.each((_, table) => {
  assert.strictEqual($(table).attr('height'), '52');
  assert.match($(table).attr('style') || '', /table-layout:fixed/i);
});

const dualLinks = $('.cta-dual-section a');
assert.strictEqual(dualLinks.length, 2);
dualLinks.each((_, link) => {
  const style = $(link).attr('style') || '';
  assert.match(style, /padding:14px 28px/i);
  assert.match(style, /width:100%/i);
  assert.match(style, /height:48px/i);
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

const comparisonTitle = $('.comparison-split-section .comparison-title');
assert.strictEqual(comparisonTitle.attr('align'), 'left');
assert.match(comparisonTitle.attr('style') || '', /text-align:left/i);
assert.strictEqual($('.comparison-split-section .comparison-section-cell').attr('align'), 'left');

const greyCtaTable = $('.cta-band-grey .cta-band-grey-button .buttonTable');
const greyCtaLink = $('.cta-band-grey .cta-band-grey-button a.buttonClass');
const greyCtaColumns = $('.cta-band-grey [data-container="true"]');
const greyCtaShell = $('.cta-band-grey .cta-band-grey-shell');
const greyCtaCopyInner = $('.cta-band-grey .cta-band-grey-copy-inner');
assert.strictEqual(greyCtaColumns.eq(0).attr('data-container-width'), '68.00');
assert.strictEqual(greyCtaColumns.eq(1).attr('data-container-width'), '32.00');
assert.match(greyCtaShell.attr('style') || '', /border-left:4px solid #ef7800/i);
assert.match(greyCtaCopyInner.attr('style') || '', /padding:0 28px 0 0/i);
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

const allModuleIds = loadManifest().modules.map((module) => module.id);
const allModulesExport = buildEmailHtml({
  title: 'All-modules audit',
  modules: allModuleIds,
  overrides: {},
  annotate: false,
});
const $all = cheerio.load(allModulesExport, { xml: false }, false);

assert.strictEqual(
  $all('[data-studio-field], [data-studio-label], [data-studio-module], [data-studio-repeat]').length,
  0,
  'Studio metadata must not leak from any module',
);
assert(!/\[if !mso\]/i.test(allModulesExport), 'Non-MSO wrappers must not survive export');

$all('img').each((_, image) => {
  assert.notStrictEqual($all(image).attr('alt'), undefined, 'Every exported image must have alt text');
});

$all('a.buttonClass').each((_, link) => {
  assert($all(link).hasClass('button-primary'), 'Every exported buttonClass link must be primary');
});

$all('[data-container="true"]').each((_, cell) => {
  assert.match(
    $all(cell).attr('data-container-width') || '',
    /^\d+\.\d{2}$/,
    'Every D365 layout container must have a two-decimal width',
  );
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

console.log('✓ export and Send preview use identical markup');
console.log('✓ header alignment metadata is canonical');
console.log('✓ dual CTA dimensions are equal');
console.log('✓ specs table cells are not D365 layout containers');
console.log('✓ primary button classes are normalized');
console.log(`✓ all ${allModuleIds.length} modules pass export safeguards`);
