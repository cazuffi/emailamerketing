const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'components/modules');

function resolveIncludes(content, baseDir, depth = 0) {
  if (depth > 20) throw new Error('Include depth exceeded');
  return content.replace(/<!--\s*@include\s+([^\s]+)\s*-->/g, (_, includePath) => {
    const fullPath = path.resolve(baseDir, includePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Include not found: ${includePath} (resolved: ${fullPath})`);
    }
    const included = fs.readFileSync(fullPath, 'utf8');
    return resolveIncludes(included, path.dirname(fullPath), depth + 1);
  });
}

function loadResolvedModuleHtml(moduleId) {
  const modulePath = path.join(MODULES_DIR, `${moduleId}.html`);
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Module not found: ${moduleId}`);
  }
  const raw = fs.readFileSync(modulePath, 'utf8');
  return resolveIncludes(raw, path.dirname(modulePath));
}

function inferTextLabel(tagName, index, $el) {
  const tag = tagName.toLowerCase();
  const text = normalizeTextValue($el.text());
  if ($el.hasClass('faq-question')) return `FAQ question ${index + 1}`;
  if ($el.hasClass('faq-answer')) return `FAQ answer ${index + 1}`;
  if ($el.hasClass('bullet-item')) return `Bullet ${index + 1}`;
  if (tag === 'h1') return 'Headline';
  if (tag === 'h2') return 'Subheadline';
  if (tag === 'h3') return 'Title';
  if (tag === 'p') {
    if (/regards/i.test(text)) return 'Sign-off';
    if (/^\{\{|\bhi\b/i.test(text)) return 'Greeting';
    if (index === 0) return 'Paragraph';
    return `Paragraph ${index + 1}`;
  }
  if (tag === 'li') return `List item ${index + 1}`;
  return `Text ${index + 1}`;
}

function normalizeTextValue(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function isEmptyOverride(value) {
  return normalizeTextValue(value).length === 0;
}

const HIDE_STYLE = 'display:none;mso-hide:all;font-size:0;line-height:0;max-height:0;margin:0;padding:0;overflow:hidden;height:0;';

function isElementHidden($el) {
  const style = ($el.attr('style') || '').toLowerCase();
  return style.includes('display:none') || style.includes('display: none');
}

function hideForEmail($el) {
  if (isElementHidden($el)) return;
  if ($el.attr('data-studio-style') === undefined) {
    $el.attr('data-studio-style', $el.attr('style') || '');
  }
  const base = $el.attr('data-studio-style') || '';
  $el.attr('style', base ? `${base};${HIDE_STYLE}` : HIDE_STYLE);
}

function showForEmail($el) {
  if ($el.attr('data-studio-style') !== undefined) {
    const original = $el.attr('data-studio-style');
    if (original) $el.attr('style', original);
    else $el.removeAttr('style');
    $el.removeAttr('data-studio-style');
    return;
  }
  const style = ($el.attr('style') || '')
    .replace(/display\s*:\s*none\s*;?/gi, '')
    .replace(/mso-hide\s*:\s*all\s*;?/gi, '')
    .replace(/font-size\s*:\s*0\s*;?/gi, '')
    .replace(/line-height\s*:\s*0\s*;?/gi, '')
    .replace(/max-height\s*:\s*0\s*;?/gi, '')
    .replace(/overflow\s*:\s*hidden\s*;?/gi, '')
    .replace(/height\s*:\s*0\s*;?/gi, '')
    .replace(/^\s*;+\s*|\s*;+\s*$/g, '')
    .replace(/;{2,}/g, ';')
    .trim();
  if (style) $el.attr('style', style);
  else $el.removeAttr('style');
}

function shouldSkipEmptyNonParagraph($el) {
  const tag = $el[0].tagName.toLowerCase();
  return !normalizeTextValue($el.text()) && tag !== 'p';
}

function eachTextField($, $block, startCount, fn) {
  let textCount = startCount;
  $block.find('h1, h2, h3, p, li').each((idx, el) => {
    const $el = $(el);
    if (shouldSkipEmptyNonParagraph($el)) return;
    const tag = el.tagName.toLowerCase();
    const isSpacer = $el.hasClass('text-spacer');
    fn($el, textCount, isSpacer, tag, idx);
    textCount += 1;
  });
  return textCount;
}

function collapseOrphanSpacers($) {
  $('p.text-spacer').each((_, el) => {
    const $spacer = $(el);
    const $prev = $spacer.prev('p');
    const $next = $spacer.next('p');
    const prevHidden = $prev.length && isElementHidden($prev);
    const nextHidden = $next.length && isElementHidden($next);
    if (prevHidden || nextHidden) hideForEmail($spacer);
  });
}

function collapseEmptyFaqPairs($) {
  $('p.faq-question').each((_, el) => {
    const $question = $(el);
    const $answer = $question.next('p.faq-answer');
    const questionHidden = isElementHidden($question);
    const answerHidden = $answer.length && isElementHidden($answer);
    if (questionHidden && $answer.length) hideForEmail($answer);
    if (answerHidden) hideForEmail($question);
  });
}

function applyTextOverride($el, value) {
  if (isEmptyOverride(value)) {
    hideForEmail($el);
    return;
  }
  showForEmail($el);
  $el.text(value);
}

function extractFields(moduleId) {
  const html = loadResolvedModuleHtml(moduleId);
  const $ = cheerio.load(html, { xml: false }, false);
  const fields = [];
  let textCount = 0;
  let imageCount = 0;
  let buttonCount = 0;
  let linkCount = 0;

  $('[data-editorblocktype]').each((_, block) => {
    const $block = $(block);
    const blockType = ($block.attr('data-editorblocktype') || '').toLowerCase();

    if (blockType === 'text') {
      let visibleTextIndex = 0;
      textCount = eachTextField($, $block, textCount, ($el, index, isSpacer, tag) => {
        if (isSpacer) return;

        fields.push({
          key: `text_${index}`,
          type: 'text',
          label: inferTextLabel(tag, visibleTextIndex, $el),
          value: normalizeTextValue($el.text()),
          multiline: tag === 'p' || tag === 'li',
          hideWhenEmpty: tag === 'p' || tag === 'li',
        });
        visibleTextIndex += 1;
      });
    }

    if (blockType === 'image') {
      const $img = $block.find('img').first();
      if ($img.length) {
        fields.push({
          key: `image_${imageCount}_src`,
          type: 'image-src',
          label: imageCount === 0 ? 'Image URL' : `Image ${imageCount + 1} URL`,
          value: $img.attr('src') || '',
        });
        fields.push({
          key: `image_${imageCount}_alt`,
          type: 'image-alt',
          label: imageCount === 0 ? 'Image alt text' : `Image ${imageCount + 1} alt`,
          value: $img.attr('alt') || '',
        });
        imageCount += 1;
      }
    }

    if (blockType === 'button') {
      const $link = $block.find('a').first();
      if ($link.length) {
        fields.push({
          key: `button_${buttonCount}_label`,
          type: 'button-label',
          label: buttonCount === 0 ? 'Button label' : `Button ${buttonCount + 1} label`,
          value: $link.text().trim(),
        });
        fields.push({
          key: `button_${buttonCount}_href`,
          type: 'button-href',
          label: buttonCount === 0 ? 'Button link' : `Button ${buttonCount + 1} link`,
          value: $link.attr('href') || '#',
        });
        buttonCount += 1;
      }
    }
  });

  $('a.text-link-cta, a.social-link').each((_, el) => {
    const $el = $(el);
    fields.push({
      key: `link_${linkCount}_label`,
      type: 'link-label',
      label: `Link ${linkCount + 1} label`,
      value: $el.text().trim(),
    });
    fields.push({
      key: `link_${linkCount}_href`,
      type: 'link-href',
      label: `Link ${linkCount + 1} URL`,
      value: $el.attr('href') || '#',
    });
    linkCount += 1;
  });

  return fields;
}

function applyOverrides(moduleId, overrides = {}) {
  if (!overrides || !Object.keys(overrides).length) {
    return loadResolvedModuleHtml(moduleId);
  }

  const html = loadResolvedModuleHtml(moduleId);
  const $ = cheerio.load(html, { xml: false }, false);

  let textCount = 0;
  let imageCount = 0;
  let buttonCount = 0;
  let linkCount = 0;

  $('[data-editorblocktype]').each((_, block) => {
    const $block = $(block);
    const blockType = ($block.attr('data-editorblocktype') || '').toLowerCase();

    if (blockType === 'text') {
      textCount = eachTextField($, $block, textCount, ($el, index, isSpacer) => {
        if (isSpacer) return;
        const key = `text_${index}`;
        if (Object.prototype.hasOwnProperty.call(overrides, key)) {
          applyTextOverride($el, overrides[key]);
        }
      });
    }

    if (blockType === 'image') {
      const $img = $block.find('img').first();
      if ($img.length) {
        const srcKey = `image_${imageCount}_src`;
        const altKey = `image_${imageCount}_alt`;
        if (Object.prototype.hasOwnProperty.call(overrides, srcKey)) {
          $img.attr('src', overrides[srcKey]);
        }
        if (Object.prototype.hasOwnProperty.call(overrides, altKey)) {
          $img.attr('alt', overrides[altKey]);
        }
        imageCount += 1;
      }
    }

    if (blockType === 'button') {
      const $link = $block.find('a').first();
      if ($link.length) {
        const labelKey = `button_${buttonCount}_label`;
        const hrefKey = `button_${buttonCount}_href`;
        if (Object.prototype.hasOwnProperty.call(overrides, labelKey)) {
          $link.text(overrides[labelKey]);
        }
        if (Object.prototype.hasOwnProperty.call(overrides, hrefKey)) {
          $link.attr('href', overrides[hrefKey]);
        }
        buttonCount += 1;
      }
    }
  });

  $('a.text-link-cta, a.social-link').each((_, el) => {
    const $el = $(el);
    const labelKey = `link_${linkCount}_label`;
    const hrefKey = `link_${linkCount}_href`;
    if (Object.prototype.hasOwnProperty.call(overrides, labelKey)) {
      $el.text(overrides[labelKey]);
    }
    if (Object.prototype.hasOwnProperty.call(overrides, hrefKey)) {
      $el.attr('href', overrides[hrefKey]);
    }
    linkCount += 1;
  });

  collapseOrphanSpacers($);
  collapseEmptyFaqPairs($);

  const result = $.root().html();
  return result || html;
}

module.exports = {
  extractFields,
  applyOverrides,
  loadResolvedModuleHtml,
};
