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
      const label = ($a.children('span').length ? $a.children('span').first().text() : $a.text()).trim();
      $a.empty();
      $a.append($('<span></span>').text(label));
      $a.children('span').each((__, span) => {
        const $span = $(span);
        setStyleProp($span, 'color', '#ef7800');
        setStyleProp($span, 'font-weight', 'bold');
        setStyleProp($span, 'background-color', '#ffffff');
      });
    } else {
      $a.addClass('button-primary');
      // Fill on the anchor (mobile/Gmail/Apple) AND the td (Outlook desktop).
      // Use ONLY the background-color longhand — Dynamics mangles the
      // `background` shorthand into `background-image:initial…` and drops the
      // color, but it preserves `background-color` (as it does for the badge).
      setStyleProp($a, 'background-color', '#ef7800');
      removeStyleProp($a, 'background');
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

  $('.buttonWrapper[align="center"], .cta-primary-center .buttonWrapper, .cta-outline-center .buttonWrapper').each((_, el) => {
    const $wrap = $(el);
    if ($wrap.closest('.cta-dual-section, .cta-band-grey, .compact-button-column').length) return;
    $wrap.attr('align', 'center');
    ensureStyle($wrap, 'text-align:center;display:block;margin-left:auto;margin-right:auto');
    $wrap.find('.buttonTable, .button-outline-table').first().each((__, table) => {
      const $table = $(table);
      ensureStyle($table, 'margin-left:auto;margin-right:auto');
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
          setStyleProp($cell, 'border', '2px solid #ef7800');
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
    $img.attr('width', String(w));
    $img.removeAttr('height');
    removeStyleProp($img, 'height');
    ensureStyle($img, `display:block;width:${w}px;max-width:${w}px;height:auto;mso-line-height-rule:exactly`);
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

function hardenOrangeFooterSections($) {
  $('.orange-footer[data-section="true"]').each((_, section) => {
    const $section = $(section);
    removeStyleProp($section, 'background-color');
    $section.find('table.outer').first().each((__, table) => {
      const $table = $(table);
      $table.attr('bgcolor', '#ef7800');
      setStyleProp($table, 'background-color', '#ef7800');
      ensureStyle($table, 'margin-left:auto;margin-right:auto;width:100%;max-width:640px');
    });
    $section.find('.section-pad-accent').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#ef7800');
      $cell.attr('align', 'center');
      setStyleProp($cell, 'background-color', '#ef7800');
      ensureStyle($cell, 'text-align:center;width:100%');
    });
  });
}

function hardenLayoutShell($) {
  $('[data-layout="true"]').each((_, layout) => {
    const $layout = $(layout);
    setStyleProp($layout, 'display', 'inline-block');
    setStyleProp($layout, 'vertical-align', 'top');
    setStyleProp($layout, 'text-align', 'left');
    ensureStyle($layout, 'max-width:640px;width:100%;margin:0 auto;background-color:#ffffff');
  });
}

function hardenOuterTableCentering($) {
  $('table.outer').each((_, table) => {
    const $table = $(table);
    $table.attr('align', 'center');
    ensureStyle($table, 'margin-left:auto;margin-right:auto;width:100%;max-width:640px');
  });
}

function hardenAccentSections($) {
  $('.accent-band[data-section="true"]').each((_, section) => {
    const $section = $(section);
    removeStyleProp($section, 'background-color');
    $section.find('table.outer').first().each((__, table) => {
      const $table = $(table);
      $table.attr('bgcolor', '#ef7800');
      setStyleProp($table, 'background-color', '#ef7800');
    });
    $section.find('.section-pad-accent').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#ef7800');
      setStyleProp($cell, 'background-color', '#ef7800');
    });
  });
}

function hardenSectionBackgrounds($) {
  $('[data-layout="true"]').each((_, layout) => {
    const $layout = $(layout);
    setStyleProp($layout, 'background-color', '#ffffff');
    $layout.children('[data-section="true"]').each((__, section) => {
      const $section = $(section);
      if (
        $section.hasClass('accent-band') ||
        $section.hasClass('urgency-band') ||
        $section.hasClass('orange-footer') ||
        $section.hasClass('cta-band-grey')
      ) {
        return;
      }
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
  $('h2').each((_, el) => {
    const $h2 = $(el);
    if ($h2.closest('.accent-band').length) return;
    if ($h2.hasClass('footer-band-title')) return;
    ensureStyle($h2, 'mso-line-height-rule:exactly');
    if (!$h2.hasClass('subhead-orange')) $h2.addClass('subhead-orange');
    setStyleProp($h2, 'color', '#ef7800');
  });
  $('h1, h3').each((_, el) => {
    ensureStyle($(el), 'font-weight:bold;mso-ansi-font-weight:bold;mso-line-height-rule:exactly');
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
    if (cls === 'caption-text') ensureStyle($p, 'font-size:11px;line-height:16px;mso-line-height-rule:at-least;color:#666666');
    if (cls === 'stat-label') ensureStyle($p, 'font-size:11px;line-height:1.4');
    if (cls === 'faq-answer') ensureStyle($p, 'font-size:15px;line-height:1.6;color:#333333');
  });
}

function hardenEmptyImageSubtext($) {
  $('.image-subtext').each((_, el) => {
    const $subtext = $(el);
    const text = ($subtext.text() || '').replace(/\u00a0/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    if (text) return;
    ensureStyle($subtext, 'display:none;mso-hide:all;font-size:0;line-height:0;max-height:0;margin:0;padding:0;overflow:hidden;height:0');
    const $block = $subtext.closest('.image-subtext-block');
    if ($block.length) {
      ensureStyle($block, 'display:none;mso-hide:all;font-size:0;line-height:0;max-height:0;margin:0;padding:0;overflow:hidden;height:0');
    }
  });
}

const DIVIDER_LINE_STYLE =
  'height:2px;line-height:2px;font-size:0;mso-line-height-rule:exactly;background-color:#ef7800;padding:0;border:0;mso-padding-alt:0';
const DIVIDER_IMG_STYLE =
  'display:block;width:100%;max-width:640px;height:2px;min-height:2px;line-height:2px;font-size:0;border:0;outline:none;text-decoration:none;background-color:#ef7800;margin:0;padding:0;-ms-interpolation-mode:bicubic';
const DIVIDER_IMG_SRC =
  'data:image/gif;base64,R0lGODdhAQACAIEAAO94AAAAAAAAAAAAACwAAAAAAQACAAAIBQABAAgIADs=';
const DIVIDER_DOT_STYLE =
  'width:6px;height:6px;background-color:#ef7800;font-size:0;line-height:0;mso-line-height-rule:exactly;padding:0;border:0';

function hardenBodyTextSections($) {
  $('.body-text-section .section-pad-compact').each((_, el) => {
    const $cell = $(el);
    setStyleProp($cell, 'padding', '12px 24px');
  });

  $('.body-text-section [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    ensureStyle($block, 'display:block;width:100%;margin:0;padding:0');
    $block.find('p').each((__, p) => {
      const $p = $(p);
      setStyleProp($p, 'margin', '0');
      ensureStyle($p, 'mso-line-height-rule:exactly');
    });
    $block.find('p + p').each((__, p) => {
      setStyleProp($(p), 'margin-top', '12px');
    });
  });
}

function unwrapPassengerDivs($) {
  $('[data-editorblocktype="Text"] div, [data-editorblocktype="Content"] div').each((_, el) => {
    const $div = $(el);
    if ($div.attr('class') || $div.attr('id') || $div.attr('align') || $div.attr('data-container')) return;
    const attrs = Object.keys(el.attribs || {}).filter((key) => !key.startsWith('data-'));
    if (attrs.length > 0) return;
    const children = $div.children();
    if (!children.length) {
      $div.remove();
      return;
    }
    if (children.filter('p, h1, h2, h3, h4').length === children.length) {
      $div.replaceWith($div.contents());
    }
  });
}

function hardenFullBleedBands($) {
  const bands = [
    { selector: '.accent-band', color: '#ef7800' },
    { selector: '.urgency-band', color: '#333333' },
    { selector: '.orange-footer', color: '#ef7800' },
  ];

  bands.forEach(({ selector, color }) => {
    $(`${selector}[data-section="true"]`).each((_, section) => {
      const $section = $(section);
      if (selector === '.urgency-band') {
        setStyleProp($section, 'background-color', color);
      } else {
        removeStyleProp($section, 'background-color');
      }
      $section.find('table.outer').each((__, table) => {
        const $table = $(table);
        $table.attr('align', 'center');
        $table.attr('bgcolor', color);
        ensureStyle(
          $table,
          `width:100%;min-width:100%;max-width:640px;margin-left:auto;margin-right:auto;background-color:${color}`,
        );
      });
    });
  });
}

function hardenArticleStackDividers($) {
  $('.article-stack-section .article-stack-divider').each((_, el) => {
    const $divider = $(el);
    $divider.removeAttr('data-editorblocktype');
    ensureStyle($divider, 'display:block;width:100%;max-width:100%;margin-left:0;margin-right:0');
    $divider.find('.divider-line-table, .divider-line-cell, .divider-line-img').each((__, node) => {
      ensureStyle($(node), 'width:100%;max-width:100%');
    });
  });
}

function hardenUrgencyBand($) {
  $('.urgency-band[data-section="true"]').each((_, section) => {
    const $section = $(section);
    setStyleProp($section, 'background-color', '#333333');
    $section.find('table.outer').each((__, table) => {
      const $table = $(table);
      $table.attr('bgcolor', '#333333');
      $table.attr('align', 'center');
      ensureStyle($table, 'width:100%;max-width:640px;margin-left:auto;margin-right:auto;background-color:#333333');
    });
    $section.find('.section-pad-tight').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('bgcolor', '#333333');
      ensureStyle($cell, 'text-align:center;width:100%;background-color:#333333');
    });
    $section.find('[data-editorblocktype="Text"], [data-editorblocktype="Text"] p').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin:0');
    });
    $section.find('[data-container]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenCtaBandGrey($) {
  $('.cta-band-grey[data-section="true"]').each((_, section) => {
    const $section = $(section);
    setStyleProp($section, 'background-color', '#f4f4f4');
    $section.find('table.outer').each((__, table) => {
      const $table = $(table);
      $table.attr('bgcolor', '#f4f4f4');
      $table.attr('align', 'center');
      ensureStyle($table, 'width:100%;max-width:640px;margin-left:auto;margin-right:auto;background-color:#f4f4f4');
    });
    $section.find('.cta-band-grey-shell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#f4f4f4');
      ensureStyle($cell, 'background-color:#f4f4f4;width:100%;border-left:4px solid #ef7800;border-right:4px solid #ffffff');
    });
  });
}

function hardenAccentBands($) {
  $('.accent-band[data-section="true"]').each((_, section) => {
    const $section = $(section);
    $section.find('.section-pad-accent').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'left');
      ensureStyle($cell, 'text-align:left;width:100%;background-color:#ef7800');
    });
    $section.find('table.outer').each((__, table) => {
      const $table = $(table);
      $table.attr('align', 'center');
      $table.attr('width', '640');
      ensureStyle($table, 'width:100%;max-width:640px;margin-left:auto;margin-right:auto;background-color:#ef7800');
    });
    $section.find('[data-editorblocktype="Text"]').each((__, el) => {
      const $block = $(el);
      $block.attr('align', 'left');
      ensureStyle($block, 'display:block;width:100%;text-align:left;margin:0;padding:0');
    });
  });
}

function hardenThreeUpBenefits($) {
  $('.three-up-benefits-section').each((_, section) => {
    const $section = $(section);
    $section.find('.section-pad, .mobile-padding').first().each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      ensureStyle($cell, 'text-align:center;width:100%');
    });
    $section.find('.three-up-benefits-layout').each((__, table) => {
      const $table = $(table);
      $table.attr('align', 'center');
      ensureStyle($table, 'width:100%;margin-left:auto;margin-right:auto;border-collapse:collapse');
    });
    $section.find('td.benefit-stack, .benefit-stack-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('valign', 'top');
      $cell.attr('width', '33.33%');
      ensureStyle($cell, 'width:33.33%;text-align:center;vertical-align:top;box-sizing:border-box');
    });
    $section.find('td.benefit-stack:not(:last-child), .benefit-stack-cell:not(:last-child)').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 20px');
    });
    $section.find('td.benefit-stack:last-child, .benefit-stack-cell:last-child').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 0');
    });
    $section.find('td.benefit-stack [data-editorblocktype="Text"], .benefit-stack-cell [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenSectionGaps($) {
  $('[data-section="true"]').each((_, section) => {
    const $section = $(section);
    ensureStyle($section, 'margin:0;padding:0;display:block');
    $section.children('table.outer').each((__, table) => {
      ensureStyle($(table), 'margin-top:0;margin-bottom:0;line-height:normal;font-size:15px');
    });
  });
}

function isOrangeBorderTop(style) {
  return /border-top:\s*2px\s+solid\s+(#ef7800|rgb\(\s*239\s*,\s*120\s*,\s*0\s*\))/i.test(style || '');
}

function hardenDividers($) {
  $('.divider-line-cell, .section-rule-cell').each((_, el) => {
    const $el = $(el);
    $el.attr('bgcolor', '#ef7800');
    $el.attr('height', '2');
    ensureStyle($el, DIVIDER_LINE_STYLE);
    if ($el.hasClass('divider-line-cell') && !$el.find('.divider-line-img').length) {
      $el.append(
        $('<img alt="" class="divider-line-img">').attr({
          src: DIVIDER_IMG_SRC,
          width: '640',
          height: '2',
        }),
      );
    }
    $el.find('.divider-line-img').each((__, img) => {
      const $img = $(img);
      $img.attr({ src: DIVIDER_IMG_SRC, width: '640', height: '2', alt: '' });
      ensureStyle($img, DIVIDER_IMG_STYLE);
    });
    if (!$el.find('.divider-line-img').length && !$el.html()?.trim()) $el.html('&nbsp;');
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
      if ($el.hasClass('feature-cards-desktop-grid')) return;
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

function hardenLeftAlignedTextSections($) {
  const sectionSelectors = [
    '.intro-headline',
    '.eyebrow-headline',
    '.headline-block-section',
    '.eyebrow-h2-section',
    '.headline-h3-section',
    '.headline-h4-section',
    '.body-text-section',
    '.comparison-heading-section',
  ];

  sectionSelectors.forEach((selector) => {
    $(`${selector}[data-section="true"]`).each((_, section) => {
      const $section = $(section);
      $section.find('.section-pad, .section-pad-compact, .section-pad-compact-bottom, .section-heading-cell').each((__, cell) => {
        const $cell = $(cell);
        $cell.attr('align', 'left');
        ensureStyle($cell, 'text-align:left');
      });
      $section.find('[data-container], [data-editorblocktype="Text"], [data-editorblocktype="Text"] h1, [data-editorblocktype="Text"] h2, [data-editorblocktype="Text"] h3, [data-editorblocktype="Text"] p, h1, h2, h3, p, .eyebrow-label, .headline-lead').each((__, el) => {
        const $el = $(el);
        $el.attr('align', 'left');
        ensureStyle($el, 'text-align:left;width:100%;margin-left:0;margin-right:0');
      });
    });
  });

  $('.feature-stack-text').each((_, cell) => {
    const $cell = $(cell);
    $cell.attr('align', 'left');
    ensureStyle($cell, 'text-align:left');
    $cell.find('[data-container], [data-editorblocktype="Text"], [data-editorblocktype="Text"] h3, [data-editorblocktype="Text"] p, h3, p').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'left');
      ensureStyle($el, 'text-align:left;width:100%;margin-left:0;margin-right:0');
    });
  });
}

function hardenHeaderAlignment($) {
  $('.header-standard-section').each((_, section) => {
    const $section = $(section);
    $section.attr('style', `${$section.attr('style') || ''};background-color:#ffffff`.replace(/^;/, ''));
    ensureStyle($section, 'background-color:#ffffff');
    $section.find('table.outer').each((__, table) => {
      $(table).attr('bgcolor', '#ffffff');
      ensureStyle($(table), 'background-color:#ffffff');
    });
    $section.find('.section-pad-tight').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#ffffff');
      ensureStyle($cell, 'background-color:#ffffff');
    });
    $section.find('.header-logo-column, .header-logo-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'left');
      $cell.attr('valign', 'top');
      ensureStyle($cell, 'background-color:#ffffff;vertical-align:top;text-align:left;line-height:normal;mso-line-height-rule:exactly');
    });
    $section.find('.header-logo-table, .header-logo-safe, .header-logo-wrap, .header-logo-column .imageWrapper, .header-logo-column [data-editorblocktype="Image"]').each((__, wrap) => {
      const $wrap = $(wrap);
      $wrap.attr('align', 'left');
      removeStyleProp($wrap, 'line-height');
      removeStyleProp($wrap, 'font-size');
      ensureStyle(
        $wrap,
        'display:block;width:100%;text-align:left;line-height:normal;mso-line-height-rule:exactly;font-size:15px;background-color:#ffffff',
      );
    });
    $section.find('.header-logo-safe td, .header-logo-table td').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'left');
      $cell.attr('valign', 'top');
      ensureStyle($cell, 'padding:0;margin:0;line-height:normal;mso-line-height-rule:exactly;font-size:15px;background-color:#ffffff');
    });
  });

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

function hardenSectionHeadings($) {
  $('.section-heading-section').each((_, section) => {
    const $section = $(section);
    $section.find('.section-heading-cell, center, .section-heading-center, .section-heading-center td').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%');
    });
    $section.find('center').each((__, el) => {
      ensureStyle($(el), 'width:100%;text-align:center');
    });
    $section.find('.divider-line-table').each((__, table) => {
      const $table = $(table);
      ensureStyle($table, 'margin:0 auto 12px auto;width:100%');
    });
    $section.find('[data-editorblocktype="Text"], [data-editorblocktype="Text"] h2').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin:0');
    });
    $section.find('[data-container]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenHeadlineBlockCenter($) {
  $('.headline-block-center-section').each((_, section) => {
    const $section = $(section);
    $section.find('.headline-block-center-cell, center, .headline-block-center-inner, .headline-block-center-inner td').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%');
    });
    $section.find('center').each((__, el) => {
      ensureStyle($(el), 'width:100%;text-align:center');
    });
    $section.find('[data-editorblocktype="Text"], [data-editorblocktype="Text"] h2, [data-editorblocktype="Text"] h3, [data-editorblocktype="Text"] p, h2, h3, p, .headline-lead').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin:0');
    });
    $section.find('[data-container]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenCtaTextLinks($) {
  $('.cta-text-link-section').each((_, section) => {
    const $section = $(section);
    $section.find('.cta-text-link-cell, center, .cta-text-link-wrap').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin-left:auto;margin-right:auto');
    });
    $section.find('center').each((__, el) => {
      ensureStyle($(el), 'width:100%;text-align:center');
    });
    $section.find('[data-container], [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
    $section.find('.text-link-cta').each((__, link) => {
      const $link = $(link);
      $link.attr('align', 'center');
      ensureStyle($link, 'display:inline-block;text-align:center;color:#ef7800;text-decoration:underline');
    });
  });
}

function hardenFooterAlignment($) {
  $('.three-up-benefits-section [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    $block.attr('align', 'center');
    ensureStyle($block, 'text-align:center;width:100%;margin-left:auto;margin-right:auto');
  });

  $('.orange-footer .section-pad-accent, .orange-footer .footer-band-content, .orange-footer center').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;width:100%');
  });

  $('.orange-footer center').each((_, el) => {
    ensureStyle($(el), 'width:100%;text-align:center');
  });

  $('.footer-legal center').each((_, el) => {
    ensureStyle($(el), 'width:100%;text-align:center');
  });

  $('.orange-footer [data-editorblocktype="Text"]').each((_, el) => {
    const $block = $(el);
    $block.attr('align', 'center');
    ensureStyle($block, 'text-align:center;width:100%');
  });

  $('.orange-footer .footer-band-title, .orange-footer .footer-band-address, .orange-footer .footer-band-contact, .orange-footer p.footer-band-address, .orange-footer p.footer-band-contact').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;width:100%');
  });

  $('.footer-legal, .footer-legal center, .footer-legal p, .footer-legal a').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;width:100%');
  });

  $('.footer-legal [data-editorblocktype], .footer-legal [data-protected]').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;width:100%');
  });

  $('.orange-footer .footer-band-text-table, .footer-legal .footer-legal-text-table').each((_, el) => {
    const $table = $(el);
    $table.attr('align', 'center');
    ensureStyle($table, 'margin-left:auto;margin-right:auto;width:100%;border-collapse:collapse');
    $table.find('td').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      ensureStyle($cell, 'text-align:center;padding:0;width:100%');
    });
  });

  $('.orange-footer [data-container], .footer-legal [data-container]').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    if ($el.closest('.footer-legal').length) {
      ensureStyle($el, 'display:block;width:100%;max-width:100%;text-align:center;margin-left:auto;margin-right:auto');
      return;
    }
    ensureStyle($el, 'display:inline-block;width:auto;max-width:100%;text-align:center;margin-left:auto;margin-right:auto;vertical-align:top');
  });

  $('.video-preview-section .video-preview-caption, .video-preview-section .play-badge-table').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'text-align:center;margin-left:auto;margin-right:auto');
  });
}

// Dynamics expands an inline `background:` shorthand into
// `background-image:initial; background-position:initial; …` and drops the
// color. It leaves the `background-color` longhand untouched. Convert any
// solid-color shorthand to the longhand so no element loses its fill on send.
function normalizeInlineBackgrounds($) {
  $('[style*="background:"]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const next = style.replace(
      /(^|;)\s*background\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*(!important)?\s*(?=;|$)/gi,
      (_m, sep, color, imp) => `${sep}background-color:${color}${imp ? ` ${imp}` : ''}`,
    );
    if (next !== style) $el.attr('style', next);
  });
}

function hardenEmailHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const $ = cheerio.load(html, { xml: false }, false);
  hardenTables($);
  hardenLayoutShell($);
  hardenOuterTableCentering($);
  hardenAccentSections($);
  hardenAccentBands($);
  hardenUrgencyBand($);
  hardenCtaBandGrey($);
  hardenFullBleedBands($);
  hardenOrangeFooterSections($);
  hardenSectionBackgrounds($);
  hardenImages($);
  hardenButtons($);
  hardenTypography($);
  hardenSmallText($);
  hardenDividers($);
  hardenD365Containers($);
  hardenHeaderAlignment($);
  hardenLeftAlignedTextSections($);
  hardenSectionHeadings($);
  hardenHeadlineBlockCenter($);
  hardenFooterAlignment($);
  hardenThreeUpBenefits($);
  hardenArticleStackDividers($);
  hardenBodyTextSections($);
  hardenViewInBrowser($);
  hardenInsetImages($);
  hardenIntroCentered($);
  hardenImageSplitColumns($);
  hardenTwoUpTextColumns($);
  hardenAccentBandColumns($);
  hardenCtaTextLinks($);
  hardenCtaPrimaryCenter($);
  hardenStatsThreeColumns($);
  hardenStatsFourColumns($);
  hardenFeatureCardsFourColumns($);
  hardenThreeUpProducts($);
  hardenStepsHorizontalColumns($);
  hardenProactiveDynamicsContainers($);
  hardenHybridStackLineHeights($);
  hardenSectionGaps($);
  normalizeInlineBackgrounds($);
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
    // Responsive two-up / image-split columns stack via CSS — do not mark
    // layout cells as Dynamics data-container or they pick up fixed widths.
    if ($table.closest('.two-up-text-section, .image-split-text-section, .accent-band').length) return;
    if ($table.hasClass('image-split-layout') || $table.hasClass('accent-band-layout') || $table.hasClass('stats-three-layout') || $table.hasClass('stats-four-layout') || $table.hasClass('three-up-benefits-layout') || $table.hasClass('three-up-products-layout') || $table.hasClass('steps-horizontal-layout') || $table.hasClass('feature-cards-pair') || $table.hasClass('feature-cards-web-grid')) return;
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
    // Dynamics rebuilds data-editorblocktype="Button" blocks into a bare anchor:
    // it deletes our bulletproof table (the <td> fill Outlook desktop relies on)
    // and mangles the anchor background. Drop the attribute so Dynamics keeps our
    // markup as generic content (like the comparison tables and plain links it
    // already preserves). Links are still tracked regardless of block type.
    $btn.removeAttr('data-editorblocktype');
    $btn.addClass('cta-button-block');
  });
}

function hardenIntroCentered($) {
  $('.mod-intro-centered').each((_, section) => {
    const $section = $(section);
    $section.find('.intro-centered-cell, center, .intro-centered-inner, .intro-centered-inner td').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%');
    });
    $section.find('center').each((__, el) => {
      ensureStyle($(el), 'width:100%;text-align:center');
    });
    $section.find('[data-editorblocktype="Text"], [data-editorblocktype="Text"] h1, [data-editorblocktype="Text"] h2, [data-editorblocktype="Text"] p, h1, h2, p').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin:0');
    });
    $section.find('[data-container]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenTwoUpTextColumns($) {
  $('.two-up-text-section').each((_, section) => {
    const $section = $(section);
    $section.find('.tbContainer.multi > tbody > tr > td.stack-column, .tbContainer.multi > tr > td.stack-column').each((__, cell) => {
      const $cell = $(cell);
      $cell.removeAttr('width');
      removeStyleProp($cell, 'width');
      removeStyleProp($cell, 'max-width');
      ensureStyle($cell, 'box-sizing:border-box;vertical-align:top');
    });
    $section.find('.two-up-text-col-left').each((__, cell) => {
      ensureStyle($(cell), 'padding-right:12px');
    });
    $section.find('.two-up-text-col-right').each((__, cell) => {
      ensureStyle($(cell), 'padding-left:12px;border-left:1px solid #e8e8e8;mso-border-left-alt:1px solid #e8e8e8');
    });
    $section.find('.two-up-text-shell').each((__, cell) => {
      ensureStyle($(cell), 'padding-bottom:28px');
    });
    $section.find('.two-up-text-col [data-container]').each((__, el) => {
      ensureStyle($(el), 'display:block;width:100%;max-width:100%;flex:none;align-self:stretch');
    });
  });
}

function hardenHybridStackLineHeights($) {
  $('.stats-three-section .stat-number').each((_, el) => {
    ensureStyle($(el), 'line-height:34px;mso-line-height-rule:at-least;text-align:center');
    $(el).attr('align', 'center');
  });
  $('.stats-three-section .stat-label').each((_, el) => {
    ensureStyle($(el), 'line-height:16px;mso-line-height-rule:at-least;text-align:center');
    $(el).attr('align', 'center');
  });
  $('.stats-three-section .stat-stack [data-editorblocktype="Text"]').each((_, el) => {
    const $el = $(el);
    $el.attr('align', 'center');
    ensureStyle($el, 'font-size:15px;line-height:normal;mso-line-height-rule:at-least;text-align:center');
  });
  $('.accent-band .accent-band-copy h1').each((_, el) => {
    ensureStyle($(el), 'line-height:30px;mso-line-height-rule:at-least');
  });
  $('.accent-band .accent-band-copy p').each((_, el) => {
    ensureStyle($(el), 'line-height:24px;mso-line-height-rule:at-least');
  });
  $('.image-split-text-section .image-split-copy h2').each((_, el) => {
    ensureStyle($(el), 'line-height:27px;mso-line-height-rule:at-least');
  });
  $('.image-split-text-section .image-split-copy p').each((_, el) => {
    ensureStyle($(el), 'line-height:24px;mso-line-height-rule:at-least');
  });
  $('.image-split-text-section .image-split-copy [data-editorblocktype="Text"]').each((_, el) => {
    ensureStyle($(el), 'font-size:15px;line-height:normal;mso-line-height-rule:at-least');
  });
  $('.image-subtext-block').each((_, el) => {
    ensureStyle($(el), 'font-size:11px;line-height:normal;mso-line-height-rule:at-least');
  });
  $('.image-subtext').each((_, el) => {
    const $subtext = $(el);
    const text = ($subtext.text() || '').replace(/\u00a0/g, ' ').replace(/&nbsp;/gi, ' ').trim();
    if (!text) return;
    ensureStyle($subtext, 'font-size:11px;line-height:16px;mso-line-height-rule:at-least;padding:0 4px 4px 4px');
  });
}

function hardenAccentBandColumns($) {
  $('.accent-band').each((_, section) => {
    const $section = $(section);
    $section.find('.accent-band-layout').each((__, table) => {
      ensureStyle($(table), 'width:100%;border-collapse:collapse;table-layout:fixed');
    });
    $section.find('td.accent-band-copy, .accent-band-stack-cell.accent-band-copy').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('width', '65%');
      $cell.attr('valign', 'middle');
      $cell.attr('align', 'left');
      ensureStyle($cell, 'width:65%;padding:0 16px 0 0;vertical-align:middle;text-align:left;box-sizing:border-box');
    });
    $section.find('td.accent-band-cta, .accent-band-stack-cell.accent-band-cta').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('width', '35%');
      $cell.attr('valign', 'middle');
      $cell.attr('align', 'right');
      ensureStyle($cell, 'width:35%;vertical-align:middle;text-align:right;box-sizing:border-box');
    });
    $section.find('td.accent-band-copy [data-editorblocktype="Text"], td.accent-band-cta [data-container], td.accent-band-cta .buttonWrapper').each((__, el) => {
      ensureStyle($(el), 'display:block;width:100%;max-width:100%;flex:none');
    });
  });
}

function hardenImageSplitColumns($) {
  $('.image-split-text-section').each((_, section) => {
    const $section = $(section);
    $section.find('.image-split-layout').each((__, table) => {
      ensureStyle($(table), 'width:100%;border-collapse:collapse;table-layout:fixed');
    });
    $section.find('td.image-split-copy, .image-split-stack-cell.image-split-copy').each((__, cell) => {
      const $cell = $(cell);
      const $row = $cell.closest('tr');
      const copyFirst = $row.children().first().is($cell);
      $cell.attr('width', '51%');
      $cell.attr('valign', 'middle');
      $cell.attr('align', 'left');
      ensureStyle(
        $cell,
        copyFirst
          ? 'width:51%;padding:24px 16px 24px 24px;background-color:#ffffff;vertical-align:middle;text-align:left;box-sizing:border-box'
          : 'width:51%;padding:24px 24px 24px 16px;background-color:#ffffff;vertical-align:middle;text-align:left;box-sizing:border-box',
      );
    });
    $section.find('td.image-split-media, .image-split-stack-cell.image-split-media').each((__, cell) => {
      const $cell = $(cell);
      const $row = $cell.closest('tr');
      const copyFirst = $row.children('td.image-split-copy, .image-split-copy').first().length
        && $row.children().first().hasClass('image-split-copy');
      $cell.attr('width', '49%');
      $cell.attr('valign', 'top');
      $cell.attr('align', 'center');
      ensureStyle(
        $cell,
        copyFirst
          ? 'width:49%;padding:0 0 0 12px;vertical-align:top;text-align:center;box-sizing:border-box'
          : 'width:49%;padding:0 12px 0 0;vertical-align:top;text-align:center;box-sizing:border-box',
      );
    });
    $section.find('td.image-split-copy [data-editorblocktype="Text"], td.image-split-media [data-editorblocktype="Image"]').each((__, el) => {
      ensureStyle($(el), 'display:block;width:100%;max-width:100%;flex:none');
    });
  });
}

function hardenStepsHorizontalColumns($) {
  $('.steps-horizontal-section').each((_, section) => {
    const $section = $(section);
    $section.find('.steps-horizontal-layout').each((__, table) => {
      ensureStyle($(table), 'width:100%;border-collapse:collapse;table-layout:fixed');
    });
    $section.find('td.step-stack, .step-stack-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('width', '30%');
      $cell.attr('valign', 'top');
      $cell.attr('align', 'center');
      ensureStyle($cell, 'width:30%;text-align:center;vertical-align:top;box-sizing:border-box;padding:0 4px');
    });
    $section.find('td.step-arrow-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('width', '5%');
      $cell.attr('valign', 'middle');
      $cell.attr('align', 'center');
      ensureStyle($cell, 'width:5%;text-align:center;vertical-align:middle');
    });
    $section.find('td.step-stack [data-editorblocktype="Text"], .step-stack-cell [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenStatsThreeColumns($) {
  $('.stats-three-section').each((_, section) => {
    const $section = $(section);
    $section.find('td.stat-stack, .stat-stack-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('valign', 'top');
      $cell.attr('width', '33.33%');
      ensureStyle($cell, 'width:33.33%;text-align:center;vertical-align:top;box-sizing:border-box');
    });
    $section.find('td.stat-stack:not(:last-child), .stat-stack-cell:not(:last-child)').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 20px');
    });
    $section.find('td.stat-stack:last-child, .stat-stack-cell:last-child').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 0');
    });
    $section.find('td.stat-stack [data-editorblocktype="Text"], .stat-stack-cell [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
    $section.find('.stat-number, .stat-label').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenStatsFourColumns($) {
  $('.stats-four-section').each((_, section) => {
    const $section = $(section);
    $section.find('td.stat-stack, .stat-stack-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('valign', 'top');
      $cell.attr('width', '25%');
      ensureStyle($cell, 'width:25%;text-align:center;vertical-align:top;box-sizing:border-box');
    });
    $section.find('td.stat-stack:not(:last-child), .stat-stack-cell:not(:last-child)').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 4px 16px');
    });
    $section.find('td.stat-stack:last-child, .stat-stack-cell:last-child').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 4px 0');
    });
    $section.find('td.stat-stack [data-editorblocktype="Text"], .stat-stack-cell [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
    $section.find('.stat-number, .stat-label').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin-left:auto;margin-right:auto');
    });
  });
}

function hardenThreeUpProducts($) {
  $('.three-up-products-section').each((_, section) => {
    const $section = $(section);
    $section.find('td.product-stack, .product-stack-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('valign', 'top');
      $cell.attr('width', '33.33%');
      ensureStyle($cell, 'width:33.33%;text-align:center;vertical-align:top;box-sizing:border-box');
    });
    $section.find('td.product-stack:not(:last-child), .product-stack-cell:not(:last-child)').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 20px');
    });
    $section.find('td.product-stack:last-child, .product-stack-cell:last-child').each((__, cell) => {
      ensureStyle($(cell), 'padding:0 8px 0');
    });
    $section.find('td.product-stack > div, .product-stack-cell > div, td.product-stack [data-editorblocktype="Text"], .product-stack-cell [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:center;margin-left:auto;margin-right:auto');
    });
    $section.find('[data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%');
    });
  });
}

function hardenFeatureCardsFourColumns($) {
  $('.feature-cards-four-section').each((_, section) => {
    const $section = $(section);
    $section.removeClass('columns-equal-class');
    $section.find('table.feature-cards-web-grid').each((__, wrap) => {
      ensureStyle($(wrap), 'width:100%;border-collapse:collapse');
    });
    $section.find('.feature-cards-web-grid-cell').each((__, cell) => {
      ensureStyle($(cell), 'padding:0');
    });
    $section.find('.feature-cards-pair').each((__, table) => {
      ensureStyle($(table), 'width:100%;border-collapse:collapse;table-layout:fixed');
    });
    $section.find('.feature-cards-pair td.feature-card-cell, .feature-cards-pair .feature-card-stack').each((__, cell) => {
      const $cell = $(cell);
      $cell.addClass('stack-column');
      $cell.attr('align', 'left');
      $cell.attr('valign', 'top');
      $cell.attr('width', '50%');
      $cell.attr('bgcolor', '#f9f9f9');
      ensureStyle($cell, 'width:50%;vertical-align:top;text-align:left;box-sizing:border-box;background-color:#f9f9f9');
    });
    $section.find('.feature-cards-pair tr.feature-cards-pair-row').each((__, row) => {
      ensureStyle($(row), 'width:100%');
    });
    $section.find('.feature-card').each((__, table) => {
      const $table = $(table);
      // Web pair cards fill the equalized row cell; MSO keeps natural table height.
      if ($table.closest('.feature-cards-web-grid').length) {
        ensureStyle($table, 'width:100%;height:100%;border-collapse:collapse;background-color:#f9f9f9');
      } else {
        ensureStyle($table, 'width:100%;border-collapse:collapse;background-color:#f9f9f9');
      }
    });
    $section.find('.feature-card-accent').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#ef7800');
      $cell.attr('height', '4');
      ensureStyle($cell, 'height:4px;line-height:4px;font-size:0;padding:0;background-color:#ef7800');
    });
    $section.find('.feature-cards-web-grid .feature-card-body').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#f9f9f9');
      $cell.attr('valign', 'top');
      // No fixed height — pair-row table cells equalize naturally in OWA/Gmail.
      ensureStyle($cell, 'background-color:#f9f9f9;padding:16px 18px;vertical-align:top;text-align:left');
    });
    $section.find('.feature-cards-mso-grid .feature-card-body, .feature-cards-desktop-grid .feature-card-body').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('bgcolor', '#f9f9f9');
      $cell.attr('valign', 'top');
      ensureStyle($cell, 'background-color:#f9f9f9;padding:16px 18px;vertical-align:top;text-align:left');
    });
    $section.find('[data-container="true"], .feature-card-body > div').each((__, el) => {
      const $el = $(el);
      ensureStyle($el, NEUTRAL_CONTAINER_STYLE);
    });
    $section.find('td.feature-card-cell [data-editorblocktype="Text"], .feature-card-stack [data-editorblocktype="Text"]').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'left');
      ensureStyle($el, 'display:block;width:100%;max-width:100%;flex:none;text-align:left');
    });
    $section.find('.feature-card-number').each((__, el) => {
      ensureStyle($(el), 'font-family:ARIALNB,Arial,sans-serif;font-size:22px;line-height:1.1;color:#ef7800;margin:0 0 10px 0;text-align:left');
    });
    $section.find('.feature-card-subtitle').each((__, el) => {
      ensureStyle($(el), 'margin:0 0 10px 0;text-align:left;font-size:15px;line-height:1.4');
    });
    $section.find('td.feature-card-cell h3, .feature-card-body h3').each((__, el) => {
      ensureStyle($(el), 'margin:0 0 8px 0;text-align:left;font-size:15px;line-height:1.35');
    });
    $section.find('td.feature-card-cell [data-editorblocktype="Text"] > p:not(.feature-card-number):not(.feature-card-subtitle)').each((__, el) => {
      ensureStyle($(el), 'margin:0;text-align:left;font-size:15px;line-height:1.6');
    });
  });
}

const NEUTRAL_CONTAINER_STYLE = 'display:block;width:100%;max-width:100%;flex:none';
const CENTERED_CONTAINER_STYLE = `${NEUTRAL_CONTAINER_STYLE};text-align:center;margin-left:auto;margin-right:auto`;

function hardenProactiveDynamicsContainers($) {
  const centeredSections = [
    '.quote-centered-section',
    '.social-links-section',
    '.video-preview-section',
  ];
  for (const selector of centeredSections) {
    $(selector).each((_, section) => {
      const $section = $(section);
      $section.find('.section-pad, .section-pad-tight').each((__, cell) => {
        const $cell = $(cell);
        $cell.attr('align', 'center');
        ensureStyle($cell, 'text-align:center;width:100%');
      });
      $section.find('[data-container], [data-editorblocktype="Text"]').each((__, el) => {
        const $el = $(el);
        $el.attr('align', 'center');
        ensureStyle($el, CENTERED_CONTAINER_STYLE);
      });
    });
  }

  const centeredColumnSelectors = [
    '.icon-grid-four-section .icon-grid-cell [data-container]',
    '.logo-strip-section .logo-strip-cell [data-container]',
    '.pricing-two-up-section .pricing-tier [data-container]',
    '.pricing-two-up-section .pricing-tier-featured [data-container]',
    '.steps-horizontal-section .step-stack [data-container]',
    '.two-up-cards-section .card-stack [data-container]',
    '.download-resource-section .stack-column [data-container]',
    '.cta-dual-section .cta-dual-column [data-container]',
  ];
  for (const selector of centeredColumnSelectors) {
    $(selector).each((_, el) => {
      ensureStyle($(el), CENTERED_CONTAINER_STYLE);
    });
  }

  const neutralColumnSelectors = [
    '.hero-split-section [data-container]',
    '.team-profile-section [data-container]',
    '.article-row-section [data-container]',
    '.header-cta-section [data-container]',
    '.case-study-mini-section [data-container]',
    '.feature-left-section [data-container]',
    '.feature-right-section [data-container]',
    '.feature-left-text-section [data-container]',
    '.feature-right-text-section [data-container]',
    '.comparison-split-section [data-container]',
    '.cta-band-grey [data-container]',
  ];
  for (const selector of neutralColumnSelectors) {
    $(selector).each((_, el) => {
      ensureStyle($(el), NEUTRAL_CONTAINER_STYLE);
    });
  }
}

function hardenCtaPrimaryCenter($) {
  $('.cta-primary-center').each((_, section) => {
    const $section = $(section);
    $section.find('.buttonWrapper').each((__, wrap) => {
      ensureStyle($(wrap), 'max-width:320px;margin-left:auto;margin-right:auto;text-align:center');
    });
  });
}

function hardenInsetImages($) {
  $('.image-edge-section.image-edge-inset').each((_, section) => {
    const $section = $(section);
    $section.find('.image-edge-cell').each((__, cell) => {
      ensureStyle($(cell), 'box-sizing:border-box');
    });
    $section.find('.image-edge-subtext-wrap').each((__, wrap) => {
      setStyleProp($(wrap), 'padding', '8px 0 0 0');
    });
  });
}

function hardenViewInBrowser($) {
  $('.view-in-browser-section').each((_, section) => {
    const $section = $(section);
    $section.attr('style', mergeStyle($section.attr('style') || '', 'background-color:#ffffff'));
    $section.find('table.outer').each((__, table) => {
      const $table = $(table);
      $table.attr('bgcolor', '#ffffff');
      ensureStyle($table, 'background-color:#ffffff');
    });
    $section.find('.view-in-browser-cell').each((__, cell) => {
      const $cell = $(cell);
      $cell.attr('align', 'center');
      $cell.attr('bgcolor', '#ffffff');
      ensureStyle($cell, 'text-align:center;background-color:#ffffff;padding:12px 24px 16px 24px');
      const $link = $cell.find('.view-in-browser-link').first();
      if (!$link.length) return;

      // Legacy exports wrapped the link in data-editorblocktype/data-container.
      // Unwrap so Dynamics paste cannot inject a fixed-width flex container.
      $link.parents('[data-container="true"], [data-editorblocktype="Text"]').each((___, wrapper) => {
        const $wrapper = $(wrapper);
        if ($wrapper.find('.view-in-browser-link').length === 1) {
          $wrapper.replaceWith($link);
        }
      });

      if (!$link.closest('.view-in-browser-center-table').length) {
        $link.wrap(
          '<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" class="view-in-browser-center-table" role="presentation" style="margin:0 auto;width:100%;border-collapse:collapse;"><tbody><tr><td align="center" class="view-in-browser-text-cell" style="text-align:center;padding:0;width:100%;"></td></tr></tbody></table>',
        );
      }

      const $centerCell = $link.closest('.view-in-browser-text-cell');
      if ($centerCell.length) {
        $centerCell.attr('align', 'center');
        ensureStyle($centerCell, 'text-align:center;padding:0;width:100%');
      }

      if (!$link.closest('center').length) {
        $link.closest('.view-in-browser-center-table').wrap('<center style="width:100%;text-align:center"></center>');
      }
    });
    $section.find('.view-in-browser-center-table, .view-in-browser-center-table td, .view-in-browser-text-cell').each((__, el) => {
      const $el = $(el);
      $el.attr('align', 'center');
      ensureStyle($el, 'text-align:center;width:100%;margin:0 auto');
    });
    $section.find('center').each((__, el) => {
      ensureStyle($(el), 'width:100%;text-align:center');
    });
    $section.find('.view-in-browser-link').each((__, link) => {
      const $link = $(link);
      $link.attr('align', 'center');
      ensureStyle($link, 'display:inline-block;text-align:center;color:#ef7800;text-decoration:underline');
    });
  });
}

function flattenOutlookConditionals(html) {
  if (!html || typeof html !== 'string') return html;
  const preserved = [];
  // Keep feature-cards MSO split: web gets pair rows; Word gets MSO 2×2 grid only.
  // Anchor on the web-grid table (not the CSS class name in <style>).
  let out = html.replace(
    /<!--\[if !mso\]><!-->(\s*<table class="feature-cards-web-grid"[\s\S]*?)<!--<!\[endif\]-->\s*<!--\[if mso\]>([\s\S]*?feature-cards-mso-grid[\s\S]*?)<!\[endif\]-->/gi,
    (_, nonMso, mso) => {
      const token = `<!--FEATURE_CARDS_DUAL_${preserved.length}-->`;
      preserved.push(
        `<!--[if !mso]><!-->${nonMso}<!--<![endif]-->\n<!--[if mso]>${mso}<![endif]-->`,
      );
      return token;
    },
  );
  out = out.replace(/<!--\[if !mso\]><!-->\s*/gi, '');
  out = out.replace(/\s*<!--<!\[endif\]-->/gi, '');
  out = out.replace(/<!--\[if mso\]>\s*<v:roundrect[\s\S]*?<!\[endif\]-->\s*/gi, '');
  preserved.forEach((block, index) => {
    out = out.replace(`<!--FEATURE_CARDS_DUAL_${index}-->`, block);
  });
  return out;
}

const BUILD_MARKER = 'email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v57';

function sanitizeExportHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const flattened = flattenOutlookConditionals(html);
  const $ = cheerio.load(flattened, { xml: false }, false);
  removeHiddenElements($);
  stripStudioMetadata($);
  hardenD365Containers($);
  hardenButtons($);
  hardenHeaderAlignment($);
  hardenViewInBrowser($);
  hardenInsetImages($);
  hardenLeftAlignedTextSections($);
  hardenAccentBands($);
  hardenUrgencyBand($);
  hardenCtaBandGrey($);
  hardenFullBleedBands($);
  hardenSectionHeadings($);
  hardenHeadlineBlockCenter($);
  hardenIntroCentered($);
  hardenImageSplitColumns($);
  hardenTwoUpTextColumns($);
  hardenAccentBandColumns($);
  hardenCtaTextLinks($);
  hardenCtaPrimaryCenter($);
  hardenStatsThreeColumns($);
  hardenStatsFourColumns($);
  hardenFeatureCardsFourColumns($);
  hardenThreeUpProducts($);
  hardenStepsHorizontalColumns($);
  hardenProactiveDynamicsContainers($);
  hardenFooterAlignment($);
  hardenThreeUpBenefits($);
  hardenHybridStackLineHeights($);
  hardenArticleStackDividers($);
  hardenSectionGaps($);
  hardenBodyTextSections($);
  hardenEmptyImageSubtext($);
  unwrapPassengerDivs($);
  normalizeInlineBackgrounds($);
  return `<!-- ${BUILD_MARKER} -->\n${flattenOutlookConditionals($.html())}`;
}

module.exports = { hardenEmailHtml, sanitizeExportHtml };
