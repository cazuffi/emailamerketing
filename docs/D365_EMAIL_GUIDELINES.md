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

- Use a desktop layout that remains readable if mobile stacking is ignored.
- Stack columns with targeted classes and `display:block !important`.
- Set both `width:100% !important` and `max-width:100% !important` when stacking.
- Reset desktop left and right gutters on stacked columns and their inner cells.
- Center the wrapper, text block, paragraph, and image independently when all
  must center on mobile.
- Check the 641px desktop preview and 375px mobile preview, then send a Dynamics
  test email.

## What Dynamics does to pasted HTML (verified from a real send)

When you paste the exported HTML into a Dynamics content editor and send, Dynamics
reprocesses it. Confirmed transformations:

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
- Wraps every block in a fixed-pixel-width flex `data-container` div; adds
  `columns-equal-class` and `display:block` to sections; normalizes image
  `max-width` to 100%. These are non-destructive — the mobile CSS forces
  `[data-container]` wrappers fluid so they cannot overflow.

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
7. Copy HTML directly into a fresh Dynamics email.
8. Send tests to Outlook and Gmail.
9. Confirm the layout remains usable when stacking does not activate.
10. Add a regression assertion for every new rendering bug fixed.

`npm test` also builds all modules with media queries removed and rejects known
source-level overflow patterns such as a padded button anchor with inline
`width:100%`.

## Canonical examples

- Header: `components/modules/header-standard.html`
- Equal dual CTA: `components/modules/cta-dual.html`
- Constrained CTA band: `components/modules/cta-band-grey.html`
- Footer: `components/blocks/footer.html`
- Export safeguards: `scripts/harden-email.js`
- Regression checks: `scripts/audit-email.js`
