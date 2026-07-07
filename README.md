# Email Marketing Planner

A file-based workspace for creating, drafting, and iterating on marketing emails. Templates live in git, you preview locally, and export HTML to **Dynamics 365 Customer Insights — Journeys** for scheduling and sending.

## Quick start

```bash
npm install
npm run new-draft -- summer-sale promo   # create a draft from a template
npm run preview -- summer-sale           # live preview in browser
npm run build                            # compile all MJML to HTML in dist/
```

Then paste the built HTML into D365 (**Design → HTML** tab). See [docs/dynamics-365.md](docs/dynamics-365.md) for the full D365 workflow.

## Folder structure

```
templates/     Reusable starting points (newsletter, promo, welcome)
drafts/        Work-in-progress campaigns (one folder per email)
campaigns/     Finalized / sent emails (archive)
components/    Shared MJML partials (header, footer, CTA)
assets/brand/  Brand colors and reference values
docs/          Dynamics 365 import and scheduling guide
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

5. **Build and import to Dynamics 365**:
   ```bash
   npm run build
   ```
   Copy HTML from `dist/drafts/<folder>/email.html` into a D365 marketing email

6. **Schedule in D365** — add to a Customer Journey, assign Content Settings, go live

7. **Archive** — move the folder to `campaigns/` after send

## Dynamics 365

All emails are sent through **Dynamics 365 Customer Insights — Journeys**. The repo handles design and iteration; D365 handles audience, personalization at scale, compliance checks, and scheduling.

Key D365 tokens (already in footer component):

| Token | Purpose |
|-------|---------|
| `{{contact.firstname}}` | Recipient first name |
| `{{msdyncrm_contentsettings.msdyncrm_addressmain}}` | Required physical address |
| `{{msdyncrm_contentsettings.msdyncrm_subscriptioncenter}}` | Required unsubscribe link |

Full guide: **[docs/dynamics-365.md](docs/dynamics-365.md)**

## Templates

| Template    | Path                                      | Use case                    |
|-------------|-------------------------------------------|-----------------------------|
| newsletter  | `templates/newsletter/weekly-update.mjml` | Regular content updates     |
| promo       | `templates/promo/product-launch.mjml`     | Sales, launches, offers     |
| welcome     | `templates/transactional/welcome.mjml`    | Onboarding, welcome series  |

## Customizing brand

Edit shared components in `components/` (header, footer, CTA button). Brand reference values are in `assets/brand/colors.json`.

- **D365 tokens** (e.g. `{{contact.firstname}}`) — keep as-is; resolved at send time
- **Draft placeholders** (e.g. `{{headline}}`) — replace with final copy before importing to D365

## Scripts

| Command | Description |
|---------|-------------|
| `npm run new-draft -- <slug> [template]` | Scaffold a new draft folder |
| `npm run preview -- [path]` | Browser preview with auto-reload |
| `npm run build` | Compile all `.mjml` files to `dist/` |

## Tips

- Keep one folder per email campaign under `drafts/`
- Use `subject-lines.md` to track subject/preheader options (copy into D365 email header)
- Use `notes.md` for audience, journey name, Content Settings, and send date
- Run D365 **Check content** after import — address and subscription center are required
- MJML handles responsive email layout — avoid hand-writing HTML
