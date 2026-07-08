# D365 Team Cheat Sheet

Quick reference for building emails in **Customer Insights — Journeys** (Insight Hub) using the Weidmüller component library.

## Start here: pick a template

| Campaign type | D365 template | When to use |
|---------------|---------------|-------------|
| Event / trade show / webinar | `WM_event` | Invitations with date, time, location, agenda |
| Promo / product launch | `WM_promo` | Hero image, feature block, accent CTA |
| Newsletter / content update | `WM_newsletter` | Multiple body sections, single CTA |
| Welcome / onboarding | `WM_welcome` | Stepped intro sections for new contacts |

**New email → From template → select `WM_*` → edit in designer.**

## Or build from blocks

Drag blocks from **Marketing templates → Content blocks**. Always end with `WM_footer`.

### Recommended block order by campaign

**Event invitation**
1. `WM_header` — set label (e.g. "Invitation") and event name in tagline
2. `WM_hero` — event or product banner image
3. `WM_intro` — headline + orange subheadline
4. `WM_body` — greeting and main message
5. `WM_event_details` — date, time, location, agenda
6. `WM_cta_button` — register / RSVP link
7. `WM_footer` — required (do not remove)

**Product launch / promo**
1. `WM_header`
2. `WM_hero`
3. `WM_intro`
4. `WM_body`
5. `WM_cta_button`
6. `WM_accent_band` — highlight offer or deadline
7. `WM_feature_block_left` or `WM_feature_block_right` — product detail
8. `WM_two_up_cards` — compare two products or benefits
9. `WM_footer`

**Newsletter**
1. `WM_header`
2. `WM_intro`
3. `WM_body` (repeat with `WM_divider` between sections)
4. `WM_cta_button`
5. `WM_footer`

## Block catalog

| D365 name | Purpose |
|-----------|---------|
| `WM_header` | Logo + tagline with orange pipe |
| `WM_hero` | Full-width banner image |
| `WM_intro` | H1 headline + H2 subheadline |
| `WM_body` | Greeting (`{{FirstName}}`) + body copy |
| `WM_cta_button` | Orange primary button |
| `WM_accent_band` | Orange highlight strip |
| `WM_feature_block_left` | Text left, image right (60/40) |
| `WM_feature_block_right` | Image left, text right (40/60) |
| `WM_two_up_cards` | Side-by-side product cards (50/50) |
| `WM_event_details` | Date, time, location, agenda |
| `WM_divider` | 2px orange rule |
| `WM_footer` | USA address + compliance (required) |

## Brand rules (do / don't)

| Do | Don't |
|----|-------|
| Use orange `#ef7800` for H2, links, buttons | Use rounded buttons or non-brand colors |
| Use Arial Narrow fonts (loaded from D365 CDN) | Add custom web fonts |
| Keep max width 640px | Stretch layout beyond brand width |
| End every email with `WM_footer` | Remove `{{CompanyAddress}}` or `{{PreferenceCenter}}` |
| Test at desktop + mobile in Preview and Test | Skip Check content before go-live |

## Before you send

- [ ] Replaced all placeholder copy and images
- [ ] CTA links point to correct URLs (with tracking if needed)
- [ ] **Check content** passes in D365
- [ ] **Preview and Test** at 640px and phone width
- [ ] Subject line and preheader set on email record
- [ ] Customer Journey has correct **Content Settings**
- [ ] `WM_footer` is the last block

## Dev handoff (when marketing needs a custom layout)

1. Dev creates draft: `npm run new-draft -- campaign-name event`
2. Dev builds: `npm run build`
3. Paste `dist/drafts/<campaign>/email.html` into D365 **Design → HTML**
4. Switch to designer tab to edit text and images

## Updating blocks after repo changes

When the dev team updates a block in the repo:

1. They run `npm run build:d365`
2. Open the existing content block in D365
3. Replace HTML from `dist/d365/blocks/<block>.html`
4. Save and go live

See **[d365-publish-guide.md](d365-publish-guide.md)** for full publish steps.
