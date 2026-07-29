# Deploy Email Studio to Azure App Service

Host the visual email composer on your **personal Azure account**, then use it from any browser — including your work laptop. No Node.js install needed on the work machine.

**URL shape:** `https://your-app-name.azurewebsites.net`

---

## What you are deploying

Email Studio is a **Node.js server** (`npm run studio`), not a static site. It needs:

- A running process (Express)
- SQLite storage for saved campaigns (`DATA_DIR`)
- HTTPS (App Service provides this automatically)

The repo includes a `Dockerfile` — use **Docker on Linux App Service**. That avoids native build issues with `better-sqlite3` on Azure’s build servers.

---

## Prerequisites

| Item | Notes |
|------|--------|
| Personal Microsoft account | Sign up at [azure.microsoft.com/free](https://azure.microsoft.com/free/) |
| GitHub repo | This project pushed to GitHub (public or private) |
| Personal laptop | For one-time setup and occasional updates |

**Optional:** Azure CLI (`az`) if you prefer terminal deploy over the portal.

---

## Step 1 — Create the App Service (Azure Portal)

1. Sign in to [portal.azure.com](https://portal.azure.com) with your **personal** account.
2. **Create a resource** → **Web App**.
3. Fill in the basics:

   | Field | Recommendation |
   |-------|----------------|
   | Resource group | New, e.g. `email-studio-rg` |
   | Name | Globally unique, e.g. `weidmuller-email-studio` → becomes `https://weidmuller-email-studio.azurewebsites.net` |
   | Publish | **Docker Container** |
   | Operating System | **Linux** |
   | Region | Closest to you (e.g. West Europe) |
   | Pricing plan | **Basic B1** (recommended — always on, supports containers + storage mounts). Free F1 is too limited for reliable Docker hosting. |

4. **Docker** tab (or Next → Docker):

   | Field | Value |
   |-------|--------|
   | Options | Single Container |
   | Image source | **GitHub** (or Docker Hub / ACR if you prefer) |
   | Connect GitHub | Authorize Azure, select repo + branch |
   | Image | Azure will build from the repo `Dockerfile` |

   If GitHub integration is awkward on first try, use **Azure Container Registry (ACR)** instead: build locally with `docker build`, push to ACR, point App Service at that image. See [Alternative: deploy with Docker locally](#alternative-deploy-with-docker-locally) below.

5. Review + **Create**. Wait for deployment to finish (~5–10 minutes first time).

---

## Step 2 — Set environment variables

In the portal: **Your Web App** → **Settings** → **Environment variables** → **App settings** → **+ Add**.

Add these **before** you rely on the app in production:

| Name | Value | Required |
|------|--------|----------|
| `NODE_ENV` | `production` | Yes |
| `SESSION_SECRET` | Long random string — run `openssl rand -hex 32` on your Mac/Linux terminal | Yes |
| `ADMIN_EMAIL` | Your login email | Yes |
| `ADMIN_PASSWORD` | Strong password (8+ characters) | Yes |
| `ADMIN_NAME` | Display name, e.g. `Chris` | No |
| `DATA_DIR` | `/data` | Yes (with storage mount in Step 3) |
| `WEBSITES_PORT` | `3000` | Yes (tells App Service which port the container listens on) |

Click **Apply** → **Confirm**. The app will restart.

**Important:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` only seed the first admin when the database is **empty**. Set them on first deploy, before anyone logs in.

---

## Step 3 — Persistent storage (don’t skip this)

Without persistent storage, **saved campaigns disappear** when Azure restarts or redeploys the container.

### Mount Azure Files at `/data`

1. Create a **Storage account** (same resource group is fine):
   - **Create a resource** → **Storage account**
   - Performance: Standard, Redundancy: LRS is enough
   - Name: e.g. `emailstudiostore` (lowercase, no spaces)

2. In the storage account → **Data storage** → **File shares** → **+ File share**
   - Name: `studio-data`

3. Back in **App Service** → **Settings** → **Configuration** → **Path mappings** tab → **+ New Azure Storage Mount**:

   | Field | Value |
   |-------|--------|
   | Name | `studiodata` |
   | Storage account | The account you created |
   | Storage type | Azure Files |
   | Azure file share | `studio-data` |
   | Mount path | `/data` |

4. Save. Restart the app.

5. Confirm `DATA_DIR` app setting is `/data` (Step 2).

SQLite will create `studio.db` inside that mount.

---

## Step 4 — Verify from your personal laptop

1. Open `https://<your-app-name>.azurewebsites.net`
2. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. Create a test campaign → **Save** → refresh the page → campaign should still be there
4. **Copy HTML** and confirm the first line includes the build marker, e.g. `gmail-dynamics-v44`

If the app shows “Application Error”, check **Log stream** (App Service → **Monitoring** → **Log stream**) or **Diagnose and solve problems**.

---

## Step 5 — Use it on your work laptop

1. On the work machine, open the same URL in Chrome/Edge — **no install**
2. Sign in with your admin credentials
3. Compose → Preview → Copy HTML → paste into D365 (full HTML replace)

If the page never loads, your corporate firewall may block `*.azurewebsites.net`. Ask IT to allow that subdomain, or try phone hotspot once to confirm it’s a network block.

---

## Step 6 — Add a coordinator (optional)

1. Sign in as admin
2. Top bar → **Team**
3. Add name, email, temporary password (editor role)
4. Share the App Service URL + their credentials

Coordinators can build and copy HTML; they cannot add users.

---

## Updating the app after code changes

When you merge changes to the connected GitHub branch:

1. Azure rebuilds the Docker image automatically (if GitHub deploy is connected), **or**
2. Manually: App Service → **Deployment Center** → **Sync**, **or**
3. Push a new image to ACR and restart the app

Campaign data in `/data` survives redeploys as long as the Azure Files mount stays configured.

To pick up new modules/CSS from the repo, deploy the latest image — you do **not** need to change anything in D365 until you copy fresh HTML from Studio.

---

## Alternative: deploy with Docker locally

If GitHub → App Service integration is finicky:

```bash
# On your personal laptop, in the repo root
az login
az acr create --resource-group email-studio-rg --name emailstudioacr --sku Basic
az acr login --name emailstudioacr

docker build -t email-studio .
docker tag email-studio emailstudioacr.azurecr.io/email-studio:latest
docker push emailstudioacr.azurecr.io/email-studio:latest
```

In App Service → **Deployment Center**, set image to:

`emailstudioacr.azurecr.io/email-studio:latest`

Enable admin credentials or managed identity for ACR pull.

---

## Security checklist

- [ ] Strong `ADMIN_PASSWORD` (not `changeme`)
- [ ] Random `SESSION_SECRET` (32+ bytes)
- [ ] `NODE_ENV=production` set
- [ ] HTTPS only (default on App Service)
- [ ] Coordinators get **editor** role, not admin
- [ ] Be aware: campaign content lives on **personal Azure** — check employer policy for confidential data

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Application Error on startup | Check Log stream; often missing `WEBSITES_PORT=3000` or container crash on `better-sqlite3` (use Docker deploy, not raw Node buildpack) |
| Login works but saves vanish | Azure Files mount missing or `DATA_DIR` not `/data` |
| Default admin / wrong password | Admin is seeded once on empty DB. Fix: stop app, delete `studio.db` from file share (or remount fresh share), set `ADMIN_*` env vars, restart |
| Works at home, not at work | Corporate block on `azurewebsites.net` — try IT whitelist or use local `npm run studio` on work laptop if Node is allowed |
| Stale HTML in D365 | Copy HTML again from Studio after deploy; full replace in D365, confirm build marker version |

---

## Cost (rough guide)

| Tier | Approx. | Notes |
|------|---------|--------|
| Basic B1 | ~£10–15 / month | Recommended — always on |
| Storage account + file share | ~£1–2 / month | For SQLite persistence |
| Free F1 | £0 | Not recommended for Docker + always-on Studio |

Turn off or delete the resource group when not needed to stop billing.

---

## Quick reference — env vars

```bash
NODE_ENV=production
SESSION_SECRET=<openssl rand -hex 32>
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<8+ char strong password>
ADMIN_NAME=Your Name
DATA_DIR=/data
WEBSITES_PORT=3000
```

---

## Related docs

- [studio-deploy.md](./studio-deploy.md) — local dev, Docker run, coordinator workflow
- [D365_EMAIL_GUIDELINES.md](./D365_EMAIL_GUIDELINES.md) — paste and test-send in Dynamics
