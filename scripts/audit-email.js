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

const BUILD_MARKER = 'email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v57';
const { GMAIL_CLIP_BYTES, GMAIL_CLIP_SAFE_BYTES } = require('./prune-css');

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
  /\[data-section="true"\]:not\(\.view-in-browser-section\)[\s\S]*?\[data-container="true"\][\s\S]*?display:\s*block !important;/i,
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

const viewBrowserExport = buildEmailHtml({
  title: 'view in browser audit',
  modules: ['view-in-browser-bar'],
  annotate: false,
});
const $viewBrowser = cheerio.load(viewBrowserExport, { xml: false }, false);
assert.strictEqual($viewBrowser('.view-in-browser-section [data-editorblocktype="Text"]').length, 0, 'View in browser must not use data-editorblocktype so Dynamics cannot inject a flex wrapper');
assert.strictEqual($viewBrowser('.view-in-browser-link').length, 1);
assert.match($viewBrowser('.view-in-browser-link').attr('style') || '', /color:#ef7800/i);
assert.match($viewBrowser('.view-in-browser-cell').attr('style') || '', /text-align:center/i);
assert.match($viewBrowser('.view-in-browser-cell').attr('style') || '', /background-color:#ffffff/i);
assert.match($viewBrowser('.view-in-browser-cell').attr('style') || '', /padding:12px 24px 16px 24px/i);
assert.strictEqual($viewBrowser('.view-in-browser-section center').length, 1, 'View in browser must wrap link in a center block for Gmail');
assert.strictEqual($viewBrowser('.view-in-browser-center-table').length, 1, 'View in browser must use a centering table for Gmail');
assert.strictEqual($viewBrowser('.view-in-browser-text-cell').length, 1, 'View in browser link must sit in a dedicated center cell');
assert.match(
  viewBrowserExport,
  /\.view-in-browser-section \.view-in-browser-text-cell[\s\S]*?text-align:\s*center !important;/i,
  'View in browser center cell must stay center-aligned after export',
);
assert.match(
  viewBrowserExport,
  /\.view-in-browser-section \.view-in-browser-cell[\s\S]*?background-color:\s*#ffffff !important;/i,
  'View in browser bar must use a white background after export',
);
assert.match(
  viewBrowserExport,
  /\.view-in-browser-section \.view-in-browser-link[\s\S]*?text-align:\s*center !important;/i,
  'View in browser link must stay center-aligned after export',
);
assert.match(
  viewBrowserExport,
  /\.view-in-browser-section \+ \.header-standard-section \.section-pad-tight[\s\S]*?padding-top:\s*24px !important;/i,
  'Header must gain extra top padding when it follows the view-in-browser bar',
);
assert.match(
  viewBrowserExport,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.view-in-browser-section center[\s\S]*?text-align:\s*center !important;/i,
  'Mobile view-in-browser center wrapper must stay centered after export',
);
const viewBrowserPasted = simulateDynamicsPaste(viewBrowserExport);
const $viewBrowserPasted = cheerio.load(viewBrowserPasted, { xml: false }, false);
assert.strictEqual(
  $viewBrowserPasted('.view-in-browser-section [data-container="true"]').length,
  0,
  'Dynamics paste must not wrap the view-in-browser link in a fixed-width data-container',
);

const introCenteredExport = buildEmailHtml({
  title: 'intro centered audit',
  modules: ['intro-centered'],
  annotate: false,
});
const $introCentered = cheerio.load(introCenteredExport, { xml: false }, false);
assert.strictEqual($introCentered('.mod-intro-centered center').length, 1, 'Intro centered must wrap copy in a center block for Gmail');
assert.strictEqual($introCentered('.mod-intro-centered .intro-centered-inner').length, 1);
assert.strictEqual($introCentered('.mod-intro-centered .intro-centered-inner tr').length, 3, 'Intro centered must use one table row per text block for Dynamics paste');
assert.match($introCentered('.intro-centered-cell').attr('style') || '', /text-align:center/i);
assert.match(
  introCenteredExport,
  /\.mod-intro-centered \[data-container="true"\][\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/i,
  'Intro centered data-container must stretch full width for centered headlines',
);
assert.match(
  introCenteredExport,
  /u \+ \.body \.mod-intro-centered \[data-container="true"\][\s\S]*?display:\s*block !important;/i,
  'Gmail must keep intro centered data-container full width',
);
const introCenteredPasted = simulateDynamicsPaste(introCenteredExport);
const $introPasted = cheerio.load(introCenteredPasted, { xml: false }, false);
assert.strictEqual($introPasted('.mod-intro-centered [data-d365-flex-wrap="true"]').length, 3);
assert.strictEqual($introPasted('.mod-intro-centered .intro-centered-inner td[align="center"]').length, 3);

const imageSplitExport = buildEmailHtml({
  title: 'image split audit',
  modules: ['image-split-text-right'],
  annotate: false,
});
const $imageSplit = cheerio.load(imageSplitExport, { xml: false }, false);
assert.strictEqual($imageSplit('td.image-split-copy').length, 1);
assert.strictEqual($imageSplit('td.image-split-media').length, 1);
assert.match($imageSplit('td.image-split-copy').attr('width') || '', /51%/i, 'Image split copy must use percentage table column width');
assert.match($imageSplit('td.image-split-media').attr('width') || '', /49%/i, 'Image split media must use percentage table column width');
assert.match($imageSplit('td.image-split-media').attr('style') || '', /padding:0 12px 0 0/i, 'Image-left split must keep gutter padding between columns');
assert.strictEqual($imageSplit('td.image-split-copy [data-editorblocktype="Text"]').length, 1, 'Image split must use one text block per copy column');
assert.match(
  imageSplitExport,
  /\.image-split-layout td\.image-split-copy[\s\S]*?width:51% !important/i,
  'Image split must ship base CSS table-cell column width for desktop/Outlook',
);
assert.match(
  imageSplitExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*?\.image-split-layout td\.image-split-copy[\s\S]*?display:table-cell!important/i,
  'Image split must keep columns side-by-side above mobile breakpoint',
);
assert.match(
  imageSplitExport,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.image-split-layout td\.image-split-copy[\s\S]*?display:block!important/i,
  'Mobile image split columns must stack to full width',
);
assert.doesNotMatch($imageSplit('.image-split-text-section').html() || '', /<!--\[if mso\]/i, 'Image split must not rely on MSO-only desktop columns');
assert.match(
  imageSplitExport,
  /u\s*\+\s*\.body \.image-split-layout td\.image-split-copy[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep image split side-by-side via table cells',
);
assert.match(
  imageSplitExport,
  /u\s*\+\s*\.body \.image-split-stack > div[\s\S]*?width:\s*100%\s*!important/i,
  'Gmail must neutralize Dynamics send-time flex shells inside image split columns',
);
assert.match(
  imageSplitExport,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?u\+\.body \.image-split-layout td\.image-split-copy[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail mobile must center stacked image split copy',
);

const heroFullInsetFields = extractFields('hero-full');
assert(
  heroFullInsetFields.some((field) => field.key === 'insetImage' && field.type === 'toggle'),
  'Edge-touching image modules must expose insetImage toggle',
);

const insetHeroExport = buildEmailHtml({
  title: 'Inset hero audit',
  modules: ['hero-full'],
  overrides: { 0: { insetImage: 'yes' } },
  annotate: false,
});
const $insetHero = cheerio.load(insetHeroExport, { xml: false }, false);
assert.strictEqual($insetHero('.image-edge-inset').length, 1, 'Inset toggle must add image-edge-inset class');
assert.match(
  insetHeroExport,
  /@media only screen and \(min-width:\s*641px\)[\s\S]*?\.image-edge-section\.image-edge-inset \.image-edge-cell[\s\S]*?padding-left:\s*24px !important;/i,
  'Exported CSS must apply inset image side spacing on desktop only',
);

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
const outlookStructureCss = getOutlookFallbackCss().replace(
  /\.feature-cards-four-section[\s\S]*?(?=\/\* OUTLOOK_DESKTOP_STRUCTURE_END \*\/)/,
  '',
);
assert.doesNotMatch(
  outlookStructureCss,
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

const benefitCells = $('.three-up-benefits-section td.benefit-stack');
assert.strictEqual(benefitCells.length, 3);
assert.strictEqual($('.three-up-benefits-section .benefit-stack.three-up-cell').length, 0, 'Benefits must not use three-up-cell class');
benefitCells.each((_, cell) => {
  assert.match($(cell).attr('style') || '', /text-align:\s*center/i);
  assert.match($(cell).attr('width') || '', /33\.33%/i);
});
assert.match(
  exported,
  /\.three-up-benefits-section td\.benefit-stack[\s\S]*?width:33\.33% !important/i,
  'Three benefits must ship base CSS table-cell column width for desktop/Outlook',
);
assert.doesNotMatch(
  exported,
  /\.stats-three-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Audit fixture must prune unused stats-three base CSS',
);
assert.doesNotMatch(
  exported,
  /\.stats-four-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Audit fixture must prune unused stats-four base CSS',
);
assert.strictEqual($('.three-up-benefits-section .three-up-benefits-layout').length, 1);
assert.strictEqual($('.three-up-benefits-section .three-up-benefits-layout tr').length, 1);
assert.match(
  exported,
  /u\s*\+\s*\.body \.three-up-benefits-section td\.benefit-stack[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep three-up benefits side-by-side via table cells',
);
assert.match(
  exported,
  /u\s*\+\s*\.body[\s\S]*?\.footer-legal[\s\S]*?width\s*:\s*100%\s*!important/i,
  'Gmail must keep footer legal full width',
);
assert.match(
  exported,
  /u\s*\+\s*\.body[\s\S]*?\.three-up-benefits-section[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center three-up benefit copy',
);
assert.match(
  exported,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.three-up-benefits-section td\.benefit-stack[\s\S]*?display:\s*block !important;/i,
  'Three benefits must stack on mobile',
);
assert.doesNotMatch($('.three-up-benefits-section').html() || '', /<!--\[if mso\]/i, 'Three benefits must not rely on MSO-only desktop columns');
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

const pcbClipModules = [
  'preheader-bar',
  'view-in-browser-bar',
  'header-standard',
  'intro-centered',
  'hero-full',
  'body-text',
  'headline-h2-center',
  'stats-three',
  'accent-band-cta',
  'headline-h2',
  'cta-primary-center',
  'spacer-sm',
  'feature-right-text',
  'spacer-sm',
  'headline-h2-center',
  'cta-text-link',
  'footer',
];
const pcbClipExport = buildEmailHtml({
  title: 'PCB clip audit',
  modules: pcbClipModules,
  annotate: false,
});
const pcbClipSimulatedBytes = Buffer.byteLength(simulateDynamicsPaste(pcbClipExport), 'utf8');
assert.ok(
  pcbClipSimulatedBytes < GMAIL_CLIP_SAFE_BYTES,
  `PCB campaign must stay under Gmail safe clip threshold after Dynamics paste (${pcbClipSimulatedBytes} >= ${GMAIL_CLIP_SAFE_BYTES})`,
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
  $('.event-details-section .event-details-shell').attr('style') || '',
  /border-left:4px solid #ef7800/i,
  'Event details card must use a Word-safe td accent border',
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
assert.match(simulatedDynamics, /data-d365-flex-wrap="true"|display:flex;flex-direction:column/i, 'Dynamics simulation must wrap editor blocks in send-time flex shells');
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
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.three-up-benefits-section \.benefit-stack[\s\S]*?display:\s*block !important/i,
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
  buildEmailHtml({ title: 'intro headline audit', modules: ['intro-headline'], annotate: false }),
  /\.intro-headline h1[\s\S]*text-align:\s*left !important/i,
  'Intro headline must ship left-aligned for Outlook',
);
assert.match(
  buildEmailHtml({ title: 'headline h2 audit', modules: ['headline-h2'], annotate: false }),
  /\.headline-block-section h2[\s\S]*text-align:\s*left !important/i,
  'Headline H2 block must ship left-aligned for Outlook',
);

const headlineH2CenterExport = buildEmailHtml({
  title: 'headline h2 center audit',
  modules: ['headline-h2-center'],
  annotate: false,
});
const $headlineH2Center = cheerio.load(headlineH2CenterExport, { xml: false }, false);
assert.strictEqual($headlineH2Center('.headline-block-center-section').length, 1);
assert.strictEqual($headlineH2Center('.headline-block-center-section center').length, 1);
assert.strictEqual($headlineH2Center('.headline-block-center-inner tr').length, 2);
assert.strictEqual($headlineH2Center('.headline-block-center-cell').attr('align'), 'center');
assert.strictEqual($headlineH2Center('h2').first().attr('align'), 'center');
assert.match($headlineH2Center('h2').first().attr('style') || '', /text-align:center/i);
assert.match(
  headlineH2CenterExport,
  /\.headline-block-center-section \[data-container="true"\][\s\S]*?text-align:\s*center !important/i,
  'Centered headline block data-container must stretch full width and center',
);
assert.match(
  headlineH2CenterExport,
  /u \+ \.body \.headline-block-center-section \[data-container="true"\][\s\S]*?text-align:\s*center !important/i,
  'Gmail must keep centered headline block data-container full width',
);
assert.doesNotMatch(
  headlineH2CenterExport,
  /\.headline-block-center-section h2\{[^}]*text-align:\s*left !important/i,
  'Centered headline H2 must not ship a left-align override',
);
const headlineH2CenterPasted = simulateDynamicsPaste(headlineH2CenterExport);
const $headlineH2CenterPasted = cheerio.load(headlineH2CenterPasted, { xml: false }, false);
assert.strictEqual($headlineH2CenterPasted('.headline-block-center-section [data-d365-flex-wrap="true"]').length, 2);
assert.strictEqual($headlineH2CenterPasted('.headline-block-center-inner td[align="center"]').length, 2);

const headlineH3CenterExport = buildEmailHtml({
  title: 'headline h3 center audit',
  modules: ['headline-h3-center'],
  annotate: false,
});
const $headlineH3Center = cheerio.load(headlineH3CenterExport, { xml: false }, false);
assert.strictEqual($headlineH3Center('.headline-block-center-section').length, 1);
assert.strictEqual($headlineH3Center('h3').first().attr('align'), 'center');

const headlineH2CenterPreview = buildEmailHtml({
  title: 'headline h2 center preview',
  modules: ['headline-h2-center'],
  annotate: true,
});
const $headlineH2CenterPreview = cheerio.load(headlineH2CenterPreview, { xml: false }, false);
assert.strictEqual($headlineH2CenterPreview('.headline-block-center-cell').attr('align'), 'center');
assert.strictEqual($headlineH2CenterPreview('h2').first().attr('align'), 'center');

assert.match(
  buildEmailHtml({ title: 'feature left audit', modules: ['feature-left-text'], annotate: false }),
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
// Grey CTA keeps the Dynamics editable-column layout (68/32) so it renders
// full-width with the button correctly on the right in a Dynamics send.
assert.strictEqual(greyCtaColumns.eq(0).attr('data-container-width'), '68.00');
assert.strictEqual(greyCtaColumns.eq(1).attr('data-container-width'), '32.00');
assert.match(greyCtaShell.attr('style') || '', /border-left:4px solid #ef7800/i);
assert.match(greyCtaShell.attr('style') || '', /border-right:4px solid #ffffff/i);
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
  /\.cta-band-grey \.cta-band-grey-shell[\s\S]*?border-left:\s*4px solid #ef7800 !important;[\s\S]*?border-right:\s*4px solid #ffffff !important;/i,
  'Post-paste CSS must keep grey CTA desktop edge rails',
);
assert.match(
  exported,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.cta-band-grey \.cta-band-grey-shell[\s\S]*?border-left:\s*0 !important;[\s\S]*?border-right:\s*0 !important;/i,
  'Mobile grey CTA must remove both desktop edge rails',
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

const centerCtaExport = buildEmailHtml({
  title: 'Center CTA audit',
  modules: ['cta-primary-center'],
  overrides: {},
  annotate: false,
});
const $centerCta = cheerio.load(centerCtaExport, { xml: false }, false);
assert.strictEqual($centerCta('.cta-primary-center').length, 1, 'Center CTA section must carry cta-primary-center class');
const centerWrap = $centerCta('.cta-primary-center .buttonWrapper');
assert.strictEqual(centerWrap.attr('align'), 'center');
assert.match(centerWrap.attr('style') || '', /margin-left:auto/i, 'Center CTA wrapper must auto-margin for block-level table centering');
assert.match(centerWrap.attr('style') || '', /margin-right:auto/i);
assert.match(centerWrap.attr('style') || '', /max-width:320px/i, 'Center CTA wrapper must cap button width on mobile');
const centerTable = centerWrap.find('.buttonTable').first();
assert.match(centerTable.attr('style') || '', /margin-left:auto/i, 'Center CTA button table must auto-margin');
assert.match(centerTable.attr('style') || '', /margin-right:auto/i);
assert.match(
  centerCtaExport,
  /\.cta-primary-center \.buttonTable[\s\S]*?margin-left:\s*auto !important;/i,
  'Exported CSS must center block-level button tables in cta-primary-center',
);

const heroFullFields = extractFields('hero-full');
assert(
  heroFullFields.some((field) => field.key === 'image_0_caption' && field.hideWhenEmpty),
  'Image modules must expose optional image subtext field',
);
const twoUpFields = extractFields('two-up-cards');
assert(twoUpFields.some((field) => field.key === 'image_0_caption'), 'Two-up cards must expose subtext for first image');
assert(twoUpFields.some((field) => field.key === 'image_1_caption'), 'Two-up cards must expose subtext for second image');

const subtextExport = buildEmailHtml({
  title: 'Image subtext audit',
  modules: ['team-profile'],
  overrides: {
    0: {
      image_0_caption: 'Alex Müller\nProduct Manager, Connectivity',
    },
  },
  annotate: false,
});
const $subtext = cheerio.load(subtextExport, { xml: false }, false);
assert.match(
  $subtext('.image-subtext').html() || '',
  /Alex Müller<br>Product Manager, Connectivity/i,
  'Multiline image subtext must render line breaks',
);

const emptySubtextExport = buildEmailHtml({
  title: 'Empty image subtext audit',
  modules: ['hero-full'],
  overrides: {},
  annotate: false,
});
assert.doesNotMatch(
  emptySubtextExport,
  /class="caption-text image-subtext"/,
  'Empty image subtext must be omitted on export',
);

const twoUpTextExport = buildEmailHtml({
  title: 'Two-up text audit',
  modules: ['two-up-text'],
  overrides: {},
  annotate: false,
});
const $twoUpText = cheerio.load(twoUpTextExport, { xml: false }, false);
assert.strictEqual($twoUpText('.two-up-text-section .two-up-text-col').length, 2, 'Two-up text must render two 50/50 columns');
assert.strictEqual($twoUpText('.two-up-text-col-right').length, 1);
assert.match($twoUpText('.two-up-text-col-left').attr('style') || '', /padding-right:12px/i);
assert.match($twoUpText('.two-up-text-col-right').attr('style') || '', /border-left:1px solid #e8e8e8/i);
assert.match($twoUpText('.two-up-text-shell').attr('style') || '', /padding-bottom:28px/i);
assert.doesNotMatch($twoUpText('.two-up-text-col-left').attr('width') || '', /50%/i, 'Two-up columns must not ship width="50%" attributes');
assert.doesNotMatch($twoUpText('.two-up-text-col-left').attr('style') || '', /width:50%/i, 'Two-up columns must not ship inline 50% width');
assert.match(
  twoUpTextExport,
  /@media only screen and \(min-width:\s*641px\)[\s\S]*?\.two-up-text-section \.two-up-text-col[\s\S]*?width:\s*50% !important;/i,
  'Two-up text columns must ship at 50% width on desktop via CSS only',
);
assert.match(
  twoUpTextExport,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.two-up-text-section \.two-up-text-col-right[\s\S]*?border-top:\s*1px solid #e8e8e8 !important;/i,
  'Mobile two-up text must use a horizontal divider when stacked',
);
assert.match(
  twoUpTextExport,
  /u \+ \.body \.two-up-text-section \.two-up-text-col[\s\S]*?display:\s*block !important;/i,
  'Gmail must force two-up columns to stack on mobile',
);
const twoUpPasted = simulateDynamicsPaste(twoUpTextExport);
const $twoUpPasted = cheerio.load(twoUpPasted, { xml: false }, false);
assert.doesNotMatch($twoUpPasted('.two-up-text-col-left').attr('width') || '', /50%/i, 'Dynamics paste must not reintroduce width="50%" on two-up columns');

const accentBandCtaExport = buildEmailHtml({
  title: 'Accent band CTA audit',
  modules: ['accent-band-cta'],
  annotate: false,
});
const $accentBandCta = cheerio.load(accentBandCtaExport, { xml: false }, false);
assert.strictEqual($accentBandCta('td.accent-band-copy').length, 1);
assert.strictEqual($accentBandCta('td.accent-band-cta').length, 1);
assert.match($accentBandCta('td.accent-band-copy').attr('width') || '', /65%/i, 'Accent band copy must use percentage table column width');
assert.match($accentBandCta('td.accent-band-cta').attr('width') || '', /35%/i, 'Accent band CTA must use percentage table column width');
assert.match($accentBandCta('td.accent-band-cta').attr('style') || '', /text-align:right/i, 'Accent band CTA must align right on desktop');
assert.match(
  accentBandCtaExport,
  /\.accent-band-layout td\.accent-band-copy[\s\S]*?width:65% !important/i,
  'Accent band must ship base CSS table-cell column width for desktop/Outlook',
);
assert.match(
  accentBandCtaExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*?\.accent-band-layout td\.accent-band-copy[\s\S]*?display:table-cell!important/i,
  'Accent band must keep columns side-by-side above mobile breakpoint',
);
assert.match(
  accentBandCtaExport,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.accent-band-layout td\.accent-band-copy[\s\S]*?display:block!important/i,
  'Mobile accent band columns must stack to full width',
);
assert.doesNotMatch($accentBandCta('.accent-band').html() || '', /<!--\[if mso\]/i, 'Accent band must not rely on MSO-only desktop columns');
assert.match(
  accentBandCtaExport,
  /u\s*\+\s*\.body \.accent-band-layout td\.accent-band-copy[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep accent band side-by-side via table cells',
);
assert.match(
  accentBandCtaExport,
  /u\s*\+\s*\.body \.accent-band-stack > div[\s\S]*?width:\s*100%\s*!important/i,
  'Gmail must neutralize Dynamics send-time flex shells inside accent band columns',
);
assert.match(
  accentBandCtaExport,
  /\.ExternalClass \.accent-band-layout td\.accent-band-copy[\s\S]*?display:block!important/i,
  'Outlook.com web must stack accent band columns to avoid button overlap',
);
assert.match(
  accentBandCtaExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*u\s*\+\s*\.body \.ExternalClass \.accent-band-layout td\.accent-band-copy[\s\S]*?display:block!important/i,
  'Outlook.com OWA stack rules must follow min-width:481px table-cell rules',
);
assert.match(
  accentBandCtaExport,
  /u\s*\+\s*\.body \.ExternalClass \.accent-band-layout td\.accent-band-copy[\s\S]*?display:block!important/i,
  'Outlook.com web must beat u+.body table-cell side-by-side on accent band',
);
assert.match(
  accentBandCtaExport,
  /u\s*\+\s*\.body \.ExternalClass \.accent-band \[data-container="true"\][\s\S]*?width:100%!?important/i,
  'Outlook.com web must neutralize Dynamics flex shells inside accent band',
);
const accentBandCtaPasted = simulateDynamicsPaste(accentBandCtaExport);
const $accentBandCtaPasted = cheerio.load(accentBandCtaPasted, { xml: false }, false);
assert.match($accentBandCtaPasted('td.accent-band-copy').attr('width') || '', /65%/i, 'Dynamics paste must keep accent band copy percentage width');

const stepsHorizontalExport = buildEmailHtml({
  title: 'Steps horizontal audit',
  modules: ['steps-horizontal'],
  annotate: false,
});
const $stepsHorizontal = cheerio.load(stepsHorizontalExport, { xml: false }, false);
assert.strictEqual($stepsHorizontal('.steps-horizontal-section').length, 1);
assert.strictEqual($stepsHorizontal('td.step-stack').length, 3);
assert.strictEqual($stepsHorizontal('td.step-arrow-cell').length, 2);
assert.strictEqual($stepsHorizontal('.step-stack.three-up-cell').length, 0, 'Steps must not use three-up-cell class');
assert.strictEqual($stepsHorizontal('td.step-stack [data-editorblocktype="Text"]').length, 3, 'Steps must use one text block per column');
assert.match($stepsHorizontal('td.step-stack').first().attr('width') || '', /30%/i);
assert.match(
  stepsHorizontalExport,
  /\.steps-horizontal-layout td\.step-stack[\s\S]*?width:30% !important/i,
  'Steps must ship base CSS table-cell column width for desktop/Outlook',
);
assert.match(
  stepsHorizontalExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*?\.steps-horizontal-layout td\.step-stack[\s\S]*?display:table-cell!important/i,
  'Steps must keep columns side-by-side above mobile breakpoint',
);
assert.match(
  stepsHorizontalExport,
  /u\s*\+\s*\.body \.steps-horizontal-layout td\.step-stack[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep steps side-by-side via table cells',
);
assert.match(
  stepsHorizontalExport,
  /u\s*\+\s*\.body \.step-stack > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center Dynamics send-time flex shells inside step columns',
);
assert.doesNotMatch($stepsHorizontal('.steps-horizontal-section').html() || '', /tbContainer multi/i, 'Steps must not use Dynamics editable-column table');

const statsThreeExport = buildEmailHtml({
  title: 'Stats three audit',
  modules: ['stats-three'],
  annotate: false,
});
const $statsThree = cheerio.load(statsThreeExport, { xml: false }, false);
assert.strictEqual($statsThree('.stats-three-section').length, 1);
assert.strictEqual($statsThree('.stat-stack').length, 3);
assert.strictEqual($statsThree('td.stat-stack').length, 3, 'Stats must use table cells for three-column desktop layout');
assert.strictEqual($statsThree('.stats-three-layout tr').length, 1);
assert.strictEqual($statsThree('.stat-stack.three-up-cell').length, 0, 'Stats must not reuse three-up-cell mobile stack class');
assert.match($statsThree('.stat-stack').first().attr('width') || '', /33\.33%/i, 'Stats table cells must ship width="33.33%"');
assert.match($statsThree('.stat-stack').first().attr('style') || '', /text-align:center/i, 'Stats must keep text-align center inline');
assert.match($statsThree('.stat-number').first().attr('style') || '', /text-align:center/i, 'Stats numbers must center over labels');
assert.match($statsThree('.stat-number').first().attr('style') || '', /line-height:34px/i, 'Stats numbers must use pixel line-height for Outlook desktop');
assert.match($statsThree('.stat-label').first().attr('style') || '', /line-height:16px/i, 'Stats labels must use pixel line-height for Outlook desktop');
assert.strictEqual($statsThree('.stat-stack [data-editorblocktype="Text"]').length, 3, 'Stats must use one editor block per column');
assert.match(
  statsThreeExport,
  /\.stats-three-section td\.stat-stack[\s\S]*?width:33\.33% !important/i,
  'Stats must ship base CSS table-cell column width for desktop/Outlook',
);
assert.match(
  statsThreeExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*?\.stats-three-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Stats must keep three columns side-by-side above mobile breakpoint',
);
assert.match(
  statsThreeExport,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.stats-three-section td\.stat-stack[\s\S]*?display:block!important/i,
  'Mobile stats must stack to full width',
);
const statsThreeSectionHtml = $statsThree('.stats-three-section').html() || '';
assert.doesNotMatch(statsThreeSectionHtml, /<!--\[if mso\]/i, 'Stats three must not rely on MSO-only desktop columns');
assert.match(
  statsThreeExport,
  /@media only screen and \(max-width:\s*480px\)[\s\S]*?\.stats-three-section td\.stat-stack[\s\S]*?width:\s*100%!?important;/i,
  'Mobile stats must stack to full width',
);
assert.match(
  statsThreeExport,
  /u\s*\+\s*\.body \.stats-three-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep stats side-by-side via table cells',
);
assert.match(
  statsThreeExport,
  /u\s*\+\s*\.body[\s\S]*?\.stats-three-section[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center stats numbers and labels',
);
assert.match(
  statsThreeExport,
  /u\s*\+\s*\.body \.stat-stack > div[\s\S]*?width:\s*100%\s*!important/i,
  'Gmail must neutralize Dynamics send-time flex shells inside stat columns',
);
assert.match(
  statsThreeExport,
  /u\s*\+\s*\.body \.stats-three-section td\.stat-stack[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center stat table cells',
);

const statsFourExport = buildEmailHtml({
  title: 'Stats four audit',
  modules: ['stats-four'],
  annotate: false,
});
const $statsFour = cheerio.load(statsFourExport, { xml: false }, false);
assert.strictEqual($statsFour('.stats-four-section').length, 1);
assert.strictEqual($statsFour('td.stat-stack').length, 4);
assert.strictEqual($statsFour('.stat-stack [data-editorblocktype="Text"]').length, 4);
assert.match($statsFour('.stat-stack').first().attr('width') || '', /25%/i);
assert.match($statsFour('.stat-stack').first().attr('style') || '', /text-align:center/i);
assert.match(statsFourExport, /\.stats-four-section td\.stat-stack[\s\S]*?width:25% !important/i);
assert.match(
  statsFourExport,
  /@media only screen and \(min-width:\s*481px\)[\s\S]*?\.stats-four-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Stats four must keep four columns side-by-side above mobile breakpoint',
);
assert.doesNotMatch($statsFour('.stats-four-section').html() || '', /<!--\[if mso\]/i, 'Stats four must not rely on MSO-only desktop columns');
assert.match(
  statsFourExport,
  /u\s*\+\s*\.body \.stats-four-section td\.stat-stack[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep stats four side-by-side via table cells',
);
assert.match(
  statsFourExport,
  /u\s*\+\s*\.body \.stat-stack > div[\s\S]*?width:\s*100%\s*!important/i,
  'Gmail must neutralize Dynamics send-time flex shells inside four-up stat columns',
);

const featureCardsFourExport = buildEmailHtml({
  title: 'Feature cards four audit',
  modules: ['feature-cards-four'],
  annotate: false,
});
const $featureCardsFour = cheerio.load(featureCardsFourExport, { xml: false }, false);
assert.strictEqual($featureCardsFour('.feature-cards-four-section').length, 1);
assert.strictEqual($featureCardsFour('.feature-cards-web-grid').length, 1, 'Feature cards must ship web pair-row grid for OWA/Gmail');
assert.strictEqual($featureCardsFour('.feature-cards-web-grid .feature-cards-pair').length, 2, 'Web grid must use two pair-row tables');
assert.strictEqual($featureCardsFour('.feature-cards-web-grid td.feature-card-cell').length, 4, 'Web grid must have four card cells');
assert.strictEqual($featureCardsFour('.feature-card-solo-wrap').length, 0, 'Fixed-height solo wraps must be removed');
assert.strictEqual($featureCardsFour('.feature-cards-desktop-grid').length, 0, 'Feature cards must not ship a CSS-toggled desktop grid to web clients');
assert.strictEqual($featureCardsFour('.feature-card').length, 4);
assert.strictEqual($featureCardsFour('.feature-card-accent').length, 4);
assert.strictEqual($featureCardsFour('.feature-cards-web-grid [data-editorblocktype="Text"]').length, 4, 'Web grid must use one text block per card');
assert.strictEqual($featureCardsFour('.feature-cards-four-section.columns-equal-class').length, 0, 'Feature cards must not ship columns-equal-class');
assert.match(
  featureCardsFourExport,
  /<!--\[if !mso\]><!-->[\s\S]*?feature-cards-web-grid[\s\S]*?<!--<!\[endif\]-->/i,
  'Feature cards must keep non-MSO pair-row grid for Outlook Web / mobile / Gmail',
);
assert.match(
  featureCardsFourExport,
  /<!--\[if mso\]>[\s\S]*?feature-cards-mso-grid[\s\S]*?<!\[endif\]-->/i,
  'Feature cards must ship MSO-only desktop grid for Outlook desktop app',
);
assert.doesNotMatch(
  featureCardsFourExport,
  /<!--\[if !mso\]><!-->[\s\S]*?feature-cards-desktop-grid[\s\S]*?<!--<!\[endif\]-->/i,
  'Non-MSO clients must not receive a second desktop grid copy',
);
assert.match(
  featureCardsFourExport,
  /\.feature-cards-four-section \.feature-cards-web-grid\{[^}]*display:table!important/i,
  'Feature cards must ship visible web pair-row styles',
);
assert.match(
  featureCardsFourExport,
  /\.feature-cards-four-section \.feature-card-body[\s\S]*?\[data-container="true"\]/i,
  'Feature cards must neutralize Dynamics flex containers inside card bodies',
);
assert.match(
  featureCardsFourExport,
  /feature-cards-mso-grid[\s\S]*?height:\s*220px/i,
  'Outlook desktop MSO block must fix feature card body height for uniform rows',
);
assert.match(
  featureCardsFourExport,
  /\.feature-cards-web-grid td\.feature-card-cell[\s\S]*?display:table-cell!important/i,
  'Outlook on the web must keep pair cells as table-cell for row equal-height',
);
assert.doesNotMatch(
  featureCardsFourExport,
  /\.feature-cards-web-grid[\s\S]{0,400}?height:280px!important/i,
  'Web pair rows must not use fixed card body heights',
);
assert.match(
  featureCardsFourExport,
  /@media only screen and \(max-device-width:\s*640px\)[\s\S]*?\.feature-cards-web-grid td\.feature-card-cell[\s\S]*?display:block!important/i,
  'Phones must stack pair cells via max-device-width only',
);
{
  // Strip max-device-width phone overrides, then ensure viewport max-width does not
  // restack web pair cells (that would collapse OWA laptop reading panes).
  const withoutPhoneOverride = featureCardsFourExport.replace(
    /@media only screen and \(max-device-width:\s*640px\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/gi,
    '',
  );
  assert.doesNotMatch(
    withoutPhoneOverride,
    /@media only screen and \(max-width:\s*480px\)[\s\S]{0,1200}?\.feature-cards-four-section td\.feature-card-cell[\s\S]{0,120}?display:\s*block!important/i,
    'Do not restack feature cards via max-width — Outlook Web laptop panes would stack',
  );
}
assert.doesNotMatch($featureCardsFour('.feature-cards-four-section').html() || '', /tbContainer multi/i, 'Feature cards must not use Dynamics editable-column table');

const threeUpProductsExport = buildEmailHtml({
  title: 'Three up products audit',
  modules: ['three-up-products'],
  annotate: false,
});
const $threeUpProducts = cheerio.load(threeUpProductsExport, { xml: false }, false);
assert.strictEqual($threeUpProducts('.three-up-products-section').length, 1);
assert.strictEqual($threeUpProducts('td.product-stack').length, 3);
assert.strictEqual($threeUpProducts('.product-stack.three-up-cell').length, 0, 'Products must not use three-up-cell class');
assert.strictEqual($threeUpProducts('.product-stack [data-editorblocktype="Text"]').length, 3, 'Products must use one text block per column');
assert.match(threeUpProductsExport, /\.three-up-products-section td\.product-stack[\s\S]*?width:33\.33% !important/i);
assert.match(
  threeUpProductsExport,
  /u\s*\+\s*\.body \.three-up-products-section td\.product-stack[\s\S]*?display:table-cell!important/i,
  'Gmail desktop must keep three-up products side-by-side via table cells',
);
assert.match(
  threeUpProductsExport,
  /u\s*\+\s*\.body \.product-stack > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center Dynamics send-time flex shells inside product columns',
);
assert.doesNotMatch($threeUpProducts('.three-up-products-section').html() || '', /<!--\[if mso\]/i, 'Three products must not rely on MSO-only desktop columns');

const quoteCenteredExport = buildEmailHtml({
  title: 'Quote centered audit',
  modules: ['quote-centered'],
  annotate: false,
});
assert.match(
  quoteCenteredExport,
  /u\s*\+\s*\.body \.quote-centered-section \.section-pad > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center quote-centered Dynamics flex shells',
);

const ctaTextLinkExport = buildEmailHtml({
  title: 'CTA text link audit',
  modules: ['cta-text-link'],
  annotate: false,
});
const $ctaTextLink = cheerio.load(ctaTextLinkExport, { xml: false }, false);
assert.strictEqual($ctaTextLink('.cta-text-link-section').length, 1);
assert.strictEqual($ctaTextLink('.cta-text-link-section center').length, 1);
assert.strictEqual($ctaTextLink('.text-link-cta').attr('align'), 'center');
assert.match($ctaTextLink('.text-link-cta').attr('style') || '', /text-align:center/i);
assert.match(
  ctaTextLinkExport,
  /u\s*\+\s*\.body[\s\S]*?\.cta-text-link-section[\s\S]*?\.text-link-cta[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center text link CTAs',
);
assert.match(
  ctaTextLinkExport,
  /u\s*\+\s*\.body \.cta-text-link-cell > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail must center Dynamics send-time flex wrapper around text link CTA',
);
assert.match(
  ctaTextLinkExport,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.cta-text-link-cell > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail mobile must center text link CTA flex shells without u+.body',
);
assert.match(
  headlineH2CenterExport,
  /@media only screen and \(max-width:\s*640px\)[\s\S]*?\.headline-block-center-cell > div[\s\S]*?text-align\s*:\s*center\s*!important/i,
  'Gmail mobile must center headline block flex shells without u+.body',
);

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

$fallback('.three-up-benefits-section .benefit-stack').each((_, cell) => {
  assert.match($fallback(cell).attr('style') || '', /text-align:center/i, 'No-media three-up must keep centered stacks');
});
assert.match(
  allModulesNoMedia,
  /<!--\[if mso\][\s\S]*?benefit-stack/i,
  'No-media three-up must keep MSO desktop column wrapper',
);
assert.strictEqual(
  $fallback('.three-up-benefits-section .three-up-benefits-layout').length,
  1,
  'No-media three-up must keep a single benefits layout table',
);
assert.strictEqual(
  $fallback('.three-up-benefits-section .benefit-stack').length,
  3,
  'No-media three-up must keep three benefit stacks',
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
assert(
  !/\[if !mso\]/i.test(
    allModulesExport.replace(
      /<!--\[if !mso\]><!-->\s*<table class="feature-cards-web-grid"[\s\S]*?<!--<!\[endif\]-->\s*<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi,
      '',
    ),
  ),
  'Non-MSO wrappers must not survive export (except feature-cards dual layout)',
);
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
