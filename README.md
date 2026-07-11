# Email Marketing Studio

D365-native HTML emails — edit in GitHub, preview in browser, paste into Insight Hub.

**No MJML.** HTML matches what Dynamics 365 expects.

## Quick start

```bash
npm install
npm run build
npm run preview -- sales-ignitor
```

Open the preview URL, edit `campaigns/*/source.html`, save — browser refreshes after rebuild.

## Pick modules without breaking the shell

```bash
npm run preview -- catalog          # browse 58 modules
npm run new -- my-promo             # creates shell (head, CSS, wrapper, footer)
npm run add -- my-promo hero-split icon-grid-four cta-primary-center
npm run build                       # → email.html (paste this into D365)
npm run preview -- my-promo
```

**Paste `email.html` into D365 — not individual modules.** The build assembles the full shell so layout, fonts, and footer stay intact.

`npm run list` — all module IDs in terminal.

## Hosted team app (Option C)

Visual composer for you and your coordinator — no terminal required.

```bash
npm install
npm run studio
```

Open http://localhost:3000 — pick modules, reorder, edit copy, preview, save campaigns, **Copy HTML** for D365.

Features: module thumbnails, hover previews, inline editing, campaign status (draft/ready/sent), unsaved indicator, keyboard shortcuts (`Ctrl+S`, `Ctrl+Shift+C`), dark mode, and coordinator-friendly editor mode.

Deploy to Render, Railway, or Docker. See **[docs/studio-deploy.md](docs/studio-deploy.md)**.

## Weekly workflow

1. Edit campaign copy in `campaigns/<folder>/source.html` (or `blocks/` within that folder)
2. `npm run build` → creates `email.html`
3. `npm run preview` → check desktop layout in browser
4. Copy `email.html` → D365 **Design → HTML** → paste
5. D365 **Preview and Test** → final mobile + font check
6. Schedule in Customer Journey

See **[docs/workflow.md](docs/workflow.md)** for the full guide.

## Dynamics rendering guidelines

Before creating or changing modules, read
**[docs/D365_EMAIL_GUIDELINES.md](docs/D365_EMAIL_GUIDELINES.md)**. It records
the table, button, responsive, header/footer, and export patterns verified in
real Dynamics 365 test sends.

Run the regression audit and full build before copying HTML:

```bash
npm test
npm run build
```

## Module library (58 modules)

Pick-and-choose polished sections for long emails — headers, heroes, features, events, CTAs, and more.

```bash
npm run preview -- catalog      # browse all 32 modules
npm run preview -- long-form    # example long email
```

See **[docs/modules.md](docs/modules.md)** for the full catalog and composition recipes.

## Structure

```
brand/              Colors, fonts, tokens from HQ
components/
  _base/            D365 head, styles, layout wrapper
  modules/          58 polished pick-and-choose sections
  blocks/           Legacy sections (prefer modules for new work)
templates/          Starting points (promo, long-form, catalog)
campaigns/          One folder per send
  YYYY-MM-slug/
    source.html     Edit this — @include modules you need
    email.html      Paste this into D365 (generated)
    notes.md        Campaign checklist
scripts/
  build.js          Assembles source → email.html
  preview.js        Local preview with auto-rebuild
```

## Current campaign

**Sales Ignitor — RockStar® SNAP IN:** `campaigns/2026-07-sales-ignitor-rockstar/`
