# Publishing to Dynamics 365

This guide explains how to register repo templates and components so your team can use them inside **Customer Insights — Journeys**.

## What gets built

```bash
npm run build:d365
```

| Output | Purpose |
|--------|---------|
| `dist/d365/blocks/*.html` | Individual **content blocks** to paste into D365 |
| `dist/d365/templates/*.html` | Full **email templates** ready to import |
| `dist/d365/manifest.json` | Catalog of block/template names and descriptions |
| `components/d365-wrapped/*.mjml` | Auto-generated MJML wrappers (used by dev drafts) |

Run `npm run build` to build both D365 exports and MJML drafts.

---

## Part 1 — Publish content blocks (reusable components)

Content blocks let your team **drag and drop** sections in the D365 email designer.

### For each block in `dist/d365/blocks/`:

1. Open **Customer Insights — Journeys**
2. Go to **Marketing templates** → **Content blocks** (or **Library** → **Content blocks**)
3. Click **+ New**
4. Set **Name** to the `d365Name` from `d365-manifest.json` (e.g. `WM_header`)
5. Go to the **HTML** tab in the block designer
6. Paste the full contents of the matching file from `dist/d365/blocks/`
7. Set **Protected** = **No** (unless it's `WM_footer` — keep protected)
8. **Save** and **Go live**

### Recommended publish order

| Order | Block file | D365 name | Notes |
|-------|-----------|-----------|-------|
| 1 | `wm-footer.html` | `WM_footer` | Required on every email; may already exist |
| 2 | `wm-header.html` | `WM_header` | Logo + tagline |
| 3 | `wm-hero.html` | `WM_hero` | Full-width banner |
| 4 | `wm-intro.html` | `WM_intro` | H1 + H2 |
| 5 | `wm-body.html` | `WM_body` | Greeting + body copy |
| 6 | `wm-cta-button.html` | `WM_cta_button` | Primary button |
| 7 | `wm-accent-band.html` | `WM_accent_band` | Orange strip |
| 8 | `wm-feature-block-left.html` | `WM_feature_block_left` | 60/40 layout |
| 9 | `wm-divider.html` | `WM_divider` | Orange rule |

### Verify blocks are editable

After publishing, create a test email and drag each block in. Confirm:
- Text blocks are editable in the designer
- Images can be swapped
- Buttons link correctly
- `WM_footer` resolves `{{CompanyAddress}}` and `{{PreferenceCenter}}`
- **Mobile:** use D365 preview at phone width — columns stack, images scale, buttons are tappable

---

## Part 2 — Publish email templates (full emails)

Email templates let your team **start from a complete layout**.

### For each template in `dist/d365/templates/`:

1. Go to **Emails** → **+ New email**
2. Open **Design → HTML** tab
3. Clear default content
4. Paste the full HTML from `dist/d365/templates/wm-promo.html` (or newsletter/welcome)
5. Switch to **Design → Designer** tab — verify layout
6. Run **Check content** — must pass (footer includes compliance tokens)
7. **Save**
8. Click **Save as template** (or **Marketing templates** → **Email templates** → create from this email)
9. Name it per manifest (e.g. `WM_promo`)
10. **Go live** on the template

### Available templates

| File | D365 name | Use case |
|------|-----------|----------|
| `wm-newsletter.html` | `WM_newsletter` | Regular content updates |
| `wm-promo.html` | `WM_promo` | Events, launches, promotions |
| `wm-welcome.html` | `WM_welcome` | Onboarding / welcome series |

---

## Part 3 — Team workflow in D365

Once published, your team can:

### Option A — Start from a template
1. **Emails** → **+ New** → **From template**
2. Select `WM_promo`, `WM_newsletter`, or `WM_welcome`
3. Edit text/images in the designer
4. Add to a Customer Journey → schedule → go live

### Option B — Build from blocks
1. **Emails** → **+ New email**
2. Drag blocks from the content block library (`WM_header`, `WM_body`, etc.)
3. Always end with `WM_footer`
4. Check content → preview → schedule

### Option C — Dev drafts from this repo
1. Create draft: `npm run new-draft -- campaign-name promo`
2. Preview: `npm run preview -- campaign-name`
3. Build: `npm run build`
4. Paste `dist/drafts/<campaign>/email.html` into D365

---

## Updating published blocks/templates

When you change a block in `components/d365/blocks/`:

1. Edit the source HTML in the repo
2. Run `npm run build:d365`
3. In D365, open the existing content block or template
4. Replace HTML with the updated file from `dist/d365/`
5. Save and go live

Track versions in git — each commit is your change history.

---

## Manifest reference

See `d365-manifest.json` for the full catalog:

- `contentBlocks[]` — draggable components
- `emailTemplates[]` — full email starting points
- `d365Name` — exact name to use in D365
- `editable` — which designer tools work on that block

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Check content fails on address/unsubscribe | Ensure `WM_footer` is at the end with `{{CompanyAddress}}` and `{{PreferenceCenter}}` |
| Block not editable in designer | Verify `data-editorblocktype` attributes are present |
| Fonts don't render | Fonts load from D365 CDN — preview inside D365, not just local browser |
| `WM_footer` content block not found | Publish `wm-footer.html` first, or update `data-lookup-id` in manifest to match your tenant |
| Template over 1 MB | Reduce images; D365 emails have a 1 MB HTML limit |

---

## Source of truth

| What | Where to edit |
|------|---------------|
| Content blocks | `components/d365/blocks/*.html` |
| Full templates | `templates/d365/*.html` |
| Brand styles | `components/d365/_base/styles.css` |
| Block catalog | `d365-manifest.json` |

**Never edit** `dist/d365/` or `components/d365-wrapped/` directly — they are generated.
