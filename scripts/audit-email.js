#!/usr/bin/env node

const assert = require('assert');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { buildEmailHtml, loadManifest, assembleFromSource } = require('./assemble');
const { hardenEmailHtml, sanitizeExportHtml } = require('./harden-email');
const { extractFields } = require('./module-fields');
const { simulateDynamicsPaste } = require('./simulate-dynamics-paste');
const {
  getOutlookFallbackCss,
  getOutlookSimulationCss,
  removeMediaQueriesFromCss,
} = require('./preview-sample');

const BUILD_MARKER = 'email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v17';
const { GMAIL_CLIP_BYTES } = require('./prune-css');

const options = {
  title: 'Audit fixture',
  modules: [
    'header-standard',
    'accent-band',
    'cta-dual',
    'cta-band-grey',
    'comparison-split',
    'three-up-benefits',
    'specs-table',
    'event-details',
    'footer',
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
assert.match(
  exported,
  /body\s*\{[\s\S]*?text-align:\s*center/i,
  'Body must center the inline-block layout shell for Gmail',
);
assert.match(
  exported,
  /body\s*>\s*div\[data-layout="true"\][\s\S]*?display:\s*inline-block !important;/i,
  'Post-paste CSS must center Dynamics outer layout shell',
);
assert.match(
  exported,
  /\[data-layout="true"\][\s\S]*?display:\s*inline-block !important;/i,
  'Post-paste CSS must center the layout shell with inline-block',
);
assert.match(
  exported,
  /table\.outer[\s\S]*?margin-left:\s*auto !important;/i,
  'Post-paste CSS must center block-level outer tables',
);
assert.match(
  exported,
  /\[data-section="true"\] \[data-container="true"\][\s\S]*?display:\s*block !important;/i,
  'Post-paste CSS must neutralize Dynamics flex data-container wrappers',
);
assert.strictEqual($('.accent-band [data-editorblocktype="Text"]').length, 1);
assert.strictEqual($('.orange-footer [data-editorblocktype="Text"]').length, 0);
assert.ok($('.orange-footer center').length >= 1, 'Orange footer must use center wrapper for iOS Gmail');
assert.strictEqual($('.footer-legal [data-editorblocktype="Content"]').length, 0);
assert.strictEqual($('.three-up-benefits-section [data-editorblocktype="Text"]').length, 3);
assert.doesNotMatch(
  $('.orange-footer').first().attr('style') || '',
  /background-color:\s*#ef7800/i,
  'Orange footer fill must live on the table, not the section wrapper',
);
assert.doesNotMatch(
  $('.accent-band').first().attr('style') || '',
  /background-color:\s*#ef7800/i,
  'Accent band orange fill must live on the table, not the section wrapper',
);
assert.match(
  $('.accent-band table.outer').first().attr('style') || '',
  /background-color:\s*#ef7800/i,
  'Accent band table must carry the orange fill',
);
assert.match(
  exported,
  /\.accent-band\[data-section="true"\][\s\S]*background-color:\s*#ef7800 !important/i,
  'Accent band section wrapper must inherit orange so canvas gutters never flash white',
);
assert.match(
  exported,
  /\.urgency-band table\.outer[\s\S]*min-width:\s*100% !important/i,
  'Urgency band must harden full-bleed outer tables',
);
assert.strictEqual(
  $('.header-standard-section table.outer').first().attr('bgcolor'),
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
assert.strictEqual(logoCell.attr('align'), 'left');
assert.strictEqual(logoCell.attr('valign'), 'top');
assert.match(logoCell.attr('style') || '', /vertical-align:top/i);
assert.strictEqual(taglineCell.attr('valign'), 'middle');
assert.match(taglineCell.attr('style') || '', /vertical-align:middle/i);
assert.match(
  exported,
  /\.header-standard-section \.header-tagline-cell \[data-editorblocktype="Text"\]\s*\{\s*text-align:\s*center !important;/i,
  'Mobile header text block must center below the logo',
);
assert.match(
  exported,
  /\.header-standard-section \.header-logo-column[\s\S]*?\.header-standard-section \.header-logo-safe\s*\{[\s\S]*?text-align:\s*center !important;/i,
  'Mobile header logo wrappers must center across the email',
);
assert.match(
  noMediaPreview,
  /\.header-standard-section \.header-logo-column,\s*\.header-standard-section \.header-tagline-column\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/i,
  'No-media fallback must stack header columns at full width',
);
assert.match(
  noMediaPreview,
  /\.header-standard-section \.header-logo-safe\s*\{[\s\S]*?text-align:\s*center !important;/i,
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
  /a\.button-primary\s*\{[\s\S]*?background:\s*#ef7800 !important;/i,
  'Outlook desktop must keep the primary anchor orange so it blends into the td fill',
);
assert.match(
  getOutlookFallbackCss(),
  /a\.button-primary\s*\{[\s\S]*?display:\s*inline !important;/i,
  'Outlook desktop must force the anchor inline so a block anchor cannot cover the td fill',
);
assert.match(
  getOutlookFallbackCss(),
  /\.cta-dual-section \.buttonTable,[\s\S]*?\.cta-dual-section \.button-outline-table[\s\S]*?width:\s*100% !important;/i,
  'Outlook desktop dual CTA tables must fill their equal-width columns',
);
assert.strictEqual($('.orange-footer > table > tbody > tr > td.footer-band-content, .orange-footer .footer-band-content').length, 1);
assert.strictEqual($('.orange-footer .footer-band-content > center').length, 1);
assert.strictEqual($('.footer-legal center').length, 1);
assert.strictEqual($('.footer-legal .footer-legal-center').length, 1);
assert.strictEqual($('.orange-footer.columns-equal-class, .orange-footer .tbContainer').length, 0);
assert.strictEqual($('.orange-footer .footer-band-inner').attr('width'), '100%');
assert.strictEqual($('.orange-footer .footer-band-text-table').length, 1);
assert.strictEqual($('.footer-legal .footer-legal-text-table').length, 1);
assert.match(
  buildEmailHtml({ title: 'divider audit', modules: ['divider-line'], annotate: false }),
  /class="divider-line-cell"[^>]*style="[^"]*height:2px/i,
  'Divider must ship 2px height for Gmail',
);
assert.match(
  buildEmailHtml({ title: 'divider audit', modules: ['divider-line'], annotate: false }),
  /<img[^>]*class="divider-line-img"[^>]*src="data:image\/gif;base64,R0lGODdhAQAC|<img[^>]*src="data:image\/gif;base64,R0lGODdhAQAC[^"]*"[^>]*class="divider-line-img"/i,
  'Divider must ship an orange spacer image for Gmail iOS',
);
assert.strictEqual($('table.section-gap-shim').length, 0, 'Export must not inject section gap shims');
assert.match(
  exported,
  /\[data-section="true"\][\s\S]*margin:\s*0 !important/i,
  'Export must zero section wrapper margins for Gmail',
);
assert.match(
  exported,
  /\[data-section="true"\] > table\.outer[\s\S]*display:\s*table !important/i,
  'Export must force display:table on section outer tables for Gmail',
);
assert.match(
  buildEmailHtml({ title: 'urgency audit', modules: ['urgency-band'], annotate: false }),
  /urgency-band[\s\S]*text-align:center/i,
  'Urgency band must ship centered text styles',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'section heading audit', modules: ['section-heading'], annotate: false }),
    { xml: false },
    false,
  )('.section-heading-section center').length,
  1,
  'Section heading must wrap rule and title in a center block for Gmail',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'section heading audit', modules: ['section-heading'], annotate: false }),
    { xml: false },
    false,
  )('.section-heading-section .section-heading-center').length,
  1,
  'Section heading must use an inner centering table',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'section heading audit', modules: ['section-heading'], annotate: false }),
    { xml: false },
    false,
  )('.section-heading-section .divider-line-table').length,
  1,
  'Section heading must use a full-width divider rule',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'section heading audit', modules: ['section-heading'], annotate: false }),
    { xml: false },
    false,
  )('.section-heading-section .divider-line-img').length,
  1,
  'Section heading divider must ship the Gmail-safe spacer image',
);
assert.match(
  exported,
  /\.section-heading-section \[data-container="true"\][\s\S]*?text-align:\s*center !important/i,
  'Section heading data-container wrappers must center for Gmail',
);
assert.deepStrictEqual(
  extractFields('article-stack').map((field) => field.key),
  ['section_title', 'list_articles'],
  'Article stack must expose section title and per-story controls',
);
const articleStackExport = buildEmailHtml({
  title: 'article stack audit',
  modules: ['article-stack'],
  overrides: {
    0: {
      list_articles: [
        { headline: 'Story A', summary: 'Summary A', ctaLabel: 'Read A', ctaHref: 'https://example.com/a', showCta: 'yes' },
        { headline: 'Story B', summary: 'Summary B', ctaLabel: 'Read B', ctaHref: 'https://example.com/b', showCta: 'no' },
      ],
    },
  },
  annotate: false,
});
assert.match(articleStackExport, /Read A/);
assert.doesNotMatch(articleStackExport, /Read B/);
assert.strictEqual(
  (articleStackExport.match(/article-stack-cta-link/g) || []).length,
  1,
  'Article stack must export one CTA when only one story has showCta enabled',
);
assert.strictEqual(
  cheerio.load(articleStackExport, { xml: false }, false)('.article-stack-divider').length,
  1,
  'Article stack must export a divider between stories',
);
assert.doesNotMatch(
  articleStackExport,
  /class="article-stack-divider"[^>]*data-editorblocktype="Divider"/i,
  'Article stack dividers must not use Dynamics Divider blocks',
);
assert.match(
  articleStackExport,
  /\.article-stack-section \.article-stack-divider[\s\S]*width:\s*100% !important/i,
  'Article stack dividers must span the full content column',
);
assert.strictEqual(
  cheerio.load(simulateDynamicsPaste(articleStackExport), { xml: false }, false)(
    '.article-stack-divider',
  ).parent('[data-container="true"]').length,
  0,
  'Dynamics paste must not wrap article stack dividers in fixed-width containers',
);

const benefitCells = $('.three-up-benefits-section .three-up-stack-cell');
assert.strictEqual(benefitCells.length, 3);
benefitCells.each((_, cell) => {
  assert.strictEqual($(cell).attr('align'), 'center');
  assert.match($(cell).attr('style') || '', /text-align:\s*center/i);
});
assert.strictEqual($('.three-up-benefits-section .three-up-stack-table').length, 1);
assert.strictEqual($('.three-up-benefits-section .three-up-stack-table > tbody > tr').length, 1);
assert.strictEqual($('.three-up-benefits-section .three-up-stack-table > tbody > tr > td').length, 3);
assert.strictEqual($('.three-up-benefits-section .three-up-mobile-only, .three-up-benefits-section .three-up-desktop-only').length, 0);
assert.match(
  exported,
  /@media only screen and \(min-width:\s*641px\)[\s\S]*?\.three-up-benefits-section \.three-up-stack-cell[\s\S]*?display:\s*table-cell !important;/i,
  'Three benefits must use three columns on desktop',
);
assert.match(
  exported,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.three-up-benefits-section \.three-up-stack-cell[\s\S]*?display:\s*block !important;/i,
  'Three benefits must stack on mobile',
);
assert.match(
  exported,
  /\.orange-footer \[data-container="true"\][\s\S]*?display:\s*inline-block !important;/i,
  'Footer data-container wrappers must shrink-wrap for Gmail iOS centering',
);

const exportBytes = Buffer.byteLength(exported, 'utf8');
const simulatedBytes = Buffer.byteLength(simulateDynamicsPaste(exported), 'utf8');
assert.ok(
  simulatedBytes < GMAIL_CLIP_BYTES,
  `Audit fixture must stay under Gmail clip limit after Dynamics paste (${simulatedBytes} >= ${GMAIL_CLIP_BYTES})`,
);
assert.ok(
  exportBytes < GMAIL_CLIP_BYTES,
  `Audit fixture export must stay under Gmail clip limit (${exportBytes} >= ${GMAIL_CLIP_BYTES})`,
);

const fullCssExport = buildEmailHtml({ ...options, fullCss: true });
assert.ok(
  Buffer.byteLength(exported, 'utf8') < Buffer.byteLength(fullCssExport, 'utf8'),
  'Pruned export must be smaller than full CSS export',
);
assert.strictEqual($('.three-up-benefits-section [data-container]').length, 0);

const eventCard = $('.event-details-section .event-details-card');
const eventRows = $('.event-details-section .event-details-row');
assert.strictEqual(eventCard.length, 1);
assert.strictEqual(eventRows.length, 5);
assert.match(
  $('.event-details-section .event-details-rail-left').attr('style') || '',
  /background-color:#ef7800/i,
  'Event details card must use a forward-safe orange rail column',
);
assert.doesNotMatch(
  $('.event-details-section .event-details-shell').attr('style') || '',
  /border-left:4px solid #ef7800/i,
  'Event details shell must not rely on border-left accents',
);
eventRows.each((_, row) => {
  assert.strictEqual($(row).find('.event-details-label').attr('width'), '28%');
  assert.strictEqual($(row).find('.event-details-value').attr('width'), '72%');
});
assert.strictEqual($('.event-details-section [data-container]').length, 0);
assert.strictEqual($('.event-details-section .buttonWrapper').length, 0);

const eventFieldKeys = extractFields('event-details').map((field) => field.key);
for (const key of [
  'event_details_title',
  'event_date',
  'event_time',
  'event_duration',
  'event_format',
  'event_registration',
]) {
  assert(eventFieldKeys.includes(key), `Enhanced event details must expose ${key} in Studio`);
}

const dualColumns = $('.cta-dual-section .cta-dual-column');
assert.strictEqual(dualColumns.length, 2);
dualColumns.each((_, cell) => {
  assert.match($(cell).attr('width') || '', /^50%$/);
  assert.strictEqual($(cell).attr('align'), 'center');
  assert.strictEqual($(cell).attr('valign'), 'top');
  const style = $(cell).attr('style') || '';
  assert.match(style, /width:50%/i);
  assert.match(style, /text-align:center/i);
});
assert.strictEqual($('.cta-dual-section .cta-dual-table').length, 1);
assert.match(
  exported,
  new RegExp(`<!-- ${BUILD_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->`),
  'Export must include a build marker so pasted HTML can be verified',
);
assert.match(
  exported,
  /d365-send-compat|three-up-benefits-section \[data-container="true"\]/i,
  'Export must ship Dynamics send-transform CSS overrides',
);
assert.match(
  exported,
  /color:#ef7800/i,
  'Export must inline orange color on subheadline h2 elements',
);

const simulatedDynamics = simulateDynamicsPaste(exported);
assert.match(simulatedDynamics, /columns-equal-class/i, 'Dynamics simulation must add columns-equal-class');
assert.match(simulatedDynamics, /data-container="true"/i, 'Dynamics simulation must wrap editor blocks');
assert.strictEqual($('[data-layout="true"]').length, 1, 'Export keeps a single layout shell');
assert.strictEqual(
  $('[data-layout="true"]').parent('[data-layout="true"]').length,
  0,
  'Export must not nest layout shells before Dynamics save',
);
assert.match(simulatedDynamics, /<body[^>]*>/i, 'Dynamics simulation must wrap export in body');
assert.match(
  simulatedDynamics,
  /<div data-layout="true"[^>]*max-width:\s*640px/i,
  'Dynamics simulation must add the outer layout shell seen after save',
);
assert.match(
  exported,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.three-up-benefits-section \.three-up-stack-cell[\s\S]*?display:\s*block !important/i,
  'Dynamics send CSS must stack three-up benefits on mobile',
);
assert.match(
  exported,
  /\.orange-footer \[data-container="true"\][\s\S]*?text-align:\s*center !important/i,
  'Dynamics send CSS must center footer containers',
);

assert.match(
  exported,
  /<meta[^>]+name="color-scheme"[^>]+content="light only"/i,
  'Export must lock light color scheme for Gmail dark mode',
);
assert.match(
  exported,
  /\[data-ogsc\][\s\S]*background-color:\s*#ffffff !important/i,
  'Gmail dark-mode overrides must preserve white content backgrounds',
);
assert.match(
  exported,
  /\.header-logo-safe[\s\S]*line-height:\s*normal/i,
  'Header logo shell must use natural line-height so Outlook does not clip the image',
);
assert.match(
  exported,
  /\.header-standard-section[\s\S]*background-color:\s*#ffffff/i,
  'Header section must ship with an explicit white background',
);
assert.match(
  buildEmailHtml({ title: 'subhead audit', modules: ['eyebrow-headline'], annotate: false }),
  /class="subhead-orange"[^>]*style="[^"]*color:#ef7800/i,
  'Orange subheadlines must carry inline color for Gmail',
);
const $eyebrowHeadline = cheerio.load(
  buildEmailHtml({ title: 'eyebrow stack', modules: ['eyebrow-headline'], annotate: false }),
  { xml: false },
  false,
);
assert.strictEqual(
  $eyebrowHeadline('.eyebrow-headline [data-editorblocktype="Text"]').length,
  1,
  'Eyebrow headline module must use one Text block to avoid Gmail spacing between Dynamics containers',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'intro stack', modules: ['intro-headline'], annotate: false }),
    { xml: false },
    false,
  )('.intro-headline [data-editorblocktype="Text"]').length,
  1,
  'Intro headline module must use one Text block to avoid Gmail spacing between Dynamics containers',
);
assert.match(
  exported,
  /\.intro-headline h1[\s\S]*text-align:\s*left !important/i,
  'Intro headline must ship left-aligned for Outlook',
);
assert.match(
  exported,
  /\.headline-block-section h2[\s\S]*text-align:\s*left !important/i,
  'Headline H2 block must ship left-aligned for Outlook',
);
assert.match(
  exported,
  /\.feature-stack-text p[\s\S]*text-align:\s*left !important/i,
  'Feature module copy must ship left-aligned for Outlook',
);
assert.match(
  exported,
  /\.header-standard-section \.header-logo-safe[\s\S]*line-height:\s*normal !important/i,
  'Header logo shell must use natural line-height for Outlook',
);
assert.match(
  exported,
  /\.header-standard-section img\.header-logo-img[\s\S]*height:\s*auto !important/i,
  'Header logo must scale naturally in Outlook without fixed-height clipping',
);
assert.doesNotMatch(
  exported,
  /\.header-standard-section img\.header-logo-img[\s\S]*height:\s*23px !important/i,
  'Header logo must not force a fixed 23px height that clips taller assets',
);
assert.match(
  getOutlookFallbackCss(),
  /\.intro-headline h1[\s\S]*text-align:\s*left !important/i,
  'Outlook desktop fallback must keep intro headlines left-aligned',
);
assert.strictEqual(
  cheerio.load(
    buildEmailHtml({ title: 'video audit', modules: ['video-preview'], annotate: false }),
    { xml: false },
    false,
  )('.video-preview-section .video-preview-caption center').length,
  1,
  'Video preview play badge must ship inside a centered wrapper',
);

assert.strictEqual($('.cta-dual-section [data-container]').length, 0);

const dualCells = $('.cta-dual-section .buttonCell, .cta-dual-section .button-outline-cell');
assert.strictEqual(dualCells.length, 2);
assert.strictEqual($('.cta-dual-section .buttonCell').length, 0);
assert.strictEqual($('.cta-dual-section .button-outline-cell').length, 2);
dualCells.each((_, cell) => {
  assert.match($(cell).attr('style') || '', /width:100%/i);
  assert.match($(cell).attr('style') || '', /border:2px solid #ef7800/i);
  assert.match($(cell).attr('style') || '', /mso-shading:#ffffff/i);
  assert.strictEqual($(cell).attr('bgcolor'), '#ffffff');
  assert.strictEqual($(cell).attr('height'), undefined);
  assert.doesNotMatch($(cell).attr('style') || '', /(?:^|;)\s*height:/i);
});

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
  assert($(link).hasClass('button-outline-link'));
  assert.match(style, /padding:14px 28px/i);
  assert.match(style, /width:auto/i);
  assert.doesNotMatch(style, /(?:^|;)\s*height:/i);
  assert.strictEqual($(link).children('span').length, 1);
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
const greyCtaLeftRail = $('.cta-band-grey .cta-band-grey-rail-left');
const greyCtaRightRail = $('.cta-band-grey .cta-band-grey-rail-right');
// Grey CTA keeps the Dynamics editable-column layout (68/32) so it renders
// full-width with the button correctly on the right in a Dynamics send.
assert.strictEqual(greyCtaColumns.eq(0).attr('data-container-width'), '68.00');
assert.strictEqual(greyCtaColumns.eq(1).attr('data-container-width'), '32.00');
assert.strictEqual(greyCtaLeftRail.length, 1);
assert.strictEqual(greyCtaRightRail.length, 1);
assert.strictEqual(greyCtaLeftRail.attr('bgcolor'), '#ef7800');
assert.strictEqual(greyCtaRightRail.attr('bgcolor'), '#ffffff');
assert.doesNotMatch(greyCtaShell.attr('style') || '', /border-left:4px solid #ef7800/i);
assert.doesNotMatch(greyCtaShell.attr('style') || '', /border-right:4px solid #ffffff/i);
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
  /\.cta-band-grey \.cta-band-grey-rail-left[\s\S]*?background-color:\s*#ef7800 !important;/i,
  'Post-paste CSS must keep grey CTA forward-safe left rail',
);
assert.match(
  exported,
  /\.cta-band-grey \.cta-band-grey-rail-right[\s\S]*?background-color:\s*#ffffff !important;/i,
  'Post-paste CSS must keep grey CTA forward-safe right rail',
);
assert.match(
  exported,
  /\.accent-band \.section-pad-accent p[\s\S]*?color:\s*#ffffff !important;/i,
  'Accent band copy must ship forward-safe white text',
);
assert.match(
  exported,
  /\.orange-footer \.footer-band-title[\s\S]*?color:\s*#ffffff !important;/i,
  'Orange footer copy must ship forward-safe white text',
);
assert.match(
  exported,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.cta-band-grey \.cta-band-grey-rail-left[\s\S]*?width:\s*0 !important;[\s\S]*?\.cta-band-grey \.cta-band-grey-rail-right[\s\S]*?width:\s*0 !important;/i,
  'Mobile grey CTA must collapse forward-safe edge rails',
);
const accentGreyExport = buildEmailHtml({
  title: 'accent grey adjacency',
  modules: ['accent-band', 'cta-band-grey'],
  annotate: false,
});
const $accentGrey = cheerio.load(accentGreyExport, { xml: false }, false);
assert.strictEqual(
  $accentGrey('.accent-band + .cta-band-grey .cta-band-grey-rail-left').attr('bgcolor'),
  '#ffffff',
  'Grey CTA after accent band must use a white left rail',
);

const calloutExport = buildEmailHtml({ title: 'callout rail audit', modules: ['callout-box'], annotate: false });
const $callout = cheerio.load(calloutExport, { xml: false }, false);
assert.strictEqual($callout('.callout-box .callout-rail-left').length, 1);
assert.strictEqual($callout('.callout-box .callout-rail-left').attr('bgcolor'), '#ef7800');
assert.doesNotMatch($callout('.callout-body').attr('style') || '', /border-left:4px solid #ef7800/i);

assert.strictEqual(
  $('.specs-table [data-container], .specs-table [data-container-width]').length,
  0,
  'Specification cells must not be tagged as D365 layout containers',
);

$('a.buttonClass').each((_, link) => {
  assert($(link).hasClass('button-primary'), 'Every buttonClass link must receive button-primary');
});

assert.strictEqual((exported.match(/<v:roundrect\b/gi) || []).length, 0);
// Dynamics rebuilds data-editorblocktype="Button" blocks into a bare anchor and
// drops the table (and the anchor background). Neutralize the block so our
// bulletproof table (td bgcolor) survives the paste-into-Dynamics step.
assert.strictEqual(
  $('[data-editorblocktype="Button"]').length,
  0,
  'Exported buttons must not carry data-editorblocktype="Button" (Dynamics flattens it)',
);
assert($('.buttonWrapper .buttonTable .buttonCell').length > 0, 'Button table must survive export');

// No element may export a solid-color `background:` shorthand — Dynamics expands
// it to `background-image:initial…` and drops the fill. Use background-color.
$('[style*="background:"]').each((_, el) => {
  assert.doesNotMatch(
    $(el).attr('style') || '',
    /(^|;)\s*background\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\()/i,
    'Inline styles must use background-color, not the background shorthand',
  );
});

$('.buttonCell a.button-primary').each((_, link) => {
  const linkStyle = $(link).attr('style') || '';
  assert.doesNotMatch(linkStyle, /mso-hide\s*:\s*all/i);
  assert.doesNotMatch(linkStyle, /(?:^|;)\s*background:\s*#ef7800/i, 'Anchor must not use the background shorthand (Dynamics mangles it)');
  assert.match(linkStyle, /background-color:\s*#ef7800/i, 'Primary anchor must be orange so mobile/Gmail/Apple render a filled button');
  assert.strictEqual($(link).children('span').length, 1);
  assert.match($(link).children('span').attr('style') || '', /color:#ffffff/i);
  assert.doesNotMatch($(link).children('span').attr('style') || '', /background-color/i);
  const cellStyle = $(link).closest('.buttonCell').attr('style') || '';
  assert.match(cellStyle, /mso-padding-alt:\s*14px/i);
  assert.match(cellStyle, /background-color:\s*#ef7800/i, 'Primary button fill must also live on the td for Outlook desktop');
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
// These modules intentionally keep the Dynamics editable-column pattern
// (columns-equal-class + data-container). Dynamics needs that metadata to render
// their multi-column layout full-width with correct column positions; the fluid
// pattern breaks their width/alignment on send. The only cost is an editor-only
// "Add element here" dropzone, which does not appear in the sent email.
const editableLayoutModules = new Set([
  'comparison-split',
  'cta-band-grey',
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

$fallback('.three-up-benefits-section .three-up-stack-table > tbody > tr > td').each(() => {});
assert.strictEqual(
  $fallback('.three-up-benefits-section .three-up-stack-table > tbody > tr').length,
  1,
  'No-media three-up must keep a single benefits row',
);
assert.strictEqual(
  $fallback('.three-up-benefits-section .three-up-stack-table > tbody > tr > td').length,
  3,
  'No-media three-up must keep three benefit cells',
);
assert.strictEqual($fallback('.three-up-benefits-section .three-up-desktop-only, .three-up-benefits-section .three-up-mobile-only').length, 0);
$fallback('.cta-dual-section .cta-dual-column').each((_, col) => {
  assert.match($fallback(col).attr('width') || '', /^50%$/, 'No-media dual CTA columns must keep equal table widths');
});

assert.strictEqual(
  $all('[data-studio-field], [data-studio-label], [data-studio-module], [data-studio-repeat]').length,
  0,
  'Studio metadata must not leak from any module',
);
// Only the intentional editable-layout modules (comparison-split, cta-band-grey)
// may ship the Dynamics editable-column pattern; everything else must be fluid or
// plain so the editor cannot show an "Add element here" dropzone.
$all('[data-section="true"].columns-equal-class').each((_, section) => {
  const cls = $all(section).attr('class') || '';
  const isAllowed = [...editableLayoutModules].some((id) => cls.includes(`${id}-section`) || cls.includes(id));
  assert(
    isAllowed || /comparison|cta-band-grey/.test(cls),
    `Unexpected editable-column section (${cls}) — convert to the fluid pattern`,
  );
});
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
assert.match(headerLogoStyle, /width:200px/i, 'Header logo must use a fixed desktop width for Outlook');
assert.match(headerLogoStyle, /height:auto/i, 'Header logo must preserve natural height for Outlook');
assert.doesNotMatch(headerLogoStyle, /height:23px/i, 'Header logo must not force a fixed 23px height inline');

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
  if ($section.hasClass('accent-band') || $section.hasClass('orange-footer')) return;
  assert.match(
    $section.attr('style') || '',
    /background(?:-color)?\s*:/i,
    'Every top-level section must export with an explicit background',
  );
});
assert.match(
  $all('.accent-band').first().find('table.outer').attr('style') || '',
  /background-color:\s*#ef7800/i,
  'Intentional accent backgrounds must survive neutral fallback hardening on the table',
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
