# D365 Components

**Source of truth** for Dynamics 365 content blocks and email templates.

## Edit here

- `blocks/*.html` — individual draggable content blocks
- `_base/styles.css` — brand fonts and CSS
- `_base/head.html` — D365 designer meta tags

## Build

```bash
npm run build:d365
```

Outputs:
- `dist/d365/blocks/` — paste into D365 content block library
- `dist/d365/templates/` — paste into new D365 emails, save as template
- `components/d365-wrapped/` — auto-generated for MJML dev drafts

## Do not edit

- `dist/d365/` — generated output
- `components/d365-wrapped/` — generated MJML wrappers

See **[docs/d365-publish-guide.md](../docs/d365-publish-guide.md)** for publishing to your team.
