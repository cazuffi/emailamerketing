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

- **Max width:** 640px (fluid below that on mobile)
- **Section padding:** 10px desktop, 16px mobile
- **Buttons:** square corners (`border-radius: 0`), min 44px tap target on mobile
- **Dividers:** 2px solid `#ef7800`

### Responsive (desktop + mobile)

All D365 blocks and templates are optimized for both viewports:

| Technique | Purpose |
|-----------|---------|
| `width="640"` + `max-width: 100%` | Fluid email width on mobile |
| `stack-column` | Multi-column sections stack vertically |
| `mobile-padding` | Reduced side padding on small screens |
| `mobile-text-left` | Right-aligned header tagline flips left on mobile |
| `mobile-center` | Centers logos/images when stacked |
| `@media (max-width: 640px)` | Typography, buttons, images scale for mobile |
| Touch targets | Buttons expand to full-width, min 44px height |

Test every template at **640px**, **375px** (iPhone), and **desktop** before publishing to D365. Use D365 **Preview and Test** with mobile preview.

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
| `wm-feature-block-right.html` | `WM_feature_block_right` | 40/60 image + text |
| `wm-two-up-cards.html` | `WM_two_up_cards` | 50/50 product cards |
| `wm-event-details.html` | `WM_event_details` | Date, time, location, agenda |
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

## Do / don't (brand guardrails)

| Do | Don't |
|----|-------|
| Use `#ef7800` for H2, links, buttons, dividers | Use rounded buttons (`border-radius` must be 0) |
| Use ARIALN / ARIALNB from D365 CDN | Add custom web fonts or non-brand typefaces |
| Keep emails at 640px max width | Stretch layouts or use off-brand background colors |
| End every email with `WM_footer` | Remove `{{CompanyAddress}}` or `{{PreferenceCenter}}` |
| Run `npm run validate:d365` before publishing | Paste unvalidated HTML into D365 |

See **[d365-team-cheatsheet.md](d365-team-cheatsheet.md)** for marketer-facing quick reference.
