# AI Agent Development Guide

**Purpose:** Onboarding guide for AI coding assistants (OpenAI Codex, Cline, Claude Dev, Continue, etc.) working on the Email Marketing Builder. Provides architecture, conventions, and safety requirements for autonomous development in VS Code and other editors.

**Last Updated:** October 18, 2026  
**Repository:** https://github.com/cazuffi/emailamerketing  
**Application Version:** 2.0.0  
**Document Version:** 1.1.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Architecture](#3-architecture)
4. [Email HTML Requirements](#4-email-html-requirements)
5. [Development Workflow](#5-development-workflow)
6. [Database Safety](#6-database-safety)
7. [Deployment and Security](#7-deployment-and-security)
8. [AI Agent Operating Rules](#8-ai-agent-operating-rules)

---

## 1. Project Overview

### What This Application Does

Specialized HTML email builder for **Microsoft Dynamics 365 Customer Insights – Journeys**. Generates table-based, D365-compatible HTML emails tested with real Dynamics 365 sends.

**Not a generic email builder:** HTML is hardened against D365 send transforms (flex div wrapping, CSS rewriting, attribute stripping). See `docs/D365_EMAIL_GUIDELINES.md` (16KB) for verified rendering rules.

**77 reusable modules:** Header variants, hero layouts, CTA buttons, feature sections, footer (required). Registered in `components/modules/manifest.json`.

### Two Workflows

**CLI (Git-based):**
- Edit `campaigns/*/source.html` with `@include` directives
- Run `npm run build` to generate `email.html`
- Copy output → Paste into D365 Design → HTML tab
- Git tracks campaigns

**Visual Studio (Database-driven):**
- Browser UI at http://localhost:3000
- Drag modules, edit inline, save to SQLite
- Click "Copy HTML" → Paste into D365
- Database stores campaigns (not in Git)

Both workflows output identical D365-compatible HTML. See `README.md` for quick start commands.

---

## 2. Getting Started

### Prerequisites

- **Node.js 18+** (production uses 22)
- **npm** (package manager)
- **Git** (version control)
- **Text editor** (VS Code, Vim, etc.)

### Initial Setup

```bash
git clone https://github.com/cazuffi/emailamerketing.git
cd emailamerketing

# Install exact versions from lockfile (reproducible)
npm ci

# Verify installation
npm run build    # Should build all campaigns
npm test         # Should pass all tests
```

**Do NOT use `npm install`** - always use `npm ci` to preserve `package-lock.json` and ensure reproducible builds.

### Project Structure

```
components/
  modules/           77 email modules (all registered in manifest.json)
  _base/             Core email shell (head, wrapper, footer)
  _partials/         Reusable sub-components
  blocks/            Legacy components (prefer modules/)
campaigns/           Email campaigns (Git-tracked)
scripts/             Build tools (assemble, harden, test)
studio/              Visual Studio server + frontend
  data/              SQLite database (NOT in Git)
brand/               Colors, fonts, logos (tokens.json)
docs/                Documentation (D365 guidelines, workflow)
```

**Key Files:**
- `components/modules/manifest.json` - 77 registered modules with metadata
- `docs/D365_EMAIL_GUIDELINES.md` - Email HTML rules (required reading)
- `scripts/assemble.js` - Email generation engine
- `studio/db.js` - SQLite schema and operations
- `.github/workflows/main_wmemail.yml` - Azure deployment (triggers on ANY push to `main`)

---

## 3. Architecture

### Build Pipeline (CLI Workflow)

```
campaigns/*/source.html (with @include directives)
         ↓
scripts/build.js finds all source.html files
         ↓
scripts/assemble.js resolves @include recursively
         ↓
Reads: components/modules/*.html
       components/_base/*.html
       brand/tokens.json
         ↓
scripts/prune-css.js removes unused CSS (~40KB savings)
         ↓
scripts/harden-email.js applies D365 fixes:
  - Strip data-editorblocktype (prevents button flattening)
  - Normalize background: to background-color: (D365 mangles shorthand)
  - Add Gmail dark mode overrides
  - Add Outlook Desktop fallbacks
         ↓
Output: campaigns/*/email.html (paste into D365)
```

**Build marker in output:** `email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v66`

### Visual Studio Architecture

**Backend:** Express server (port 3000), SQLite database (WAL mode)

**Frontend:** Vanilla JavaScript (2,075 lines `studio/public/app.js`), no framework

**Database Schema:**
```sql
users (id, email, password_hash, name, role, created_at)
campaigns (id, title, modules, instances, overrides, status, created_by, updated_by, created_at, updated_at)
```

**Database Location:**
- Local: `studio/data/studio.db`
- Docker: `/data/studio.db` (configurable via `DATA_DIR` environment variable)

**⚠️ Database is NOT in Git.** SQLite files in `studio/data/` are gitignored. Visual Studio campaigns require separate backup.

### Module System

**77 modules registered** in `components/modules/manifest.json`:
```json
{
  "version": 2,
  "modules": [
    { "id": "header-standard", "file": "header-standard.html", "category": "Header", "description": "..." }
  ]
}
```

**Manifest vs. Files:**
- **77 HTML files** in `components/modules/*.html`
- **All 77 files** are registered in `manifest.json`
- Manifest provides metadata for Visual Studio UI (category, description)
- CLI workflow can use any HTML file with `@include`, but unregistered modules won't appear in Studio

**To add a new module:**
1. Create `components/modules/your-module-id.html`
2. Add entry to `manifest.json` with `id`, `file`, `category`, `description`
3. Test with `npm run build` and `npm test`

---

## 4. Email HTML Requirements

### Core Principles (Verified in D365)

1. **Table-based layouts** (not div + flexbox)
2. **Inline critical styles** (width, padding, color, alignment)
3. **Media queries as enhancements** (desktop fallback must work without them)
4. **Minimal D365 metadata** (avoid `data-container` unless truly editable)

**Authority:** Real Dynamics 365 test sends, not browser previews.

**Complete rules:** `docs/D365_EMAIL_GUIDELINES.md` (16,003 bytes, 239 lines)

### Critical Patterns

**Buttons (bulletproof table-based):**
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#ef7800;padding:12px 24px;">
      <a href="https://example.com" style="color:#ffffff;text-decoration:none;display:inline-block;">
        Click Here
      </a>
    </td>
  </tr>
</table>
```

**⚠️ NEVER use `data-editorblocktype="Button"`** - D365 strips surrounding table on send, breaking Outlook rendering. Export pipeline removes this automatically.

**Responsive stacking (mobile-first):**
```css
/* Source: Real table columns, stacked by default */
td.stat-stack {
  display: block;
  width: 100% !important;
}

/* Restore side-by-side at 481px+ (Gmail web pane) */
@media (min-width: 481px) {
  td.stat-stack {
    display: table-cell !important;
    width: 33.33% !important;
  }
}
```

**Why 481px:** D365 injects `td { display:block }` in Gmail web (481-640px). Override with min-width media query.

**Images:**
```html
<img src="https://assets-eur.mkt.dynamics.com/.../image.png"
     alt="Product photo"
     width="600"
     style="width:600px;max-width:100%;height:auto;display:block;">
```

Required: `width` attribute + inline style, `alt` text, `max-width:100%` for mobile.

**⚠️ Images hosted on D365 CDN** (from `brand/tokens.json`), not locally. If D365 tenant deleted, images break.

### Dynamics Send Transforms

When pasted into D365 and sent, Dynamics rewrites HTML:

- Wraps blocks in anonymous flex divs (`width:592px;flex:0 0 592px;...`)
- Sets `table.outer` to `display:block` (override with `display:table !important`)
- Mangles `background:` shorthand to `background-image:initial` (use `background-color:` longhand)
- Strips `data-editorblocktype="Button"` (export pipeline prevents this)

CSS in `components/_base/d365-send-compat.css` neutralizes these transforms.

---

## 5. Development Workflow

### Common Commands

```bash
npm ci                           # Install dependencies (NOT npm install)
npm run build                    # Build all campaigns
npm test                         # Run automated HTML validation
npm run preview -- <campaign>    # Preview in browser (port 4173)
npm run preview -- catalog       # Browse all modules
npm run studio                   # Start Visual Studio (port 3000)
```

### Adding a Module

```bash
# 1. Create module file
cat > components/modules/spacer-xl.html << 'EOF'
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
  <tr>
    <td style="height:80px;line-height:80px;font-size:0;">&nbsp;</td>
  </tr>
</table>
EOF

# 2. Register in manifest
# Edit components/modules/manifest.json, add:
# { "id": "spacer-xl", "file": "spacer-xl.html", "category": "Layout", "description": "Extra large spacer" }

# 3. Test
npm run build
npm test
npm run preview -- catalog

# 4. Commit
git add components/modules/spacer-xl.html components/modules/manifest.json
git commit -m "feat: add extra large spacer module"
```

### Testing Checklist

**Automated (npm test):**
- ✅ Complete `<!DOCTYPE html>` structure
- ✅ Single `<head>` and `<body>`
- ✅ No `data-editorblocktype="Button"`
- ✅ No `background:` shorthand
- ✅ Build marker present
- ✅ CSS under 102KB (Gmail clip limit)

**Manual (after build):**
- Visual preview: `npm run preview`
- D365 paste test: Design → HTML → paste `email.html`
- D365 "No media CSS" preview (critical fallback check)
- Test send to Gmail, Outlook, Apple Mail
- Mobile device test (≤480px)

**⚠️ Automated tests DO NOT verify:**
- Rendering in actual email clients
- D365 send transforms
- Outlook Desktop quirks
- Gmail dark mode
- Mobile stacking behavior

Always test in D365 before production use.

### Git Workflow

```bash
git status                      # Check working tree
git add <files>                 # Stage changes
git commit -m "type: message"   # Commit with conventional format
git push origin <branch>        # Push to GitHub

# ⚠️ CRITICAL: Pushing to 'main' triggers Azure deployment
# Create feature branches for development:
git checkout -b feature/my-changes
git push origin feature/my-changes  # No deployment
```

**Deployment trigger:** `.github/workflows/main_wmemail.yml` triggers on ANY push to `main`, including documentation-only commits. No path filters exist.

---

## 6. Database Safety

### SQLite Configuration

**WAL mode enabled:** `db.pragma('journal_mode = WAL')`

**Files created:**
- `studio.db` - Main database
- `studio.db-wal` - Write-ahead log
- `studio.db-shm` - Shared memory index

**Location:** Configurable via `DATA_DIR` environment variable (default: `studio/data/` locally, `/data/` in Docker)

### Production Storage Status

**⚠️ UNVERIFIED:** Actual production database storage configuration cannot be determined from repository.

**Deployment uses Docker** with `VOLUME /data` declaration, but volume mount configuration is external (Azure Portal).

**Possible configurations:**
1. **No mount** → Ephemeral container storage (data lost on redeploy)
2. **Azure Files (SMB)** → Persistent storage, but **SQLite WAL mode + network filesystems may have locking issues**
3. **Azure Disk** → Local block storage (safe for SQLite)

**Azure Files + SQLite WAL:** Microsoft documentation warns that network file systems may not provide correct locking semantics for SQLite. Verify with testing before assuming safety.

### Backup Procedures

**❌ NEVER copy active database files:**
```bash
# BAD: May produce corrupted backup if database is active
cp studio/data/studio.db backup.db
```

**✅ Transactionally consistent backups:**

**Option 1: SQLite Online Backup API**
```javascript
// Add to studio/server.js
const sqlite3 = require('better-sqlite3');

function backupDatabase(sourceDb, destPath) {
  const dest = new sqlite3(destPath);
  sourceDb.backup(dest);
  dest.close();
}
```

**Option 2: VACUUM INTO (SQLite 3.27+)**
```bash
sqlite3 studio/data/studio.db "VACUUM INTO '/backup/studio-backup.db'"
```

**Option 3: Export campaigns as JSON**
```bash
sqlite3 studio/data/studio.db <<EOF
.mode json
.output campaigns-backup.json
SELECT * FROM campaigns;
EOF
```

**Option 4: Shut down server first**
```bash
# Stop Visual Studio
pkill -f "node studio/server.js"

# Now safe to copy
cp studio/data/studio.db* /backup/

# Restart
npm run studio
```

### Schema Migrations

Migrations in `studio/db.js` function `migrateSchema()`:
```javascript
function migrateSchema(database) {
  const cols = database.prepare('PRAGMA table_info(campaigns)').all().map(c => c.name);
  
  if (!cols.includes('new_column')) {
    database.exec(`ALTER TABLE campaigns ADD COLUMN new_column TEXT DEFAULT 'value'`);
  }
}
```

**Non-destructive only:** Never `DROP TABLE` or `DELETE FROM` without explicit user approval.

---

## 7. Deployment and Security

### GitHub Actions Workflow

**File:** `.github/workflows/main_wmemail.yml`

**Triggers:**
- Push to `main` branch (ANY commit, including docs)
- Manual workflow dispatch

**Process:**
1. Build Docker image
2. Push to Azure Container Registry (`wmemailacr.azurecr.io/wmemail:${SHA}`)
3. Deploy to Azure Web App (`wmemail`)

**⚠️ NO PATH FILTERS:** Documentation-only commits trigger full deployment (~5-10 minutes).

**Safe development:** Use feature branches (`git checkout -b feature/my-changes`), merge to `main` only when ready to deploy.

### Environment Variables

**Required in production:**
- `NODE_ENV=production`
- `SESSION_SECRET=<32-byte-random-hex>`
- `ADMIN_EMAIL=<admin-email>`
- `ADMIN_PASSWORD=<strong-password>` (8+ characters)
- `DATA_DIR=/data`
- `PORT=3000`

**⚠️ NEVER commit:**
- `.env` file (gitignored)
- Actual secret values
- Database files
- Azure credentials

Template: `.env.example` (safe to commit)

### Dockerfile

**Base:** `node:22-slim`  
**Build deps:** `python3 make g++` (for better-sqlite3 native compilation)  
**Volume:** `/data` (database storage, requires external mount)  
**Port:** 3000

---

## 8. AI Agent Operating Rules

### Required Reading Before Any Work

1. **This document** (AGENTS.md) - Architecture and safety rules
2. **docs/D365_EMAIL_GUIDELINES.md** - Email HTML requirements (16KB, required)
3. **README.md** - Quick start commands
4. **Relevant code** in files you'll modify

### Decision Framework

**Proceed autonomously:**
- Documentation updates
- Bug fixes (typos, broken links)
- Adding modules following existing patterns
- Refactoring without behavior changes

**Ask for approval:**
- Database schema changes
- Deployment configuration changes
- Removing modules or campaigns
- Brand color/typography changes
- D365 compatibility changes
- Breaking changes to CLI commands
- Production deployments

### Critical Safety Rules

**Database Operations:**

❌ **NEVER** delete or modify `studio/data/studio.db` without explicit approval  
❌ **NEVER** run `DROP TABLE` or `DELETE FROM` without explicit approval  
❌ **NEVER** copy active database files (use SQLite backup API)  
❌ **NEVER** commit database files to Git  
✅ **ALWAYS** test schema migrations on backup first  
✅ **ALWAYS** write non-destructive migrations (ADD COLUMN, not DROP)

**Deployment Operations:**

❌ **NEVER** push to `main` without explicit approval (triggers Azure deployment)  
❌ **NEVER** modify `.github/workflows/` without approval  
❌ **NEVER** assume successful push means successful deployment  
✅ **ALWAYS** use feature branches for development  
✅ **ALWAYS** verify tests pass before pushing (`npm test`)  
✅ **ALWAYS** explain what will be deployed before pushing to `main`

**Code Changes:**

❌ **NEVER** break backward compatibility with existing campaigns  
❌ **NEVER** change D365 hardening logic without verification  
❌ **NEVER** remove existing email modules  
❌ **NEVER** modify brand colors without approval  
✅ **ALWAYS** preserve existing functionality  
✅ **ALWAYS** run `npm test` after changes  
✅ **ALWAYS** update `manifest.json` when adding/removing modules

### Before Production Operations

**Template for requesting approval:**

```
ACTION REQUIRED: [Operation description]

What: [What will be changed/deployed/deleted]
Why: [Reason for operation]
Risk: [Potential data loss, downtime, breaking changes]
Tested: [What testing was performed]
Rollback: [How to revert if it fails]

Proceed? (YES/NO)
```

**Example:**
```
ACTION REQUIRED: Push email module changes to production

What: Deploy new hero-gradient module + updated harden-email.js
Why: User requested gradient background support
Risk: New D365 hardening logic could affect existing campaigns
Tested: 
  - npm test passed (all 27 assertions)
  - Built all campaigns successfully
  - Previewed in browser
  - NOT tested in D365 (user must test after deploy)
Rollback: git revert <commit-hash>, push to main

Proceed? (YES/NO)
```

### Error Reporting

When encountering errors:

1. **Read complete error message** (stack traces show source)
2. **Check recent changes** (`git diff`, `git log`)
3. **Reproduce minimally** (isolate failing case)
4. **Report clearly:**
   - Complete error message
   - Steps to reproduce
   - Relevant code snippets
   - Proposed solution (if known)

**DO NOT:**
- Hide errors
- Assume fixes without testing
- Make unrelated changes while debugging

### Coding Standards

**JavaScript:**
- ES6+ syntax (Node.js 18+)
- CommonJS modules (`require`, not ESM `import`)
- 2-space indentation
- Single quotes for strings
- Descriptive variable names

**Email HTML:**
- Self-contained fragments (no `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`)
- Inline critical styles
- Semantic CSS classes (`.module-name-element`)
- Table-based layouts (not div+flexbox)
- Comments for editable regions

**Comments:**
- Use sparingly (code should be self-explanatory)
- Explain non-obvious D365 workarounds
- Do NOT narrate obvious operations

### Working with VS Code Extensions

**Compatible AI assistants:**
- **OpenAI Codex** (via Continue extension)
- **Cline** (Claude-powered, local context)
- **Claude Dev** (Anthropic API)
- **GitHub Copilot** ($10/month or $100/year)
- **Continue** (bring your own API key)

**Workflow:**
1. Open VS Code in repository
2. Install AI assistant extension
3. Paste this document (AGENTS.md) as context
4. Reference specific files as needed
5. Follow safety rules above

**DO NOT:**
- Assume features exist without checking code
- Make changes without reading existing implementation
- Skip testing after modifications

---

## Appendix: Quick Reference

### File Paths

```
Email modules:         components/modules/*.html (77 files)
Module registry:       components/modules/manifest.json
Email guidelines:      docs/D365_EMAIL_GUIDELINES.md (required reading)
Build script:          scripts/build.js
Assembly engine:       scripts/assemble.js
Studio server:         studio/server.js
Studio database:       studio/data/studio.db (NOT in Git)
GitHub Actions:        .github/workflows/main_wmemail.yml
Brand configuration:   brand/tokens.json
```

### Commands

```bash
npm ci                           # Install (reproducible)
npm run build                    # Build all campaigns
npm test                         # Run automated tests
npm run preview -- <campaign>    # Preview campaign
npm run preview -- catalog       # Browse all modules
npm run studio                   # Start Visual Studio (port 3000)
npm run new -- <slug>            # Create campaign
npm run add -- <slug> <modules>  # Add modules to campaign
npm run list                     # List all module IDs
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` or `PORT=3001 npm run studio` |
| Module not found | `npm ci` (NOT npm install) |
| Build fails | Check error, verify `@include` paths exist |
| Tests fail | Read test output, fix issues, run `npm test` |
| Changes not in D365 | Verify you copied **email.html** (not source.html) |

### Critical Reminders

✅ Read AGENTS.md + docs/D365_EMAIL_GUIDELINES.md before starting  
✅ Use `npm ci` (not `npm install`)  
✅ Test with `npm test` before committing  
✅ Request approval before pushing to `main` (triggers deployment)  
✅ Request approval before database operations  
✅ Use SQLite backup API (not file copying)  
✅ Never commit secrets or database files  
✅ Follow D365 HTML rules (tables, inline styles)  
✅ Distinguish automated tests from manual D365 tests  

---

**Document Version:** 1.1.0  
**Last Updated:** October 18, 2026  
**License:** Private  

**Changes from v1.0.0:**
- Fixed module count (77, not 58)
- Removed default password examples
- Changed `npm install` to `npm ci`
- Removed destructive git commands
- Corrected SQLite backup guidance
- Removed Azure Files safety claims
- Added explicit approval requirements
- Distinguished automated vs manual tests
- Reduced duplication with README/docs
- Improved Codex/Cline/VS Code compatibility
