/**
 * Final pass on assembled email HTML for Outlook, Gmail, and Apple Mail.
 */
const cheerio = require('cheerio');

const SMALL_TEXT_CLASSES = [
  'disclaimer-text',
  'preheader-text',
  'caption-text',
  'stat-label',
  'specs-label',
  'faq-answer',
  'footer-band-address',
  'footer-legal',
];

function mergeStyle(existing, additions) {
  const base = (existing || '').trim().replace(/;+\s*$/, '');
  const add = additions.trim().replace(/^;+|;+$/g, '');
  if (!base) return add;
  if (!add) return base;
  return `${base};${add}`;
}

function ensureStyle($el, fragment) {
  const style = $el.attr('style') || '';
  const parts = fragment.split(';').map((s) => s.trim()).filter(Boolean);
  let next = style;
  for (const part of parts) {
    const prop = part.split(':')[0].trim().toLowerCase();
    if (new RegExp(`${prop}\\s*:`, 'i').test(next)) continue;
    next = mergeStyle(next, part);
  }
  if (next !== style) $el.attr('style', next);
}

function hardenButtons($) {
  $('a.button-primary, a.buttonClass.button-primary').each((_, el) => {
    const $a = $(el);
    ensureStyle($a, 'font-weight:bold;mso-ansi-font-weight:bold;border:1px solid #ef7800;mso-padding-alt:0');
    const href = $a.attr('href') || '#';
    const label = $a.text().trim() || 'Button label';
    $a.closest('.buttonCell').find('v\\:roundrect, roundrect').each((__, vml) => {
      const $v = $(vml);
      $v.attr('href', href);
      const center = $v.find('center').first();
      if (center.length) center.text(label);
    });
  });

  $('a.button-outline-link').each((_, el) => {
    const $a = $(el);
    ensureStyle($a, 'font-weight:bold;mso-ansi-font-weight:bold;background-color:#ffffff;border:0;mso-padding-alt:0');
    const href = $a.attr('href') || '#';
    const label = $a.text().trim() || 'Button label';
    $a.closest('.button-outline-cell').find('v\\:roundrect, roundrect').each((__, vml) => {
      const $v = $(vml);
      $v.attr('href', href);
      const center = $v.find('center').first();
      if (center.length) center.text(label);
    });
  });

  $('.buttonCell').each((_, el) => {
    ensureStyle($(el), 'mso-padding-alt:0;border:1px solid #ef7800');
  });
  $('.button-outline-cell').each((_, el) => {
    ensureStyle($(el), 'mso-padding-alt:0;border:2px solid #ef7800;background-color:#ffffff');
  });
}

function hardenImages($) {
  $('img').each((_, el) => {
    const $img = $(el);
    ensureStyle($img, 'display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic');
    if (!$img.attr('alt')) $img.attr('alt', '');
  });
  $('img.header-logo-img, .header-logo-cell img').each((_, el) => {
    const $img = $(el);
    const w = Number($img.attr('width')) || 200;
    ensureStyle($img, `width:${w}px;max-width:${w}px;height:auto`);
    if (!$img.attr('height')) {
      const srcW = 400;
      const srcH = 45;
      $img.attr('height', String(Math.round((srcH / srcW) * w)));
    }
  });
}

function hardenTables($) {
  $('table').each((_, el) => {
    const $t = $(el);
    if ($t.attr('border') === undefined) $t.attr('border', '0');
    if ($t.attr('cellspacing') === undefined) $t.attr('cellspacing', '0');
    if ($t.attr('cellpadding') === undefined) $t.attr('cellpadding', '0');
    ensureStyle($t, 'border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt');
  });
}

function hardenTypography($) {
  $('h1, h3').each((_, el) => {
    ensureStyle($(el), 'font-weight:bold;mso-ansi-font-weight:bold;mso-line-height-rule:exactly');
  });
  $('h2').each((_, el) => {
    ensureStyle($(el), 'mso-line-height-rule:exactly');
  });
  $('p').each((_, el) => {
    ensureStyle($(el), 'mso-line-height-rule:exactly');
  });
  $('b, strong').each((_, el) => {
    ensureStyle($(el), 'font-weight:bold;mso-ansi-font-weight:bold;font-family:ARIALNB,Arial,Helvetica,sans-serif');
  });
  $('[style*="ARIALNB"]').each((_, el) => {
    const $el = $(el);
    if ($el.closest('a.button-primary, a.button-outline-link, .buttonCell, .button-outline-cell').length) return;
    ensureStyle($el, 'font-weight:bold;mso-ansi-font-weight:bold');
  });
}

function hardenSmallText($) {
  $('p.disclaimer-text, p.preheader-text, p.caption-text, p.stat-label, p.faq-answer').each((_, el) => {
    const $p = $(el);
    if (!$p.attr('class')) return;
    const cls = $p.attr('class').split(/\s+/).find((c) => SMALL_TEXT_CLASSES.includes(c));
    if (!cls) return;
    if (cls === 'disclaimer-text') ensureStyle($p, 'font-size:10px;line-height:1.5;color:#999999');
    if (cls === 'preheader-text') ensureStyle($p, 'font-size:11px;line-height:1.4;color:#666666');
    if (cls === 'caption-text') ensureStyle($p, 'font-size:11px;line-height:1.5;color:#666666');
    if (cls === 'stat-label') ensureStyle($p, 'font-size:11px;line-height:1.4');
    if (cls === 'faq-answer') ensureStyle($p, 'font-size:15px;line-height:1.6;color:#333333');
  });
}

function hardenEmailHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const $ = cheerio.load(html, { xml: false }, false);
  hardenTables($);
  hardenImages($);
  hardenButtons($);
  hardenTypography($);
  hardenSmallText($);
  return $.html();
}

module.exports = { hardenEmailHtml };
