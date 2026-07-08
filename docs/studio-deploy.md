# Email Studio — hosted team app

Visual email composer for you and your coordinator. Pick modules, reorder, preview, save campaigns, copy HTML into D365.

## Local development

```bash
npm install
npm run studio
```

Open http://localhost:3000

Default login (first run only):
- Email: `admin@weidmuller.local`
- Password: `changeme`

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first run in production.

## Add your coordinator

1. Sign in as admin
2. Click **Team** in the top bar
3. Enter name, email, and a temporary password
4. Share the hosted URL and credentials with your coordinator

Coordinators can create emails, save campaigns, and copy HTML — but cannot add users.

## Deploy (Option C — hosted)

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | Long random string (e.g. `openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Yes | Your admin login email |
| `ADMIN_PASSWORD` | Yes | Your admin password (8+ chars) |
| `ADMIN_NAME` | No | Display name (default: Admin) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | Yes | Set to `production` when hosted |
| `DATA_DIR` | No | SQLite storage path (default: `studio/data`) |

### Docker

```bash
docker build -t email-studio .
docker run -p 3000:3000 \
  -e SESSION_SECRET=your-secret \
  -e ADMIN_EMAIL=you@company.com \
  -e ADMIN_PASSWORD=your-secure-password \
  -e NODE_ENV=production \
  -v studio-data:/data \
  -e DATA_DIR=/data \
  email-studio
```

### Render / Railway / Fly.io

1. Connect this GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm run studio`
4. Add environment variables from table above
5. Add a persistent volume mounted at `/data` with `DATA_DIR=/data`

The app serves the UI and API from a single Node process — no separate frontend build step.

## Workflow for your coordinator

1. Sign in at the hosted URL
2. Browse modules in the left panel — thumbnails load as you scroll; hover for a larger preview, click **+** to add
3. Click **✎** or a module row to open the **Edit** tab
4. Change headlines, paragraphs, image URLs (with live preview), button labels, and links
5. Reorder with drag-and-drop or ▲▼ buttons
6. Check **Preview** tab (desktop / mobile toggle)
7. Set status to **Draft**, **Ready**, or **Sent** — progress bar tracks Compose → Edit → Preview → Export
8. **Save** to store the campaign (orange dot shows unsaved changes)
9. **Copy HTML** → paste into D365 → Design → HTML
10. Optional touch-ups in D365 Designer, then **Preview and Test** before send

**Keyboard shortcuts:** `Ctrl+S` save · `Ctrl+Shift+C` copy HTML

**Dark mode:** toggle with ◐ in the top bar (preference saved in browser).

**Editor role:** coordinators see a simplified UI (no Team / logout clutter) with the same compose workflow.

## What the app guarantees

- D365 shell always included (head, CSS, fonts, 640px wrapper)
- Footer always locked at bottom (compliance tokens)
- Built HTML is identical to `npm run build` output from the repo
- Campaigns saved in SQLite — shared across the team

## Security notes

- Change default admin password immediately
- Use HTTPS in production (hosting platforms provide this)
- Set a strong `SESSION_SECRET`
- Give coordinators `editor` role only (default when admin adds users)
- Rotate coordinator passwords periodically
