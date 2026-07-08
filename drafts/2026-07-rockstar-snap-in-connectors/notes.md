# Campaign notes

- **Campaign:** USA_Sales Ignitor_RockStar® Heavy Duty Connectors with SNAP IN technology
- **Audience / segment:** USA industrial customers — machine builders, panel shops, OEMs
- **Goal:** Drive awareness and demo/sample requests for RockStar® SNAP IN connectors
- **Send date:**
- **Platform:** Dynamics 365 Customer Insights — Journeys
- **Customer Journey:**
- **Content Settings:**

## Key messages

- SNAP IN technology — up to 60% faster installation
- Heavy duty reliability — IP65/IP69K, vibration resistant
- Modular design — power, signal, and data in one connector
- Tool-free assembly reduces labor cost and rework

## Assets to update before send

- [ ] Replace hero image in D365 designer with RockStar® product shot
- [ ] Replace feature block image with SNAP IN connector close-up
- [ ] Confirm CTA links (currently placeholder: weidmuller.com)
- [ ] Verify product page URL for tracking

## Build for D365 (use this, not MJML)

The MJML draft (`email.mjml`) is for quick prototyping only — it renders poorly when pasted into D365.

**For D365 paste, always build the native HTML:**

```bash
npm run build
```

Then paste `drafts/2026-07-rockstar-snap-in-connectors/email.html` (built from `email.d365.html`).

Edit campaign copy in `blocks/*.html` or `email.d365.html`, then rebuild.

## D365 checklist

- [ ] HTML imported (Design → HTML tab)
- [ ] Check content passes
- [ ] Preview and Test with sample contacts (desktop + mobile)
- [ ] Subject + preheader set in D365 (see subject-lines.md)
- [ ] Journey live with correct Content Settings

## Feedback / iterations

- 
