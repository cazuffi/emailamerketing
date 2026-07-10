#!/usr/bin/env node

const assert = require('assert');
const cheerio = require('cheerio');
const { buildEmailHtml } = require('./assemble');

const options = {
  title: 'Audit fixture',
  modules: ['header-standard', 'cta-dual', 'specs-table'],
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
assert.strictEqual($('.header-standard-section .mobile-center-on-stack').length, 0);
const taglineCell = $('.header-standard-section .header-tagline-cell');
assert.strictEqual(taglineCell.attr('valign'), 'top');
assert.match(taglineCell.attr('style') || '', /vertical-align:top/i);

const dualColumns = $('.cta-dual-section [data-container="true"]');
assert.strictEqual(dualColumns.length, 2);
dualColumns.each((_, cell) => {
  assert.strictEqual($(cell).attr('data-container-width'), '50.00');
});

const dualCells = $('.cta-dual-section .buttonCell, .cta-dual-section .button-outline-cell');
assert.strictEqual(dualCells.length, 2);
dualCells.each((_, cell) => {
  assert.match($(cell).attr('style') || '', /border:2px solid #ef7800/i);
});

const dualLinks = $('.cta-dual-section a');
assert.strictEqual(dualLinks.length, 2);
dualLinks.each((_, link) => {
  const style = $(link).attr('style') || '';
  assert.match(style, /padding:14px 28px/i);
  assert.match(style, /width:100%/i);
});

assert.strictEqual(
  $('.specs-table [data-container], .specs-table [data-container-width]').length,
  0,
  'Specification cells must not be tagged as D365 layout containers',
);

$('a.buttonClass').each((_, link) => {
  assert($(link).hasClass('button-primary'), 'Every buttonClass link must receive button-primary');
});

console.log('✓ export and Send preview use identical markup');
console.log('✓ header alignment metadata is canonical');
console.log('✓ dual CTA dimensions are equal');
console.log('✓ specs table cells are not D365 layout containers');
console.log('✓ primary button classes are normalized');
