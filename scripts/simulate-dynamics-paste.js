#!/usr/bin/env node

const cheerio = require('cheerio');

/**
 * Approximate what Dynamics 365 does when HTML is pasted into the
 * marketing content editor and saved (verified from a real send).
 */
function simulateDynamicsPaste(html) {
  const $ = cheerio.load(html, { xml: false }, false);

  $('[data-section="true"]').each((_, section) => {
    const $section = $(section);
    $section.addClass('columns-equal-class');
    $section.find('table.outer').first().each((__, table) => {
      const $table = $(table);
      setStyleProp($table, 'width', '640px');
      setStyleProp($table, 'display', 'block');
    });
  });

  $('[data-editorblocktype]').each((_, block) => {
    const $block = $(block);
    if ($block.parent('[data-container="true"]').length) return;

    const width = inferContainerWidth($, $block);
    const $wrapper = $('<div></div>').attr({
      'data-container': 'true',
      id: `container${Math.random().toString(16).slice(2)}`,
    });
    setStyleProp($wrapper, 'width', `${width}px`);
    setStyleProp($wrapper, 'flex', `0 0 ${width}px`);
    setStyleProp($wrapper, 'display', 'flex');
    setStyleProp($wrapper, 'flex-direction', 'column');
    $block.wrap($wrapper);
  });

  return $.html();
}

function inferContainerWidth($, $block) {
  const $cell = $block.closest('td, th').first();
  const style = $cell.attr('style') || '';
  const padMatch = style.match(/padding:\s*(?:\d+px\s+)?(\d+)px/i);
  const horizontalPad = padMatch ? Number(padMatch[1]) * 2 : 48;
  const $outer = $block.closest('table.outer').first();
  const outerWidth = Number(($outer.attr('width') || '640').toString().replace(/px$/, '')) || 640;
  return Math.max(outerWidth - horizontalPad, 178);
}

function setStyleProp($el, prop, value) {
  const style = $el.attr('style') || '';
  const parts = style
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !new RegExp(`^${prop}\\s*:`, 'i').test(s));
  parts.push(`${prop}:${value}`);
  $el.attr('style', `${parts.join(';')};`);
}

module.exports = { simulateDynamicsPaste };
