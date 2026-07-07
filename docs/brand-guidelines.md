# Weidmüller Brand Guidelines (Email)

Extracted from the corporate HQ Dynamics 365 email template. Reference values live in `assets/brand/colors.json` and `assets/brand/typography.json`.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary orange | `#ef7800` | H2, links, buttons, dividers, accent bands, pipe separator |
| Text | `#000000` | Headlines, body copy |
| Content background | `#ffffff` | Email card |
| Outer background | `#f4f4f4` | Surrounding canvas |
| Button text | `#ffffff` | On orange buttons |
| Accent band text | `#ffffff` | On orange sections |

## Typography

Corporate HQ uses **Arial Narrow** variants hosted in Dynamics 365:

| Style | Font | Size | Color |
|-------|------|------|-------|
| H1 | ARIALNB | 22px | Black |
| H2 | ARIALN | 20px | Orange |
| H3 | ARIALNB | 14px | Black |
| Body | ARIALN | 12px | Black |
| Links | ARIALN | 14px | Orange, underline |
| Buttons | ARIALNB | 14px | White on orange |
| Header tagline | ARIALN | 15px | Black with orange `\|` separator |

Fallback stack: `Arial, Verdana, sans-serif`

Font files are loaded via `@font-face` in `components/brand-head.mjml` from your D365 tenant CDN.

## Layout

- **Max width:** 640px
- **Section padding:** 10px
- **Buttons:** square corners (`border-radius: 0`), padding `10px 20px`
- **Dividers:** 2px solid `#ef7800`

### Common layout patterns

| Pattern | Columns | Use case |
|---------|---------|----------|
| Header | 50 / 50 | Logo left, tagline right |
| Hero | 100% | Full-width banner image |
| Intro | 100% | H1 + H2 subheadline |
| Feature block | 60 / 40 | Text + image |
| Two-up cards | 50 / 50 | Side-by-side products |
| Accent band | 100% | Orange CTA strip |

## Components

D365-native blocks live in `components/d365/blocks/`. Each file uses `data-editorblocktype` for designer editability.

| File | D365 name | Purpose |
|------|-----------|---------|
| `wm-header.html` | `WM_header` | Logo + tagline (50/50) |
| `wm-hero.html` | `WM_hero` | Full-width banner |
| `wm-intro.html` | `WM_intro` | H1 + H2 subheadline |
| `wm-body.html` | `WM_body` | Greeting + body copy |
| `wm-cta-button.html` | `WM_cta_button` | Orange square button |
| `wm-accent-band.html` | `WM_accent_band` | Orange highlight strip |
| `wm-feature-block-left.html` | `WM_feature_block_left` | 60/40 text + image |
| `wm-divider.html` | `WM_divider` | 2px orange rule |
| `wm-footer.html` | `WM_footer` | Address band + compliance (required) |

Publish to D365: **[docs/d365-publish-guide.md](d365-publish-guide.md)**

## Personalization (HQ convention)

Corporate templates use D365 dynamic text **labels**:

- `{{FirstName}}`
- `{{LastName}}`

Compliance tokens (required, in corporate footer):

- `{{CompanyAddress}}`
- `{{PreferenceCenter}}`

Legacy content-settings tokens (older templates):

- `{{msdyncrm_contentsettings.msdyncrm_addressmain}}`
- `{{msdyncrm_contentsettings.msdyncrm_subscriptioncenter}}`

## Draft placeholders

When drafting, replace these before importing to D365:

- `{{email_label}}` — e.g. "Invitation", "Newsletter"
- `{{email_tagline}}` — e.g. "Husum Wind 2025"
- `{{headline}}`, `{{body_copy}}`, `{{cta_text}}`, etc.

## Assets

Logo and fonts are referenced from your D365 tenant (`assets-eur.mkt.dynamics.com`). Update URLs in `assets/brand/colors.json` if assets move.
