# Brand Guidelines (Email)

USA emails based on Weidmüller HQ Dynamics 365 template. Tokens live in `brand/tokens.json`.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary orange | `#ef7800` | H2, links, buttons, dividers, accent bands |
| Text | `#000000` | Headlines, body |
| Content background | `#ffffff` | Email card |
| Canvas | `#f4f4f4` | Outer background |

## Typography

| Style | Font | Size |
|-------|------|------|
| H1 | ARIALNB | 22px |
| H2 | ARIALN | 20px, orange |
| H3 | ARIALNB | 14px |
| Body | ARIALN | 12px |
| Buttons | ARIALNB | 14px, white on orange |

## Layout

- Max width: 640px
- Buttons: square corners (`border-radius: 0`)
- Test at 640px, 375px, and desktop before send

## USA flexibility

Match HQ fonts and orange. Layout and spacing can be polished beyond HQ — do not use non-brand colors or rounded buttons.

## Required footer

Every email ends with `components/blocks/footer.html`:
- `{{CompanyAddress}}`
- `{{PreferenceCenter}}`
