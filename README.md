# Email Marketing Planner

A file-based workspace for creating, drafting, and publishing marketing emails to **Dynamics 365 Customer Insights — Journeys** — for both dev iteration and team reuse as **content blocks** and **email templates**.

## Quick start

```bash
npm install
npm run build:d365                        # export D365 blocks + templates
npm run new-draft -- summer-sale promo    # create a dev draft
npm run build                             # build D365 exports + MJML drafts
```

**For your team in D365:** see **[docs/d365-publish-guide.md](docs/d365-publish-guide.md)**

## Folder structure

```
components/d365/blocks/   Source of truth — D365 content blocks (edit here)
components/d365/_base/    Shared D365 styles and HTML wrappers
components/d365-wrapped/  Generated MJML wrappers (do not edit)
components/brand-head.mjml  MJML dev styles
templates/d365/           Full D365 email templates (assembled on build)
templates/                MJML dev drafts (use D365 blocks via d365-wrapped)
drafts/                   Work-in-progress campaigns
d365-manifest.json        Catalog of block/template names for D365
dist/d365/blocks/         Built blocks → paste into D365 content blocks
dist/d365/templates/      Built templates → paste into D365 emails
dist/                     MJML compile output (dev drafts)
docs/                     D365 publish guide, brand guidelines, workflow
```

## Two workflows

### For your team (D365 library)

1. Edit blocks in `components/d365/blocks/*.html`
2. Run `npm run build:d365`
3. Publish to D365 per **[docs/d365-publish-guide.md](docs/d365-publish-guide.md)**:
   - **Content blocks** → team drags `WM_header`, `WM_body`, `WM_footer`, etc.
   - **Email templates** → team starts from `WM_promo`, `WM_newsletter`, `WM_welcome`, `WM_event`

### For dev drafting (this repo)

1. `npm run new-draft -- <slug> [template]`
2. Edit MJML in `drafts/<folder>/`
3. `npm run build` — creates `drafts/<folder>/email.html` next to your draft
4. **View:** open `email.html` in your browser, or paste into D365

**View draft (no preview server):**
1. Run `npm run build`
2. Open `drafts/<folder>/email.html` in Cursor or double-click to open in Chrome/Edge/Safari

## D365 content blocks

| Block | D365 name | Purpose |
|-------|-----------|---------|
| `wm-header.html` | `WM_header` | Logo + tagline |
| `wm-hero.html` | `WM_hero` | Full-width banner |
| `wm-intro.html` | `WM_intro` | H1 + H2 |
| `wm-body.html` | `WM_body` | Greeting + body copy |
| `wm-cta-button.html` | `WM_cta_button` | Orange button |
| `wm-accent-band.html` | `WM_accent_band` | Orange highlight strip |
| `wm-feature-block-left.html` | `WM_feature_block_left` | 60/40 text + image |
| `wm-divider.html` | `WM_divider` | Orange rule |
| `wm-feature-block-right.html` | `WM_feature_block_right` | 40/60 image + text |
| `wm-two-up-cards.html` | `WM_two_up_cards` | 50/50 product cards |
| `wm-event-details.html` | `WM_event_details` | Date, time, location, agenda |
| `wm-footer.html` | `WM_footer` | **Required** on every email |

Full catalog: `d365-manifest.json`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build:d365` | Export blocks + templates to `dist/d365/` |
| `npm run build` | Build D365 exports + compile all MJML |
| `npm run build:mjml` | Compile MJML only (requires prior `build:d365`) |
| `npm run new-draft -- <slug> [template]` | Scaffold a draft folder (newsletter, promo, welcome, event) |
| `npm run preview -- [path]` | Browser preview with auto-reload (optional) |
| `npm run validate:d365` | Pre-publish checklist for D365 blocks and templates |

## Docs

- **[docs/d365-publish-guide.md](docs/d365-publish-guide.md)** — register blocks and templates in D365
- **[docs/d365-team-cheatsheet.md](docs/d365-team-cheatsheet.md)** — quick reference for marketers in D365
- **[docs/dynamics-365.md](docs/dynamics-365.md)** — import, schedule, go-live workflow
- **[docs/brand-guidelines.md](docs/brand-guidelines.md)** — Weidmüller colors, fonts, layout

## Source of truth

| Edit here | Do not edit |
|-----------|-------------|
| `components/d365/blocks/*.html` | `dist/d365/` |
| `templates/d365/*.html` | `components/d365-wrapped/` |
| `d365-manifest.json` | |

After editing D365 sources, always run `npm run build:d365` then republish in D365.

## Responsive design

All blocks and templates are optimized for **desktop (640px)** and **mobile**. Styles use fluid widths, `stack-column` stacking, touch-friendly buttons (44px min), and `@media` queries. Test at 640px, 375px, and desktop before publishing. See `docs/brand-guidelines.md`.
