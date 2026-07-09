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
    if ($el.attr('data-studio-field')) return;
    if (isInsideStudioRepeat($el)) return;
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
    if ($spacer.attr('data-studio-spacer')) return;
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

function emptyModeKey(fieldKey) {
  return `${fieldKey}_empty`;
}

function listModesKey(fieldKey) {
  return `${fieldKey}_modes`;
}

function getEmptyMode(overrides, fieldKey) {
  return overrides[emptyModeKey(fieldKey)] === 'spacer' ? 'spacer' : 'hide';
}

function applyAsLineBreak($el) {
  showForEmail($el);
  if ($el.attr('data-studio-style') !== undefined) {
    const original = $el.attr('data-studio-style');
    if (original) $el.attr('style', original);
    else $el.removeAttr('style');
    $el.removeAttr('data-studio-style');
  }
  $el.attr('class', 'text-spacer');
  $el.attr('data-studio-spacer', '1');
  $el.html('&nbsp;');
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineText(value) {
  const escaped = escapeHtml(normalizeTextValue(value));
  if (!/\*\*(.+?)\*\*/.test(escaped)) return escaped;
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="font-weight:bold;font-family:ARIALNB,Arial,sans-serif;"><span style="font-family:ARIALNB,Arial,sans-serif;font-weight:bold;">$1</span></strong>',
  );
}

function hardenBoldForEmail($) {
  $('h1, h3').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    if (!/font-weight\s*:/i.test(style)) {
      $el.attr('style', style ? `${style};font-weight:bold` : 'font-weight:bold');
    }
  });

  $('span, p').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    if (!/ARIALNB/i.test(style)) return;
    if ($el.closest('.buttonWrapper, .buttonTable, .button-outline-table, a.buttonClass, a.button-outline-link').length) return;
    if ($el.is('.stat-number, .step-number, .badge-new, .download-icon, .icon-circle, .play-badge')) return;
    if (!/font-weight\s*:\s*bold/i.test(style)) {
      $el.attr('style', style ? `${style};font-weight:bold` : 'font-weight:bold');
    }
    if (!$el.find('strong, b').length && $el.children().length === 0) {
      const text = $el.text();
      $el.html(`<strong style="font-weight:bold;">${escapeHtml(text)}</strong>`);
    }
  });
}

function applyTextOverride($el, value, emptyMode = 'hide') {
  if (isEmptyOverride(value)) {
    if (emptyMode === 'spacer') {
      applyAsLineBreak($el);
    } else {
      hideForEmail($el);
    }
    return;
  }
  showForEmail($el);
  $el.removeAttr('data-studio-spacer');
  const formatted = formatInlineText(value);
  if (formatted.includes('<strong')) {
    $el.html(formatted);
    return;
  }
  const $span = $el.find('span').first();
  if ($span.length === 1 && $el.children().length === 1) {
    $span.text(value);
  } else {
    $el.text(value);
  }
}

function normalizeOverrides(moduleId, overrides = {}) {
  const o = { ...overrides };

  if (moduleId === 'body-paragraph') {
    if (!o.list_body && o.text_2) o.list_body = [o.text_2];
    if (!o.greeting && o.text_0) o.greeting = o.text_0;
    if (!o.signoff && o.text_4) o.signoff = o.text_4;
  }

  if (moduleId === 'body-bullets') {
    if (!o.greeting && o.text_0) o.greeting = o.text_0;
    if (!o.intro && o.text_2) o.intro = o.text_2;
    if (!o.signoff && o.text_7) o.signoff = o.text_7;
    if (!o.list_bullets) {
      const bullets = [o.text_3, o.text_4, o.text_5].filter((v) => v !== undefined);
      if (bullets.length) o.list_bullets = bullets;
    }
  }

  return o;
}

function isInsideStudioRepeat($el) {
  return $el.closest('[data-studio-repeat]').length > 0;
}

function extractStudioFields($, $block, fields) {
  $block.find('[data-studio-field], [data-studio-repeat]').each((_, el) => {
    const $el = $(el);

    if ($el.attr('data-studio-field')) {
      const key = $el.attr('data-studio-field');
      fields.push({
        key,
        type: 'text',
        label: $el.attr('data-studio-label') || key,
        value: normalizeTextValue($el.text()),
        multiline: true,
        hideWhenEmpty: true,
      });
      return;
    }

    const name = $el.attr('data-studio-repeat');
    if (!name) return;

    const itemSel = $el.attr('data-studio-item') || 'p';
    const items = [];
    $el.children(itemSel).each((__, child) => {
      const $child = $(child);
      if ($child.hasClass('text-spacer')) return;
      items.push(normalizeTextValue($child.text()));
    });
    if (!items.length) items.push('');

    fields.push({
      key: `list_${name}`,
      type: 'text-list',
      label: $el.attr('data-studio-label') || `${name} items`,
      itemLabel: $el.attr('data-studio-item-label') || 'Item',
      value: items,
      minItems: Number($el.attr('data-studio-min') || 1),
      maxItems: Number($el.attr('data-studio-max') || 12),
      hideWhenEmpty: true,
    });
  });
}

function applyStudioFields($, $block, overrides) {
  $block.find('[data-studio-field]').each((_, el) => {
    const $el = $(el);
    const key = $el.attr('data-studio-field');
    if (!key || !Object.prototype.hasOwnProperty.call(overrides, key)) return;
    applyTextOverride($el, overrides[key], getEmptyMode(overrides, key));
  });

  $block.find('[data-studio-repeat]').each((_, el) => {
    const $repeat = $(el);
    const name = $repeat.attr('data-studio-repeat');
    if (!name) return;

    const key = `list_${name}`;
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) return;

    const raw = overrides[key];
    const items = Array.isArray(raw) ? raw : [raw];
    const modes = Array.isArray(overrides[listModesKey(key)]) ? overrides[listModesKey(key)] : [];
    const itemSel = $repeat.attr('data-studio-item') || 'p';
    const $template = $repeat.children(itemSel).first();

    if (!$template.length) return;

    $repeat.empty();
    for (let i = 0; i < items.length; i += 1) {
      const text = items[i];
      const mode = modes[i] === 'spacer' ? 'spacer' : 'hide';
      if (isEmptyOverride(text)) {
        if (mode === 'spacer') {
          $repeat.append('<p class="text-spacer" data-studio-spacer="1">&nbsp;</p>');
        }
        continue;
      }
      const $item = $template.clone();
      applyTextOverride($item, text, 'hide');
      $repeat.append($item);
    }

    if (!$repeat.children().length) {
      hideForEmail($repeat);
    } else {
      showForEmail($repeat);
    }
  });
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
      extractStudioFields($, $block, fields);

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

function tagPreviewFields($) {
  $('[data-studio-field]').each((_, el) => {
    const $el = $(el);
    if (isElementHidden($el)) return;
    const key = $el.attr('data-studio-field');
    if (key) $el.attr('data-studio-edit', key);
  });

  $('[data-studio-repeat]').each((_, el) => {
    const $repeat = $(el);
    const name = $repeat.attr('data-studio-repeat');
    if (!name) return;
    const key = `list_${name}`;
    const itemSel = $repeat.attr('data-studio-item') || 'p';
    let listIndex = 0;
    $repeat.children(itemSel).each((__, child) => {
      const $child = $(child);
      if (isElementHidden($child)) return;
      $child.attr('data-studio-edit', key);
      $child.attr('data-studio-list-index', String(listIndex));
      listIndex += 1;
    });
  });

  let textCount = 0;
  let imageCount = 0;
  let buttonCount = 0;
  let linkCount = 0;

  $('[data-editorblocktype]').each((_, block) => {
    const $block = $(block);
    const blockType = ($block.attr('data-editorblocktype') || '').toLowerCase();

    if (blockType === 'text') {
      textCount = eachTextField($, $block, textCount, ($el, index, isSpacer) => {
        if (isSpacer || isElementHidden($el)) return;
        $el.attr('data-studio-edit', `text_${index}`);
      });
    }

    if (blockType === 'image') {
      const $img = $block.find('img').first();
      if ($img.length && !isElementHidden($img)) {
        $img.attr('data-studio-edit', `image_${imageCount}_src`);
        imageCount += 1;
      }
    }

    if (blockType === 'button') {
      const $link = $block.find('a').first();
      if ($link.length && !isElementHidden($link)) {
        $link.attr('data-studio-edit', `button_${buttonCount}_label`);
        buttonCount += 1;
      }
    }
  });

  $('a.text-link-cta, a.social-link').each((_, el) => {
    const $el = $(el);
    if (isElementHidden($el)) return;
    $el.attr('data-studio-edit', `link_${linkCount}_label`);
    linkCount += 1;
  });
}

const PREVIEW_INTERACTION_STYLE = `<style id="studio-preview-style">
[data-studio-edit] { cursor: pointer; border-radius: 2px; transition: outline 0.12s ease, background 0.12s ease; }
[data-studio-edit]:hover { outline: 2px solid rgba(239,120,0,0.5); outline-offset: 2px; }
[data-studio-edit].studio-edit-active { outline: 2px solid #ef7800; outline-offset: 2px; background: rgba(239,120,0,0.1); }
[data-studio-module] { border-radius: 4px; transition: outline 0.12s ease; }
[data-studio-module].studio-module-active { outline: 2px dashed rgba(239,120,0,0.4); outline-offset: 6px; }
</style>`;

function syncButtonBlockHtml(html, href, label) {
  const safeHref = String(href || '#').replace(/"/g, '&quot;');
  const safeLabel = String(label || 'Button label');
  let out = html;
  out = out.replace(/(<a[^>]*class="[^"]*button[^"]*"[^>]*href=")[^"]*(")/gi, `$1${safeHref}$2`);
  out = out.replace(/(<v:roundrect[^>]*href=")[^"]*(")/gi, `$1${safeHref}$2`);
  out = out.replace(/(<center[^>]*style="[^"]*">)([^<]*)(<\/center>)/gi, `$1${safeLabel}$3`);
  return out;
}

function applyOverrides(moduleId, overrides = {}, options = {}) {
  const { annotate = false } = options;
  const normalized = normalizeOverrides(moduleId, overrides);
  const hasOverrides = normalized && Object.keys(normalized).length;

  if (!hasOverrides && !annotate) {
    return loadResolvedModuleHtml(moduleId);
  }

  const html = loadResolvedModuleHtml(moduleId);
  const $ = cheerio.load(html, { xml: false }, false);

  if (!hasOverrides) {
    collapseOrphanSpacers($);
    collapseEmptyFaqPairs($);
    if (annotate) tagPreviewFields($);
    return $.root().html() || html;
  }

  let textCount = 0;
  let imageCount = 0;
  let buttonCount = 0;
  let linkCount = 0;

  $('[data-editorblocktype]').each((_, block) => {
    const $block = $(block);
    const blockType = ($block.attr('data-editorblocktype') || '').toLowerCase();

    if (blockType === 'text') {
      applyStudioFields($, $block, normalized);

      textCount = eachTextField($, $block, textCount, ($el, index, isSpacer) => {
        if (isSpacer) return;
        const key = `text_${index}`;
        if (Object.prototype.hasOwnProperty.call(normalized, key)) {
          applyTextOverride($el, normalized[key], getEmptyMode(normalized, key));
        }
      });
    }

    if (blockType === 'image') {
      const $img = $block.find('img').first();
      if ($img.length) {
        const srcKey = `image_${imageCount}_src`;
        const altKey = `image_${imageCount}_alt`;
        if (Object.prototype.hasOwnProperty.call(normalized, srcKey)) {
          $img.attr('src', normalized[srcKey]);
        }
        if (Object.prototype.hasOwnProperty.call(normalized, altKey)) {
          $img.attr('alt', normalized[altKey]);
        }
        imageCount += 1;
      }
    }

    if (blockType === 'button') {
      const $link = $block.find('a').first();
      if ($link.length) {
        const labelKey = `button_${buttonCount}_label`;
        const hrefKey = `button_${buttonCount}_href`;
        let label = $link.text();
        let href = $link.attr('href') || '#';
        if (Object.prototype.hasOwnProperty.call(normalized, labelKey)) {
          label = normalized[labelKey];
          $link.text(label);
        }
        if (Object.prototype.hasOwnProperty.call(normalized, hrefKey)) {
          href = normalized[hrefKey];
          $link.attr('href', href);
        }
        const synced = syncButtonBlockHtml($block.html() || '', href, label);
        $block.html(synced);
        buttonCount += 1;
      }
    }
  });

  $('a.text-link-cta, a.social-link').each((_, el) => {
    const $el = $(el);
    const labelKey = `link_${linkCount}_label`;
    const hrefKey = `link_${linkCount}_href`;
    if (Object.prototype.hasOwnProperty.call(normalized, labelKey)) {
      $el.text(normalized[labelKey]);
    }
    if (Object.prototype.hasOwnProperty.call(normalized, hrefKey)) {
      $el.attr('href', normalized[hrefKey]);
    }
    linkCount += 1;
  });

  collapseOrphanSpacers($);
  collapseEmptyFaqPairs($);
  hardenBoldForEmail($);

  if (annotate) tagPreviewFields($);

  const result = $.root().html();
  return result || html;
}

module.exports = {
  extractFields,
  applyOverrides,
  loadResolvedModuleHtml,
  normalizeOverrides,
  PREVIEW_INTERACTION_STYLE,
};
