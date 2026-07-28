# Dynamics 365 Email Module Guidelines

These rules are based on HTML that has been copied from Email Marketing Studio,
pasted directly into Dynamics 365 Customer Insights Journeys, and verified with
real test sends. A browser preview is useful, but a Dynamics test send is the
rendering authority.

## Core principles

1. Build email layout with presentation tables.
2. Put critical dimensions, alignment, color, and spacing in HTML attributes
   and inline styles.
3. Treat media queries as enhancements. The desktop fallback must remain usable
   when a client scales it instead of stacking it.
4. Use Dynamics designer classes only when Dynamics should edit the columns.
5. Paste Studio output directly into Dynamics. Do not pass it through another
   HTML editor.

## Dynamics layout metadata

Use these hooks only for genuine editable multi-column modules:

- `columns-equal-class` on the section
- `containerWrapper tbContainer multi` on the column table
- `columnContainer` on each direct column
- `data-container="true"`
- `data-container-width="50.00"` (always two decimal places)

Do not use those hooks for presentation-only structures such as headers,
footers, nested button tables, or data tables. Dynamics can reinterpret their
widths during the send transform.

The canonical header therefore uses neutral classes:

- `header-layout-table`
- `header-logo-column`
- `header-tagline-column`

The orange footer is also a plain single-column presentation table.

## Responsive behavior

- **Mobile-first in source HTML.** Critical multi-column modules (`three-up-benefits`,
  `cta-dual`) must stack with `display:block;width:100%;max-width:100%` inline.
  Gmail mobile often ignores `@media` queries, so never rely on
  `display:inline-block` in source for stacking.
- **`three-up-benefits` ships one stacked table only.** Do not duplicate a second
  desktop table in the HTML — Gmail renders both copies when `display:none` or MSO
  conditionals fail.
- Use `@media (min-width: 481px)` as a desktop enhancement to restore
  side-by-side columns. Outlook desktop still uses MSO ghost tables.
- Use a desktop layout that remains readable if mobile stacking is ignored.
- Stack table columns with `stack-column` and `display:block !important` in CSS.
- Set both `width:100% !important` and `max-width:100% !important` when stacking.
- Reset desktop left and right gutters on stacked columns and their inner cells.
- Center the wrapper, text block, paragraph, and image independently when all
  must center on mobile.
- Check the 641px desktop preview, 375px mobile preview, **No media CSS** preview,
  then send a Dynamics test email.

## Gmail and Apple Mail

- Export ships `<meta name="color-scheme" content="light only">` to discourage
  Gmail dark mode from inverting white backgrounds to black.
- `client-compat.css` includes `[data-ogsc]` / `[data-ogsb]` overrides to lock
  white content areas and the orange footer when dark mode is active.
- The header logo sits inside a `.header-logo-safe` white wrapper so transparent
  PNG logos do not pick up a dark-mode color fill.
- Footer addresses and phone numbers use `format-detection` meta plus CSS resets
  for `a[x-apple-data-detectors]` and Gmail auto-links.
- Yellow search highlights on brand names in Gmail are client-side (user searched
  the inbox) and cannot be prevented in HTML.

## What Dynamics does on send (verified from real Gmail source)

When you paste exported HTML into a Dynamics content editor and **send**, Dynamics
reprocesses the markup again. This send transform is **not** the same as the
editor/paste view. Confirmed transformations:

- **Adds `columns-equal-class` to every section** — even modules that did not
  ship with it. This is editor metadata, not a send bug.
- **Wraps every `data-editorblocktype` block in an anonymous flex div** — no
  `data-container` attribute. Typical send output:

  ```html
  <div style="width:592px;flex:0 0 592px;display:flex;flex-direction:column">
    <div align="center">…editor block…</div>
  </div>
  ```

  Inside multi-column modules, narrower widths appear (for example `181px` inside
  `.stat-stack`, `272px` / `280px` inside `.image-split-stack`). These fixed flex
  shells left-align content in Gmail unless overridden.
- **Sets section `table.outer` to `display:block; width:640px`** — breaks browser
  width alignment unless `.outer { display:table !important }` is present.
- **Flattens `data-editorblocktype="Button"` blocks** into a bare `<a>`, deleting
  the surrounding bulletproof table (and the `<td>` fill Outlook desktop needs).
  The export step now strips this attribute so the table survives. Never rely on
  the `Button` block type to preserve markup.
- **Mangles the inline `background:` shorthand** into `background-image:initial…`
  and drops the color. Always use the `background-color` longhand inline. The
  export normalizes this automatically and the audit fails on regressions.
- **Preserves** the `<style>` block, `background-color` longhand, `bgcolor`
  attributes, plain links (with tracking added), MSO conditional comments/ghost
  tables, and normal tables (comparison, divider, footer).
- Normalizes image `max-width` to 100%. The export ships `d365-send-compat.css`
  to override send transforms (canvas centering, flex-shell neutralization,
  footer centering, multi-column layout, header width).
- **Multiple `...` expanders in Gmail** — one inside a module and one for the
  rest of the email usually means (1) Dynamics split the module into separate
  `data-editorblocktype` blocks that Gmail collapses, and/or (2) the HTML still
  exceeds the ~102 KB clip limit. `accent-band` ships headline + body in one
  Text block to avoid the in-module expander.

**Editor vs send:** In the designer you may still see `data-container="true"`.
That metadata is for editable columns. On send, Gmail receives the anonymous flex
wrappers above. Gmail compat CSS must target **send output**, not editor metadata.

## Send transform / flex shells

This section documents the main lesson from Gmail debugging (v39): CSS that targets
`[data-container="true"]` does not fix most send-time layout bugs because Dynamics
does not send that attribute on flex wrappers.

### What to target instead

| Layer | Purpose | Example selector |
|-------|---------|-------------------|
| Column stack | Side-by-side desktop layout | `.stats-three-section .stat-stack { display:inline-block; width:197px }` |
| Flex shell child | Neutralize Dynamics send wrapper | `.stat-stack > div { display:block; width:100%; flex:none }` |
| Gmail desktop | Override Gmail’s injected `<u>` wrapper | `u + .body .stat-stack { display:inline-block; width:197px }` |
| Gmail mobile | Stack columns | `@media (max-width:640px) { .stat-stack { display:block; width:100% } }` |

Do **not** rely on `@media (min-width:641px)` as the only way to restore desktop
columns. Gmail desktop often ignores min-width queries. Put side-by-side layout in
**base CSS**; use max-width media queries mainly for stacking.

### Standard pattern for multi-column modules

Use this hybrid layout for stats, benefits, products, icon grids, image+text splits,
text links, and similar modules:

1. Section root: `.{module-id}-section` (for example `.stats-three-section`)
2. Layout cell: `.{module}-layout-cell` with `font-size:0` for inline-block columns
3. Column stack: semantic class such as `.stat-stack`, `.benefit-stack`,
   `.product-stack`, `.image-split-stack`
4. MSO ghost table: `<!--[if mso]><table>…<!--[endif]-->` for Outlook desktop
5. Base CSS: `.stack { display:inline-block; width:197px }` (not min-width-only)
6. Flex neutralizer: `.stack > div { display:block; width:100%; flex:none }`
7. Gmail desktop: matching `u + .body .stack` and `u + .body .stack > div` rules
8. Gmail mobile: stack `.stack` to `display:block; width:100%`

Canonical examples: `stats-three`, `stats-four`, `three-up-benefits`,
`three-up-products`, `image-split-text-right`, `cta-text-link`.

### Modules that keep editable columns

Most modules must **not** ship `data-container="true"`. Only these intentionally
keep the Dynamics editable-column pattern because the fluid pattern breaks their
send layout:

- `comparison-split`
- `cta-band-grey`

`npm test` rejects `data-container="true"` on all other modules.

### Class naming rules

- Add `.{module-id}-section` on every section wrapper — enables scoped CSS and
  better CSS pruning per campaign.
- Use semantic stack names (`.stat-stack`, `.benefit-stack`) — hardening and Gmail
  overrides key off these classes.
- Do not reuse `.three-up-cell` on stat columns — mobile CSS for `.three-up-cell`
  can fight 3-across desktop layout.

### Testing send output locally

`scripts/simulate-dynamics-paste.js` approximates the **send** transform (flex
wrappers around `[data-editorblocktype]` blocks). `npm test` runs exports through
this simulator and enforces the Gmail ~102 KB clip limit after simulation.

When debugging Gmail issues:

1. Send a Dynamics test email.
2. In Gmail: **Show original** and copy the HTML part.
3. Compare against simulator output and add a regression assertion in
   `scripts/audit-email.js` for every bug fixed.

Browser preview and paste view alone are not sufficient.

## Verify you pasted the latest export

The first line of Copy HTML must include the build marker comment. The current
marker is defined in `scripts/harden-email.js` (`BUILD_MARKER`). As of v39 it
looks like:

```html
<!-- email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v39 -->
```

If that comment is missing or the version is older than your repo, you are not
testing the current build. Run `git pull`, `npm test`, `npm run build`, rebuild
in Studio, and Copy HTML again. Do not reuse a saved Dynamics email or an old
Studio build file. Replace the **entire** HTML in D365 — partial paste leaves
stale CSS behind.

## Gmail HTML size (clipping)

Gmail truncates emails when the HTML exceeds **~102 KB** and shows **"View entire
message"** (often a `...` control). The export **prunes CSS to modules in your
campaign** so typical emails stay under the limit. Pruning is section-aware:
selectors like `.stats-three-section .stat-stack` are removed when that module is
not in the email. If you stack many modules (20+), check size in Studio or run
`npm test` — the audit fails when a standard fixture exceeds the clip threshold
**after send simulation**.

## Gmail horizontal alignment

Gmail often ignores `margin: auto` on block-level layout divs. After send,
Dynamics nests content inside fixed-width flex shells that default to left
alignment.

The export centers the canvas with `body { text-align: center }` plus
`div[data-layout] { display: inline-block }`, forces `table.outer` back to
`display: table`, collapses Gmail gaps between stacked section tables
(`line-height: 0` on section wrappers), and neutralizes send-time flex shells via
`.stack > div` and `u + .body .stack > div` rules in `d365-send-compat.css`.
Footers use nested centering tables so Gmail mobile respects `align="center"`
even when Dynamics injects 576px flex containers.

## Buttons

- Use a table cell for the background and border; put the fill (`bgcolor` +
  `background-color`) and `mso-padding-alt` on the `<td class="buttonCell">`.
- Never use the `background:` shorthand on the anchor — only `background-color`.
- The export strips `data-editorblocktype="Button"` so Dynamics keeps the table.
- Keep the anchor visible without MSO conditional wrappers; Dynamics may strip
  the comments and leave only a label.
- In the MSO block the anchor is forced `display:inline` so a block anchor cannot
  cover the td fill (Word does not paint block-anchor backgrounds).
- Use `button-primary` or `button-outline-link` consistently.
- Allow labels to wrap with `white-space:normal`.
- Avoid `width:100%` plus horizontal padding on an anchor. Outlook can calculate
  that as wider than its cell because it ignores `box-sizing`.
- For side-by-side buttons, use equal column widths, borders, padding, and
  mobile gutter resets.
- For a constrained CTA, cap the button table and use `width:auto` on the
  block-level anchor.

## Header

Desktop:

- 50/50 plain presentation cells
- logo aligned left
- tagline aligned right and vertically middle

Mobile:

- both cells become full-width blocks
- logo centers first
- tagline centers below it with a small gap

Do not add Dynamics column-container metadata to the header.

## Footer

- Keep the orange footer a single-column section.
- Do not use `columns-equal-class` or `tbContainer`.
- Center with layered fallbacks: table `align="center"`, cell `align="center"`,
  inline `text-align:center`, CSS, and an HTML `<center>` wrapper where needed.
- Account for section padding in the desktop inner-table width. At a 640px
  layout with 32px side padding, the centered content table is 576px.

## Images and typography

- Give images an `alt` attribute.
- Use an HTML `width` plus a matching inline pixel width for fixed assets.
- Reserve `width:100%` for genuinely fluid images.
- Keep the logo at its intended display width; do not upscale it on mobile.
- Always provide Arial/Helvetica/sans-serif fallbacks for custom fonts.
- Keep Outlook typography fallbacks in the MSO-only head block.

## Export pipeline

Send Preview, Copy HTML, and CLI builds must all run through the same hardening
and sanitization path. Exported HTML must:

- contain no `data-studio-*` metadata
- contain no hidden editor-only elements
- normalize button classes and critical inline styles
- preserve required MSO head blocks
- avoid non-MSO button wrappers that Dynamics can strip

## Acceptance checklist

Before considering a new module complete:

1. Run `npm test`.
2. Run `npm run build`.
3. Check Desktop Send preview.
4. Check Mobile Send preview.
5. In Send preview, enable **No media CSS** at both widths.
6. Confirm the fallback remains readable, contained, and free of horizontal
   scrolling. This simulates Dynamics or an email client ignoring responsive
   media queries; it does not change copied/exported HTML.
7. Copy HTML directly into a fresh Dynamics email (full replace).
8. Send tests to Outlook and Gmail.
9. Confirm the layout remains usable when stacking does not activate.
10. For Gmail fixes, inspect **Show original** HTML from a real send.
11. Add a regression assertion in `scripts/audit-email.js` for every rendering
    bug fixed (include `u + .body` rules when flex shells are involved).

`npm test` also builds all modules with media queries removed and rejects known
source-level overflow patterns such as a padded button anchor with inline
`width:100%`.

## Canonical examples

- Header: `components/modules/header-standard.html`
- Equal dual CTA: `components/modules/cta-dual.html`
- Constrained CTA band: `components/modules/cta-band-grey.html`
- Multi-column (hybrid layout): `components/modules/stats-three.html`,
  `components/modules/three-up-benefits.html`, `components/modules/cta-text-link.html`
- Footer: `components/blocks/footer.html`
- Gmail send compat CSS: `components/_base/d365-send-compat.css`
- Send simulation: `scripts/simulate-dynamics-paste.js`
- Export safeguards: `scripts/harden-email.js`
- Regression checks: `scripts/audit-email.js`
