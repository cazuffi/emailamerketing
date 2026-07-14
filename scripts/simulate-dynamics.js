/**
 * Simulate what Dynamics 365 Customer Insights does to pasted email HTML when
 * it ingests and sends it. This is a PREVIEW-ONLY transform — it is never part
 * of the exported/Copy-HTML output. Rendering the simulated result in a browser
 * reveals the class of bugs that only appear after Dynamics rewrites the markup
 * (which normal previews miss), e.g. display:block width blowouts, mangled
 * `background:` shorthands, flattened buttons, and flex-wrapped content.
 *
 * Behaviors replicated (verified against real Dynamics-sent HTML):
 *  1. Adds `columns-equal-class` to every section.
 *  2. Sets section `.outer` tables to `width:640px; display:block`.
 *  3. Wraps each editable block in a fixed-width flex `data-container` div.
 *  4. Flattens any surviving `data-editorblocktype="Button"` into a bare anchor.
 *  5. Mangles inline `background:` shorthand into `background-image:initial…`
 *     (dropping the color) — as Dynamics' CSS normalizer does.
 *  6. Normalizes image `max-width` to 100%.
 *
 * Note: this reveals Dynamics-transformation bugs that manifest in a browser.
 * It cannot reproduce Outlook Word engine quirks (font-size in inline-block,
 * block-anchor background painting) — only a real client / Litmus can.
 */
const cheerio = require('cheerio');

const CONTENT_WIDTH = 592; // 640 layout minus typical 24px side padding

function setStyleProp($el, prop, value) {
  const style = $el.attr('style') || '';
  const re = new RegExp(`(^|;)\\s*${prop.replace(/[-]/g, '\\$&')}\\s*:[^;]*;?`, 'gi');
  const stripped = style.replace(re, (_, sep) => sep).trim().replace(/;+\s*$/, '');
  $el.attr('style', stripped ? `${stripped};${prop}:${value}` : `${prop}:${value}`);
}

function simulateDynamicsSend(html) {
  if (!html || typeof html !== 'string') return html;
  const $ = cheerio.load(html, { xml: false }, false);

  // 1. Dynamics tags every ingested section as an equal-columns container.
  $('[data-section="true"]').each((_, el) => $(el).addClass('columns-equal-class'));

  // 2. Section outer tables become fixed-width block elements on send.
  $('table.outer').each((_, el) => {
    const $t = $(el);
    setStyleProp($t, 'width', '640px');
    setStyleProp($t, 'max-width', '640px');
    setStyleProp($t, 'display', 'block');
  });

  // 4. Flatten surviving Button blocks the way Dynamics does (bare anchor, no
  //    table, background shorthand expanded). The export strips the attribute,
  //    so this normally does nothing — but it surfaces regressions.
  $('[data-editorblocktype="Button"]').each((_, el) => {
    const $btn = $(el);
    const $a = $btn.find('a').first();
    if (!$a.length) return;
    const label = ($a.find('span').first().text() || $a.text() || '').trim();
    setStyleProp($a, 'display', 'block');
    setStyleProp($a, 'background-image', 'initial');
    setStyleProp($a, 'background-position', 'initial');
    setStyleProp($a, 'background-color', 'transparent');
    $a.empty();
    $a.append(`<span>${label}</span>`);
    $btn.empty();
    $btn.append($a);
  });

  // 3. Wrap each remaining editable block in a fixed-width flex data-container,
  //    mirroring the Dynamics editor model.
  $('[data-editorblocktype]').each((i, el) => {
    const $el = $(el);
    if (($el.parent().attr('data-container')) === 'true') return;
    $el.wrap(
      `<div data-container="true" id="container-sim-${i}" style="width:${CONTENT_WIDTH}px;flex:0 0 ${CONTENT_WIDTH}px;display:flex;flex-direction:column;"></div>`,
    );
  });

  // 5. Mangle any inline `background:` shorthand that carries a solid color.
  $('[style*="background:"]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const next = style.replace(
      /(^|;)\s*background\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*(!important)?\s*(?=;|$)/gi,
      (_m, sep) => `${sep}background-image:initial;background-position:initial;background-size:initial`,
    );
    if (next !== style) $el.attr('style', next);
  });

  // 6. Normalize image max dimensions.
  $('img').each((_, el) => {
    const $img = $(el);
    setStyleProp($img, 'max-width', '100%');
    setStyleProp($img, 'max-height', '100%');
  });

  return $.html();
}

module.exports = { simulateDynamicsSend };
