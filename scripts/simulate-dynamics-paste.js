#!/usr/bin/env node

const cheerio = require('cheerio');
const {
  buildCompleteEmailDocument,
  loadEmailCheerio,
  serializeEmailCheerio,
} = require('./harden-email');

/**
 * Approximate what Dynamics 365 does on SEND (verified from real Gmail source).
 * Send transform wraps editor blocks in anonymous flex divs — NOT data-container.
 */
function simulateDynamicsPaste(html) {
  const $ = loadEmailCheerio(wrapDynamicsDocument(html));

  simulateDynamicsLayoutShell($);

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
    if ($block.parent('[data-d365-flex-wrap="true"]').length) return;

    const width = inferContainerWidth($, $block);
    const $wrapper = $('<div></div>').attr('data-d365-flex-wrap', 'true');
    setStyleProp($wrapper, 'width', `${width}px`);
    setStyleProp($wrapper, 'flex', `0 0 ${width}px`);
    setStyleProp($wrapper, 'display', 'flex');
    setStyleProp($wrapper, 'flex-direction', 'column');
    $block.wrap($wrapper);
  });

  // Keep a complete document string — never emit empty <head></head><body> wrappers.
  return serializeEmailCheerio($);
}

function wrapDynamicsDocument(html) {
  if (/<html[\s>][\s\S]*<head[\s>][\s\S]*<\/head>[\s\S]*<body[\s>]/i.test(html)) {
    return html;
  }
  // Legacy fragment exports: place content in body, never invent an empty head
  // that leaves title/meta/style stranded after <body>.
  if (/<body[\s>]/i.test(html)) return html;
  return buildCompleteEmailDocument({
    headMarkup: '',
    bodyMarkup: html,
  });
}

function simulateDynamicsLayoutShell($) {
  const $layout = $('[data-layout="true"]').first();
  if (!$layout.length) return;

  const $outer = $('<div></div>').attr({
    'data-layout': 'true',
    style: 'max-width: 640px; margin: auto;',
  });
  $layout.before($outer);
  $outer.append($layout);
  $layout.removeAttr('data-layout');
}

function inferContainerWidth($, $block) {
  const $stackCell = $block.closest('.stat-stack, .benefit-stack, .product-stack, .feature-card-cell, .image-split-stack, .accent-band-stack, .step-stack').first();
  if ($stackCell.length && $stackCell.is('td')) {
    const horizontalPad = sectionHorizontalPad($, $block);
    const outerWidth = outerTableWidth($, $block);
    const cellWidthAttr = String($stackCell.attr('width') || '');
    const pctMatch = cellWidthAttr.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      const cellPad = cellHorizontalPad($stackCell);
      const contentWidth = outerWidth - horizontalPad;
      const width = Math.round((contentWidth * parseFloat(pctMatch[1])) / 100 - cellPad);
      return Math.max(width, 178);
    }
    if ($stackCell.closest('.stats-four-section').length) {
      return Math.max(Math.round((outerWidth - horizontalPad) / 4), 178);
    }
    if ($stackCell.closest('.steps-horizontal-section').length) {
      return Math.max(Math.round((outerWidth - horizontalPad) * 0.3), 178);
    }
    return Math.max(Math.round((outerWidth - horizontalPad) / 3), 178);
  }
  if ($stackCell.length) {
    if ($stackCell.hasClass('stat-stack') || $stackCell.hasClass('benefit-stack') || $stackCell.hasClass('product-stack')) {
      return 181;
    }
  }

  const $threeUpCell = $block.closest('.three-up-stack-cell, .three-up-cell').first();
  if ($threeUpCell.length) {
    const cellWidthAttr = String($threeUpCell.attr('width') || '');
    const pctMatch = cellWidthAttr.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      const horizontalPad = sectionHorizontalPad($, $block);
      const outerWidth = outerTableWidth($, $block);
      const cellPad = cellHorizontalPad($threeUpCell);
      const contentWidth = outerWidth - horizontalPad;
      const width = Math.round((contentWidth * parseFloat(pctMatch[1])) / 100 - cellPad);
      return Math.max(width, 178);
    }
  }

  const horizontalPad = sectionHorizontalPad($, $block);
  const outerWidth = outerTableWidth($, $block);
  return Math.max(outerWidth - horizontalPad, 178);
}

function outerTableWidth($, $block) {
  const $outer = $block.closest('table.outer').first();
  return Number(($outer.attr('width') || '640').toString().replace(/px$/, '')) || 640;
}

function sectionHorizontalPad($, $block) {
  const $padCell = $block.closest('.section-pad, .section-pad-tight, .section-pad-accent, .mobile-padding').first();
  const style = ($padCell.attr('style') || '') + ($block.closest('td, th').first().attr('style') || '');
  const padMatch = style.match(/padding:\s*(?:\d+px\s+)?(\d+)px/i);
  return padMatch ? Number(padMatch[1]) * 2 : 48;
}

function cellHorizontalPad($cell) {
  const style = $cell.attr('style') || '';
  const padMatch = style.match(/padding:\s*(?:\d+px\s+)?(\d+)px(?:\s+(\d+)px)?/i);
  if (!padMatch) return 0;
  const right = padMatch[2] ? Number(padMatch[2]) : Number(padMatch[1]);
  const left = Number(padMatch[1]);
  return left + right;
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
