# Module Library

58 polished, on-brand modules for building long emails. Pick what you need, leave out the rest.

## Preview all modules

```bash
npm run build
npm run preview -- catalog
```

Grey labels in the catalog show each module name. Copy `@include` lines into your campaign `source.html`.

## Quick reference

| Category | Modules |
|----------|---------|
| **Header** | `preheader-bar`, `header-standard`, `header-minimal`, `header-cta` |
| **Hero** | `hero-full`, `hero-caption`, `hero-split`, `hero-text-only` |
| **Intro** | `eyebrow-headline`, `intro-headline`, `intro-centered` |
| **Body** | `body-paragraph`, `body-bullets`, `body-checklist`, `callout-box`, `faq-list`, `disclaimer-small` |
| **CTA** | `cta-primary-left`, `cta-primary-center`, `cta-outline-center`, `cta-dual`, `cta-text-link`, `cta-band-grey`, `download-resource` |
| **Accent** | `accent-band`, `accent-band-cta`, `urgency-band` |
| **Layout** | `divider-line`, `divider-dots`, `section-heading`, `spacer-sm`, `spacer-lg` |
| **Feature** | `feature-left`, `feature-right`, `two-up-cards`, `badge-highlight`, `icon-grid-four`, `steps-horizontal`, `steps-vertical`, `stats-three`, `stats-four`, `three-up-benefits`, `comparison-split`, `specs-table`, `pricing-two-up` |
| **Event** | `event-details`, `agenda-list` |
| **Social proof** | `quote-testimonial`, `quote-centered`, `logo-strip`, `team-profile`, `social-links` |
| **Newsletter** | `article-row`, `article-stack` |
| **Media** | `image-caption`, `image-fullbleed`, `video-preview` |
| **Footer** | `footer` (required on every email) |

Full manifest: [components/modules/manifest.json](../components/modules/manifest.json)

## Use a module in your campaign

In `campaigns/your-campaign/source.html`:

```html
<!-- @include ../../components/modules/preheader-bar.html -->
<!-- @include ../../components/modules/header-cta.html -->
<!-- @include ../../components/modules/hero-split.html -->
<!-- @include ../../components/modules/eyebrow-headline.html -->
<!-- @include ../../components/modules/icon-grid-four.html -->
<!-- @include ../../components/modules/footer.html -->
```

Mix and match any order. Always end with `footer`. Add `preheader-bar` first when you want inbox preview text.

## Example compositions

| Email type | Suggested module flow |
|------------|----------------------|
| **Product launch** | preheader-bar → header-standard → hero-split → eyebrow-headline → stats-four → icon-grid-four → feature-left → badge-highlight → quote-testimonial → cta-band-grey → footer |
| **Event invite** | preheader-bar → header-cta → hero-caption → intro-centered → event-details → agenda-list → steps-vertical → urgency-band → cta-primary-center → footer |
| **Newsletter** | header-minimal → intro-headline → article-row → divider-dots → article-stack → quote-centered → social-links → cta-text-link → footer |
| **Technical promo** | header-standard → hero-full → body-paragraph → specs-table → comparison-split → download-resource → faq-list → accent-band-cta → disclaimer-small → footer |
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
