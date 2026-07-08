# Workflow

## Easiest way: shell + pick modules (recommended)

This keeps D365 head, CSS, fonts, wrapper, and footer intact — you only add the sections you want.

```bash
# 1. Browse modules in browser
npm run preview -- catalog

# 2. Create a blank campaign with the shell already built in
npm run new -- july-promo

# 3. Pull in modules you like (by ID from catalog)
npm run add -- july-promo hero-split icon-grid-four cta-primary-center

# 4. Build the full email.html (safe to paste into D365)
npm run build
npm run preview -- july-promo
```

Paste `campaigns/2026-07-july-promo/email.html` into D365 → **Design → HTML**.

List all module IDs in terminal: `npm run list`

**Never paste a raw module into blank D365 HTML** — always paste the built `email.html`. The shell (head, styles, 640px wrapper, footer) is assembled automatically.

See also: [docs/modules.md](modules.md)

---

## Create a new weekly email (manual)

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

Browse all 58 modules: `npm run preview -- catalog`. See [modules.md](modules.md).

### Quick commands

| Command | What it does |
|---------|--------------|
| `npm run new -- my-promo` | Create campaign with D365 shell ready |
| `npm run add -- my-promo hero-split` | Add module(s) into the shell |
| `npm run list` | Print all module IDs in terminal |
| `npm run build` | Assemble `email.html` (paste this into D365) |
| `npm run preview -- my-promo` | Preview in browser |

## Create a new weekly email (manual)

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
