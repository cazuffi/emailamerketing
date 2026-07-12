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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureStyle($el, fragment) {
  const style = $el.attr('style') || '';
  const parts = fragment.split(';').map((s) => s.trim()).filter(Boolean);
  let next = style;
  for (const part of parts) {
    const prop = part.split(':')[0].trim().toLowerCase();
    if (new RegExp(`(?:^|;)\\s*${escapeRegex(prop)}\\s*:`, 'i').test(next)) continue;
    next = mergeStyle(next, part);
  }
  if (next !== style) $el.attr('style', next);
}

function setStyleProp($el, prop, value) {
  const style = $el.attr('style') || '';
  const re = new RegExp(`(^|;)\\s*${escapeRegex(prop)}\\s*:[^;]*;?`, 'gi');
  const stripped = style
    .replace(re, (_, separator) => separator)
    .trim()
    .replace(/;+\s*$/, '');
  const next = stripped ? `${stripped};${prop}:${value}` : `${prop}:${value}`;
  $el.attr('style', next);
}

function removeStyleProp($el, prop) {
  const style = $el.attr('style') || '';
  if (!style) return;
  const re = new RegExp(`(^|;)\\s*${escapeRegex(prop)}\\s*:[^;]*;?`, 'gi');
  const next = style
    .replace(re, (_, separator) => separator)
    .trim()
    .replace(/;+\s*$/, '');
  $el.attr('style', next);
}

function hardenButtons($) {
  $('a.buttonClass, a.button-primary, a.button-outline-link').each((_, el) => {
    const $a = $(el);
    const isOutline = $a.hasClass('button-outline-link');
    if (isOutline) {
      ensureStyle($a, 'display:block;font-weight:bold;mso-ansi-font-weight:bold;background-color:#ffffff;border:0;mso-padding-alt:0');
    } else {
      $a.addClass('button-primary');
      // Fill on the anchor (mobile/Gmail/Apple) AND the td (Outlook desktop).
      // Same color, so Outlook's text-only anchor paint blends into the td.
      setStyleProp($a, 'background-color', '#ef7800');
      setStyleProp($a, 'background', '#ef7800');
      ensureStyle($a, 'display:block;font-weight:bold;mso-ansi-font-weight:bold;color:#ffffff;border:0;mso-padding-alt:0');
      const label = ($a.children('span').length ? $a.children('span').first().text() : $a.text()).trim();
      $a.empty();
      $a.append($('<span></span>').text(label));
      $a.children('span').each((__, span) => {
        const $span = $(span);
        setStyleProp($span, 'color', '#ffffff');
        setStyleProp($span, 'font-weight', 'bold');
        removeStyleProp($span, 'background-color');
        removeStyleProp($span, 'background');
      });
    }
    ensureStyle($a, 'text-decoration:none;text-align:center');
  });

  $('.buttonCell').each((_, el) => {
    const $cell = $(el);
    $cell.attr('bgcolor', '#ef7800');
    $cell.attr('align', 'center');
    // The td carries the fill for Outlook desktop (bgcolor + mso-padding-alt).
    // No real `padding` here or modern clients double it with anchor padding.
    removeStyleProp($cell, 'padding');
    ensureStyle($cell, 'background-color:#ef7800;border:1px solid #ef7800;mso-shading:#ef7800;mso-pattern:auto');
    setStyleProp($cell, 'mso-padding-alt', '14px 28px');
  });
  $('.button-outline-cell').each((_, el) => {
    const $cell = $(el);
    $cell.attr('bgcolor', '#ffffff');
    $cell.attr('align', 'center');
    removeStyleProp($cell, 'padding');
    ensureStyle($cell, 'border:2px solid #ef7800;background-color:#ffffff;mso-shading:#ffffff;mso-pattern:auto');
    setStyleProp($cell, 'mso-padding-alt', '14px 28px');
  });

  $('.buttonWrapper[align="right"]').each((_, el) => {
    const $wrap = $(el);
    $wrap.attr('align', 'right');
    ensureStyle($wrap, 'text-align:right');
    $wrap.find('.buttonTable, .button-outline-table').first().each((__, table) => {
      const $table = $(table);
      ensureStyle($table, 'margin-left:auto;margin-right:0');
    });
  });

  $('.cta-band-grey .cta-band-grey-button .buttonWrapper').each((_, el) => {
    const $wrap = $(el);
    setStyleProp($wrap, 'width', '100%');
    setStyleProp($wrap, 'max-width', '160px');
    $wrap.find('.buttonTable').first().each((__, table) => {
      const $table = $(table);
      $table.attr('width', '160');
      setStyleProp($table, 'width', '100%');
      setStyleProp($table, 'max-width', '160px');
      setStyleProp($table, 'margin-left', 'auto');
      setStyleProp($table, 'margin-right', '0');
    });
    $wrap.find('a.buttonClass').each((__, link) => {
      const $link = $(link);
      setStyleProp($link, 'width', 'auto');
      setStyleProp($link, 'padding', '14px 16px');
      setStyleProp($link, 'white-space', 'normal');
      setStyleProp($link, 'overflow-wrap', 'break-word');
      setStyleProp($link, 'word-break', 'normal');
    });
    $wrap.find('.buttonCell').each((__, cell) => {
      setStyleProp($(cell), 'mso-padding-alt', '14px 16px');
    });
  });

  $('.compact-button-column .buttonWrapper').each((_, el) => {
    const $wrap = $(el);
    $wrap.find('.buttonTable, .button-outline-table').each((__, table) => {
      const $table = $(table);
      $table.attr('width', '100%');
      setStyleProp($table, 'width', '100%');
      setStyleProp($table, 'table-layout', 'fixed');
    });
    $wrap.find('a.buttonClass, a.button-outline-link').each((__, link) => {
      const $link = $(link);
      setStyleProp($link, 'display', 'block');
      setStyleProp($link, 'width', 'auto');
      setStyleProp($link, 'padding', '14px 12px');
      setStyleProp($link, 'white-space', 'normal');
      setStyleProp($link, 'overflow-wrap', 'break-word');
    });
    $wrap.find('.buttonCell').each((__, cell) => {
      setStyleProp($(cell), 'mso-padding-alt', '14px 12px');
    });
  });

  $('.cta-dual-section .containerWrapper').each((_, table) => {
    setStyleProp($(table), 'table-layout', 'fixed');
  });

  $('.cta-dual-section .buttonWrapper').each((_, el) => {
    const $wrap = $(el);
    $wrap.attr('align', 'center');
    ensureStyle($wrap, 'text-align:center;display:block;width:100%');
    $wrap.find('.buttonTable, .button-outline-table').each((__, table) => {
      const $table = $(table);
      $table.attr('width', '100%');
      ensureStyle($table, 'width:100%');
      setStyleProp($table, 'table-layout', 'fixed');
      $table.find('.buttonCell, .button-outline-cell').each((___, cell) => {
        const $cell = $(cell);
        setStyleProp($cell, 'width', '100%');
        setStyleProp($cell, 'box-sizing', 'border-box');
        if ($cell.hasClass('buttonCell')) {
          setStyleProp($cell, 'background-color', '#ef7800');
          setStyleProp($cell, 'border', '1px solid #ef7800');
          setStyleProp($cell, 'mso-padding-alt', '14px 28px');
        } else {
          setStyleProp($cell, 'background-color', '#ffffff');
          setStyleProp($cell, 'border', '2px solid #ef7800');
          setStyleProp($cell, 'mso-padding-alt', '14px 28px');
        }
      });
      $table.find('a.buttonClass, a.button-outline-link').each((___, link) => {
        const $link = $(link);
        setStyleProp($link, 'display', 'block');
        setStyleProp($link, 'width', 'auto');
        setStyleProp($link, 'padding', '14px 28px');
        setStyleProp($link, 'box-sizing', 'border-box');
        setStyleProp($link, 'min-height', '48px');
      });
    });
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

function hasBackgroundStyle($el) {
  return /(?:^|;)\s*background(?:-color)?\s*:/i.test($el.attr('style') || '');
}

function hardenSectionBackgrounds($) {
  $('[data-layout="true"]').each((_, layout) => {
    const $layout = $(layout);
    setStyleProp($layout, 'background-color', '#ffffff');
    $layout.children('[data-section="true"]').each((__, section) => {
      const $section = $(section);
      if (hasBackgroundStyle($section)) return;
      setStyleProp($section, 'background-color', '#ffffff');
      $section.children('table.outer').first().each((___, table) => {
        const $table = $(table);
        if (hasBackgroundStyle($table)) return;
        $table.attr('bgcolor', '#ffffff');
        setStyleProp($table, 'background-color', '#ffffff');
      });
    });
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

const DIVIDER_LINE_STYLE =
  'height:2px;line-height:2px;font-size:2px;mso-line-height-rule:exactly;background-color:#ef7800;border:0;padding:0';
const DIVIDER_DOT_STYLE =
  'width:6px;height:6px;background-color:#ef7800;font-size:0;line-height:0;mso-line-height-rule:exactly;padding:0;border:0';

function isOrangeBorderTop(style) {
  return /border-top:\s*2px\s+solid\s+(#ef7800|rgb\(\s*239\s*,\s*120\s*,\s*0\s*\))/i.test(style || '');
}

function hardenDividers($) {
  $('.divider-line-cell, .section-rule-cell').each((_, el) => {
    const $el = $(el);
    $el.attr('bgcolor', '#ef7800');
    $el.attr('height', '2');
    ensureStyle($el, DIVIDER_LINE_STYLE);
    if (!$el.html()?.trim()) $el.html('&nbsp;');
  });

  $('.divider-dot-cell').each((_, el) => {
    const $el = $(el);
    $el.attr('bgcolor', '#ef7800');
    $el.attr('height', '6');
    $el.attr('width', '6');
    ensureStyle($el, DIVIDER_DOT_STYLE);
    if (!$el.html()?.trim()) $el.html('&nbsp;');
  });

  $('[data-editorblocktype="Divider"] td, [data-editorblocktype="Divider"] th').each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('divider-line-cell') || $el.hasClass('divider-dot-cell') || $el.hasClass('divider-dot-gap')) return;
    const style = $el.attr('style') || '';
    if (!isOrangeBorderTop(style)) return;
    $el.attr('bgcolor', '#ef7800');
    $el.attr('height', '2');
    const cleaned = style
      .replace(/border-top:\s*2px\s+solid\s+[^;]+;?/gi, '')
      .replace(/font-size:\s*0;?/gi, '')
      .replace(/line-height:\s*0;?/gi, '');
    $el.attr('style', mergeStyle(cleaned, DIVIDER_LINE_STYLE));
    $el.find('p').remove();
    if (!$el.html()?.trim()) $el.html('&nbsp;');
  });

  $('div.section-rule').each((_, el) => {
    const $div = $(el);
    $div.replaceWith(
      '<table align="center" cellpadding="0" cellspacing="0" border="0" role="presentation" class="section-rule-table" style="margin:0 auto 12px auto;"><tr><td width="48" height="2" class="section-rule-cell" bgcolor="#ef7800" style="width:48px;height:2px;line-height:2px;font-size:2px;mso-line-height-rule:exactly;background-color:#ef7800;border:0;padding:0;">&nbsp;</td></tr></table>'
    );
  });
}

function isHiddenStyle(style) {
  return /display\s*:\s*none/i.test(style || '');
}

function stripStudioMetadata($) {
  $('*').each((_, el) => {
    const $el = $(el);
    const attribs = el.attribs || {};
    for (const key of Object.keys(attribs)) {
      if (key.startsWith('data-studio')) {
        $el.removeAttr(key);
      }
    }
  });
}

function removeHiddenElements($) {
  let changed = true;
  while (changed) {
    changed = false;
    $('*').each((_, el) => {
      const $el = $(el);
      if ($el.is('style, head, title, meta, link')) return;
      if (!isHiddenStyle($el.attr('style'))) return;
      $el.remove();
      changed = true;
    });
  }

  $('[data-editorblocktype]').each((_, el) => {
    const $block = $(el);
    const hasVisibleText = normalizeText($block.text()).length > 0;
    const hasMedia = $block.find('img, table, a.buttonClass, a.button-outline-link, v\\:roundrect, roundrect').length > 0;
    if (!hasVisibleText && !hasMedia) {
      $block.remove();
    }
  });
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function hardenHeaderAlignment($) {
  $('.header-tagline-cell').each((_, el) => {
    const $cell = $(el);
    $cell.attr('align', 'right');
    $cell.attr('valign', 'middle');
    setStyleProp($cell, 'vertical-align', 'middle');
    ensureStyle($cell, 'text-align:right');
  });

  $('.header-standard-section .header-tagline-cell [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    $block.attr('align', 'right');
    ensureStyle($block, 'text-align:right;width:100%');
  });

  $('.header-tagline-cell [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    $block.attr('align', 'right');
    ensureStyle($block, 'text-align:right;width:100%');
  });

  $('.header-tagline, .header-tagline-cell p').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'right');
    ensureStyle($el, 'text-align:right;width:100%');
  });
}

function hardenFooterAlignment($) {
  $('.orange-footer .section-pad-accent, .orange-footer .footer-band-content').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center');
  });

  $('.orange-footer [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    $block.attr('align', 'center');
    ensureStyle($block, 'text-align:center;width:100%');
  });

  $('.orange-footer .footer-band-title, .orange-footer .footer-band-address p, .orange-footer .footer-band-contact p').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;width:100%');
  });

  $('.footer-legal, .footer-legal p, .footer-legal a, .contentBlockWrapper').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center');
  });
}

function hardenEmailHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const $ = cheerio.load(html, { xml: false }, false);
  hardenTables($);
  hardenSectionBackgrounds($);
  hardenImages($);
  hardenButtons($);
  hardenTypography($);
  hardenSmallText($);
  hardenDividers($);
  hardenD365Containers($);
  hardenHeaderAlignment($);
  hardenFooterAlignment($);
  return $.html();
}

function parseContainerWidthPct($el) {
  const style = $el.attr('style') || '';
  const styleMatch = style.match(/width\s*:\s*(\d+(?:\.\d+)?)\s*%/i);
  const widthAttr = $el.attr('width') || '';
  const attrMatch = String(widthAttr).match(/(\d+(?:\.\d+)?)/);
  const pct = styleMatch ? parseFloat(styleMatch[1]) : attrMatch ? parseFloat(attrMatch[1]) : null;
  if (pct == null || Number.isNaN(pct)) return null;
  if (Math.abs(pct - 33) < 1) return '33.33';
  return pct.toFixed(2);
}

function hardenD365Containers($) {
  $('.tbContainer.multi').each((_, table) => {
    const $table = $(table);
    // Responsive data tables use column classes for mobile stacking, but their
    // cells are not editable D365 layout containers.
    if ($table.hasClass('specs-table')) return;
    // The known-good D365 header is a plain two-cell table. Marking its cells
    // as designer containers changes their widths during the send transform.
    if ($table.closest('.header-standard-section').length) return;
    const $section = $table.closest('[data-section="true"]');
    const $directCells = $table
      .children('tbody')
      .children('tr')
      .children('th, td')
      .add($table.children('tr').children('th, td'));
    const explicitlyEditable =
      $section.hasClass('columns-equal-class') ||
      $directCells.filter('[data-container="true"]').length > 0;
    if (!explicitlyEditable) return;

    if ($section.length) $section.addClass('columns-equal-class');
    $table.addClass('containerWrapper');
    ensureStyle($table, 'width:100%;border-collapse:collapse');

    $directCells.each((__, cell) => {
      const $cell = $(cell);
      const cls = $cell.attr('class') || '';
      if (!cls.includes('columnContainer') && !cls.includes('stack-column')) return;
      if (!$cell.attr('data-container')) $cell.attr('data-container', 'true');
      if (!$cell.attr('role')) $cell.attr('role', 'presentation');
    });
  });

  $('[data-container="true"]').each((_, cell) => {
    const $cell = $(cell);
    const current = parseFloat($cell.attr('data-container-width'));
    const width = Number.isFinite(current) ? current.toFixed(2) : parseContainerWidthPct($cell);
    if (width) $cell.attr('data-container-width', width);
    if (!$cell.attr('role')) $cell.attr('role', 'presentation');
  });

  $('[data-editorblocktype="Button"]').each((_, el) => {
    const $btn = $(el);
    ensureStyle($btn, 'display:block');
    if ($btn.attr('align')) ensureStyle($btn, `text-align:${$btn.attr('align')}`);
  });
}

function flattenOutlookConditionals(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html.replace(/<!--\[if !mso\]><!-->\s*/gi, '');
  out = out.replace(/\s*<!--<!\[endif\]-->/gi, '');
  out = out.replace(/<!--\[if mso\]>\s*<v:roundrect[\s\S]*?<!\[endif\]-->\s*/gi, '');
  return out;
}

function sanitizeExportHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const flattened = flattenOutlookConditionals(html);
  const $ = cheerio.load(flattened, { xml: false }, false);
  removeHiddenElements($);
  stripStudioMetadata($);
  hardenD365Containers($);
  hardenButtons($);
  hardenHeaderAlignment($);
  hardenFooterAlignment($);
  return flattenOutlookConditionals($.html());
}

module.exports = { hardenEmailHtml, sanitizeExportHtml };
