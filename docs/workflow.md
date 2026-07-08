# Workflow

## Create a new weekly email

1. Copy the promo template structure into a new campaign folder:

```
campaigns/2026-07-my-campaign/
  source.html
  blocks/        (optional — override header, body, etc.)
  notes.md
  subject-lines.md
```

2. Point `source.html` at modules (recommended) or campaign-specific overrides:

```html
<!-- @include ../../components/modules/header-standard.html -->
<!-- @include ../../components/modules/hero-full.html -->
<!-- @include ../../components/modules/body-bullets.html -->
<!-- @include ../../components/modules/cta-primary-center.html -->
<!-- @include ../../components/modules/footer.html -->
```

Browse all 32 modules: `npm run preview -- catalog`. See [modules.md](modules.md).

3. Build and preview:

```bash
npm run build
npm run preview -- my-campaign
```

## Paste into D365

1. **Emails → + New email**
2. **Design → HTML** tab
3. Delete default content, paste full `email.html`
4. **Design → Designer** tab — swap images, fix links
5. **Check content** — must pass
6. **Preview and Test** — desktop + mobile with sample contact
7. Add to **Customer Journey** → go live

## Preview expectations

| Where | What it shows |
|-------|---------------|
| Browser (`npm run preview`) | Layout, spacing, colors — fast iteration |
| D365 Preview and Test | HQ fonts from CDN, personalization, final mobile |

Always do a final D365 preview before sending.

## Edit checklist (every send)

- [ ] Hero image replaced
- [ ] Feature/product images replaced
- [ ] CTA links point to correct URLs (add UTM if needed)
- [ ] Subject line and preheader set in D365
- [ ] `{{FirstName}}` mapped via Personalization
- [ ] Footer has `{{CompanyAddress}}` and `{{PreferenceCenter}}`
- [ ] Content Settings assigned on journey

## Brand reference

See [brand/guidelines.md](../brand/guidelines.md) and [brand/tokens.json](../brand/tokens.json).
