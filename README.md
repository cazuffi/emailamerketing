# Email Marketing Planner

A file-based workspace for creating, drafting, and iterating on marketing emails. Templates live in git, you preview locally, and export HTML when ready to send via your ESP (Mailchimp, SendGrid, Klaviyo, etc.).

## Quick start

```bash
npm install
npm run new-draft -- summer-sale promo   # create a draft from a template
npm run preview -- summer-sale           # live preview in browser
npm run build                            # compile all MJML to HTML in dist/
```

## Folder structure

```
templates/     Reusable starting points (newsletter, promo, welcome)
drafts/        Work-in-progress campaigns (one folder per email)
campaigns/     Finalized / sent emails (archive)
components/    Shared MJML partials (header, footer, CTA)
assets/brand/  Brand colors and reference values
scripts/       Build, preview, and scaffolding tools
dist/          Compiled HTML output (generated, not committed)
```

## Workflow

1. **Create a draft** from a template:
   ```bash
   npm run new-draft -- <slug> [template]
   ```
   Templates: `newsletter` (default), `promo`, `welcome`

2. **Edit** `drafts/<folder>/email.mjml` plus `subject-lines.md` and `notes.md`

3. **Preview** with live reload:
   ```bash
   npm run preview -- <draft-folder-or-path>
   ```

4. **Commit often** — git tracks every iteration

5. **Finalize** — move the folder to `campaigns/` when sent, then build:
   ```bash
   npm run build
   ```
   Copy HTML from `dist/` into your email provider

## Templates

| Template    | Path                                      | Use case                    |
|-------------|-------------------------------------------|-----------------------------|
| newsletter  | `templates/newsletter/weekly-update.mjml` | Regular content updates     |
| promo       | `templates/promo/product-launch.mjml`     | Sales, launches, offers     |
| welcome     | `templates/transactional/welcome.mjml`    | Onboarding, welcome series  |

## Customizing brand

Edit shared components in `components/` (header, footer, CTA button). Brand reference values are in `assets/brand/colors.json`.

Use `{{placeholder}}` syntax in MJML for merge tags your ESP will replace (e.g. `{{first_name}}`, `{{unsubscribe_url}}`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run new-draft -- <slug> [template]` | Scaffold a new draft folder |
| `npm run preview -- [path]` | Browser preview with auto-reload |
| `npm run build` | Compile all `.mjml` files to `dist/` |

## Tips

- Keep one folder per email campaign under `drafts/`
- Use `subject-lines.md` to track A/B subject options
- Use `notes.md` for audience, goals, feedback, and send date
- MJML handles responsive email layout — avoid hand-writing HTML
