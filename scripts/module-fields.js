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

function inferTextLabel(tagName, index) {
  const tag = tagName.toLowerCase();
  if (tag === 'h1') return 'Headline';
  if (tag === 'h2') return 'Subheadline';
  if (tag === 'h3') return 'Title';
  if (tag === 'p') return index === 0 ? 'Paragraph' : `Paragraph ${index + 1}`;
  if (tag === 'li') return `List item ${index + 1}`;
  return `Text ${index + 1}`;
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
      $block.find('h1, h2, h3, p, li').each((idx, el) => {
        const $el = $(el);
        const tag = el.tagName.toLowerCase();
        if (!$el.text().trim() && tag !== 'p') return;

        fields.push({
          key: `text_${textCount}`,
          type: 'text',
          label: inferTextLabel(tag, idx),
          value: $el.text().trim(),
          multiline: tag === 'p' || tag === 'li',
        });
        textCount += 1;
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
      $block.find('h1, h2, h3, p, li').each((idx, el) => {
        const $el = $(el);
        const tag = el.tagName.toLowerCase();
        if (!$el.text().trim() && tag !== 'p') return;

        const key = `text_${textCount}`;
        if (Object.prototype.hasOwnProperty.call(overrides, key)) {
          $el.text(overrides[key]);
        }
        textCount += 1;
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

  const result = $.root().html();
  return result || html;
}

module.exports = {
  extractFields,
  applyOverrides,
  loadResolvedModuleHtml,
};
