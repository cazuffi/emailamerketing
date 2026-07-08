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

## Weekly workflow

1. Edit campaign copy in `campaigns/<folder>/source.html` (or `blocks/` within that folder)
2. `npm run build` → creates `email.html`
3. `npm run preview` → check desktop layout in browser
4. Copy `email.html` → D365 **Design → HTML** → paste
5. D365 **Preview and Test** → final mobile + font check
6. Schedule in Customer Journey

See **[docs/workflow.md](docs/workflow.md)** for the full guide.

## Structure

```
brand/              Colors, fonts, tokens from HQ
components/
  _base/            D365 head, styles, layout wrapper
  blocks/           Reusable sections (header, hero, body, footer…)
templates/          Starting points for new campaigns
campaigns/          One folder per send
  YYYY-MM-slug/
    source.html     Edit this
    email.html      Paste this into D365 (generated)
    notes.md        Campaign checklist
scripts/
  build.js          Assembles source → email.html
  preview.js        Local preview with auto-rebuild
```

## Current campaign

**Sales Ignitor — RockStar® SNAP IN:** `campaigns/2026-07-sales-ignitor-rockstar/`
