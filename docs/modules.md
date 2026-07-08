# Module Library

32 polished, on-brand modules for building long emails. Pick what you need, leave out the rest.

## Preview all modules

```bash
npm run build
npm run preview -- catalog
```

Grey labels in the catalog show each module name. Copy `@include` lines into your campaign `source.html`.

## Quick reference

| Category | Modules |
|----------|---------|
| **Header** | `header-standard`, `header-minimal` |
| **Hero** | `hero-full`, `hero-caption` |
| **Intro** | `intro-headline`, `intro-centered` |
| **Body** | `body-paragraph`, `body-bullets`, `body-checklist` |
| **CTA** | `cta-primary-left`, `cta-primary-center`, `cta-dual`, `cta-text-link` |
| **Accent** | `accent-band`, `accent-band-cta` |
| **Layout** | `divider-line`, `spacer-sm`, `spacer-lg` |
| **Feature** | `feature-left`, `feature-right`, `two-up-cards`, `stats-three`, `three-up-benefits`, `comparison-split` |
| **Event** | `event-details`, `agenda-list` |
| **Social proof** | `quote-testimonial` |
| **Newsletter** | `article-row`, `article-stack` |
| **Media** | `image-caption`, `video-preview` |
| **Footer** | `footer` (required on every email) |

Full manifest: [components/modules/manifest.json](../components/modules/manifest.json)

## Use a module in your campaign

In `campaigns/your-campaign/source.html`:

```html
<!-- @include ../../components/modules/hero-full.html -->
<!-- @include ../../components/modules/intro-headline.html -->
<!-- @include ../../components/modules/body-bullets.html -->
```

Mix and match any order. Always start with a header, end with `footer`.

## Example compositions

| Email type | Suggested module flow |
|------------|----------------------|
| **Product launch** | header-standard → hero-full → intro-headline → body-bullets → stats-three → feature-left → feature-right → cta-primary-center → accent-band → footer |
| **Event invite** | header-standard → hero-caption → intro-centered → body-paragraph → event-details → agenda-list → cta-primary-center → accent-band-cta → footer |
| **Newsletter** | header-minimal → intro-headline → article-row → divider-line → article-row → article-stack → cta-text-link → footer |
| **Long promo** | See `templates/long-form-promo.html` — preview with `npm run preview -- long-form` |

## Polish standards (built into every module)

- 640px max width, fluid on mobile
- `stack-column` — multi-column layouts stack on phone
- Table-based buttons — centered text, 44px tap target
- Consistent padding: 24px desktop, 20px mobile
- HQ fonts and `#ef7800` orange from brand tokens
- `data-editorblocktype` — editable in D365 designer

## Customize a module

1. **Use as-is** — include directly from `components/modules/`
2. **Campaign override** — copy module to `campaigns/your-campaign/blocks/` and edit
3. **Global update** — edit `components/modules/` to improve all future emails
