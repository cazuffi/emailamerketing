# AI Agent Development Guide

**Purpose:** This document serves as the primary onboarding and instruction guide for any AI coding assistant working on the Email Marketing Builder application. It provides complete context about the application architecture, conventions, and safety requirements to enable future development without dependency on Cursor or its conversation history.

**Last Updated:** October 18, 2026  
**Repository:** https://github.com/cazuffi/emailamerketing  
**Current Version:** 2.0.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Architecture and Data Flow](#4-architecture-and-data-flow)
5. [Critical Email HTML Requirements](#5-critical-email-html-requirements)
6. [Development Commands](#6-development-commands)
7. [Coding Standards](#7-coding-standards)
8. [Database and Data Safety](#8-database-and-data-safety)
9. [Deployment and Security](#9-deployment-and-security)
10. [AI Agent Operating Instructions](#10-ai-agent-operating-instructions)
11. [Future Development Handoff](#11-future-development-handoff)

---

## 1. Project Overview

### What This Application Does

The Email Marketing Builder is a specialized HTML email generation tool designed specifically for **Microsoft Dynamics 365 Customer Insights – Journeys**. It generates table-based, D365-compatible HTML emails that work correctly in Outlook, Gmail, and other email clients.

**Key Characteristics:**
- Produces D365-native HTML (not MJML or other abstractions)
- HTML output is verified through real Dynamics 365 test sends
- Specialized handling for Dynamics send transforms and Gmail rendering quirks
- 58 pre-built, reusable email modules organized by category

### Who It Serves

This application serves two user personas:

1. **Technical Users (CLI Workflow):**
   - Marketing technologists who edit HTML directly
   - Use Git for version control
   - Build emails with command-line tools (`npm run build`)
   - Edit `campaigns/*/source.html` files with `@include` directives

2. **Non-Technical Users (Visual Studio):**
   - Marketing coordinators who need a GUI
   - Use browser-based drag-and-drop interface at http://localhost:3000
   - Select modules visually, edit text/images inline
   - Save campaigns to SQLite database
   - Export HTML with "Copy HTML" button

### Primary Workflow

**Option A: CLI (Git-based)**
```bash
npm run new -- july-promo                    # Create campaign folder
npm run add -- july-promo hero-split cta-primary-center
npm run build                                 # Generate email.html
npm run preview -- july-promo                # Preview in browser
# Copy campaigns/2026-07-july-promo/email.html → Paste into D365
```

**Option B: Visual Studio (Database-driven)**
```bash
npm run studio                                # Start server on port 3000
# Open http://localhost:3000
# Drag modules, edit content, save to database
# Click "Copy HTML" → Paste into D365
```

**Final Step (Both Workflows):**
- Paste `email.html` into Dynamics 365 → **Design → HTML** tab
- Switch to Designer for personalization tokens (`{{FirstName}}`)
- **Preview and Test** → desktop + mobile
- Schedule in Customer Journey

### Why D365-Specific

Microsoft Dynamics 365 Customer Insights – Journeys performs send-time HTML transformations that break generic email templates:

- Wraps content in anonymous flex divs
- Rewrites table display properties
- Strips certain HTML attributes
- Mangles CSS shorthand properties
- Adds metadata classes

This application's HTML is hardened against these transforms. See [Section 5](#5-critical-email-html-requirements) for details.

---

## 2. Technology Stack

### Runtime Environment

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 22 (Dockerfile), 18+ (local) | JavaScript runtime |
| **npm** | Bundled with Node.js | Package management |

### Backend Framework

| Package | Version | Purpose |
|---------|---------|---------|
| **express** | ^4.21.2 | HTTP server for Visual Studio |
| **better-sqlite3** | ^11.8.1 | Embedded SQLite database |
| **bcryptjs** | ^2.4.3 | Password hashing (Studio users) |
| **express-session** | ^1.18.1 | Session management (Studio) |
| **cheerio** | ^1.0.0 | Server-side HTML parsing/manipulation |

### Frontend

| Technology | Location | Purpose |
|------------|----------|---------|
| **Vanilla JavaScript** | `studio/public/app.js` (2,075 lines) | Visual Studio UI |
| **CSS** | `studio/public/styles.css` | Studio styling |
| **HTML** | `studio/public/index.html` | Studio interface |

**No framework:** The Studio frontend uses vanilla DOM manipulation, no React/Vue/Angular.

### Build Tools

| Tool | Purpose |
|------|---------|
| **Node.js scripts** | Custom build pipeline (`scripts/build.js`, `scripts/assemble.js`) |
| **chokidar** | File watching for live preview (`scripts/preview.js`) |

**No bundlers:** No webpack, Vite, Rollup, or Parcel. All processing is custom Node.js scripts.

### Database

| Technology | Storage Location | Purpose |
|------------|------------------|---------|
| **SQLite 3** | `studio/data/studio.db` (local) or `/data/studio.db` (Docker) | User accounts, saved campaigns |
| **WAL mode** | Enabled (`journal_mode = WAL`) | Write-ahead logging for concurrency |

**Schema:**
```sql
users (id, email, password_hash, name, role, created_at)
campaigns (id, title, modules, instances, overrides, status, created_by, updated_by, created_at, updated_at)
```

**CRITICAL:** Database is **NOT** stored in Git. See [Section 8](#8-database-and-data-safety).

### Deployment

| Component | Configuration |
|-----------|--------------|
| **Container** | Docker (Node.js 22 slim) |
| **Registry** | Azure Container Registry (`wmemailacr.azurecr.io`) |
| **Hosting** | Azure Web App (`wmemail`) |
| **CI/CD** | GitHub Actions (`.github/workflows/main_wmemail.yml`) |
| **Trigger** | Every push to `main` branch |

**Deployment Flow:**
1. Push to `main` → GitHub Actions triggered
2. Build Docker image with SHA tag
3. Push to Azure Container Registry
4. Deploy to Azure Web App
5. **Database persistence:** Requires Azure Files mount at `/data` (verify in Azure Portal)

---

## 3. Repository Structure

### Directory Map

```
email-marketing/
├── .github/workflows/           # GitHub Actions (Azure deployment)
│   └── main_wmemail.yml         # Triggers on push to main
│
├── brand/                       # Brand configuration
│   ├── tokens.json              # Colors, fonts, logos, CDN URLs
│   └── guidelines.md            # Brand standards
│
├── campaigns/                   # Email campaigns (Git-tracked)
│   ├── 2026-07-demo-email/      # Example campaign
│   ├── 2026-07-sales-ignitor-rockstar/  # Example campaign
│   │   ├── source.html          # Source with @include directives
│   │   ├── email.html           # Generated output (paste into D365)
│   │   ├── notes.md             # Campaign checklist
│   │   ├── subject-lines.md     # Subject line options
│   │   └── blocks/              # Optional campaign-specific overrides
│   └── _studio/                 # Reserved for Studio-created campaigns
│
├── components/                  # Email building blocks
│   ├── _base/                   # Core email shell
│   │   ├── head.html            # <head> with meta tags, fonts
│   │   ├── body-open.html       # Opening wrapper table
│   │   ├── body-close.html      # Closing wrapper, footer
│   │   ├── module-styles.css    # Module-specific CSS
│   │   ├── outlook-fallbacks.css  # MSO conditional CSS
│   │   └── d365-send-compat.css   # Dynamics send transform fixes
│   ├── _partials/               # Reusable sub-components (15 files)
│   │   ├── button-primary.html
│   │   ├── button-outline.html
│   │   └── ...
│   ├── modules/                 # 77 email module files
│   │   ├── manifest.json        # Module metadata (58 modules)
│   │   ├── header-standard.html
│   │   ├── hero-split.html
│   │   ├── cta-primary-center.html
│   │   ├── footer.html          # Required footer module
│   │   └── ...
│   └── blocks/                  # Legacy components (9 files)
│
├── docs/                        # Documentation
│   ├── D365_EMAIL_GUIDELINES.md # ★ Email HTML rules (16KB, read this)
│   ├── workflow.md              # Development workflow
│   ├── modules.md               # Module catalog
│   ├── studio-deploy.md         # Visual Studio deployment
│   └── azure-app-service.md     # Azure hosting guide
│
├── scripts/                     # Build and CLI tools (14 files)
│   ├── build.js                 # Main build script
│   ├── assemble.js              # Email assembly engine
│   ├── preview.js               # Local preview server
│   ├── new-campaign.js          # Create campaign folder
│   ├── add-modules.js           # Add modules to campaign
│   ├── list-modules.js          # Print module IDs
│   ├── audit-email.js           # Email validation tests
│   ├── harden-email.js          # D365 compatibility transforms
│   ├── prune-css.js             # Remove unused CSS classes
│   ├── module-fields.js         # Extract editable fields
│   └── ...
│
├── studio/                      # Visual Studio application
│   ├── server.js                # Express server (port 3000)
│   ├── db.js                    # SQLite database operations
│   ├── auth.js                  # User authentication
│   ├── data/                    # Database storage (gitignored)
│   │   └── studio.db            # SQLite database (NOT in Git)
│   └── public/                  # Frontend assets
│       ├── index.html           # Studio UI
│       ├── app.js               # Client-side JavaScript (2,075 lines)
│       └── styles.css           # Studio CSS
│
├── templates/                   # Campaign shells (3 files)
│   ├── _campaign-shell.html     # Default shell with @include directives
│   ├── _module-preview-shell.html  # Shell for module previews
│   └── module-catalog.html      # Module browser template
│
├── .cursor/                     # Cursor IDE configuration
│   └── rules/                   # Project-specific AI rules
│       └── d365-email.mdc       # Email development guidelines
│
├── .env.example                 # Environment variable template
├── .gitignore                   # Git exclusions (node_modules, dist, studio/data)
├── Dockerfile                   # Docker build instructions
├── package.json                 # npm configuration and scripts
├── package-lock.json            # Dependency lockfile
├── README.md                    # Quick start guide
└── AGENTS.md                    # ★ This file (AI agent guide)
```

### Key Files by Task

| Task | Primary Files |
|------|--------------|
| **Understand email rules** | `docs/D365_EMAIL_GUIDELINES.md` |
| **Add new module** | `components/modules/*.html`, `components/modules/manifest.json` |
| **Edit brand styling** | `brand/tokens.json`, `components/_base/*.css` |
| **Modify build process** | `scripts/assemble.js`, `scripts/build.js` |
| **Edit Studio UI** | `studio/public/app.js`, `studio/public/styles.css` |
| **Modify Studio API** | `studio/server.js`, `studio/db.js` |
| **Deploy changes** | `.github/workflows/main_wmemail.yml`, `Dockerfile` |

---

## 4. Architecture and Data Flow

### Two Parallel Workflows

#### Workflow A: CLI (Git-Based)

```
Developer edits source.html
         ↓
   npm run build
         ↓
scripts/build.js finds campaigns/*/source.html
         ↓
scripts/assemble.js resolves @include directives
         ↓
Reads components/modules/*.html
Reads components/_base/*.html
Reads brand/tokens.json
         ↓
Assembles complete email
         ↓
scripts/harden-email.js applies D365 fixes
         ↓
scripts/prune-css.js removes unused CSS
         ↓
Writes campaigns/*/email.html
         ↓
Developer copies email.html → Pastes into D365
```

**Persistence:** Git repository

#### Workflow B: Visual Studio (Database-Driven)

```
User opens http://localhost:3000
         ↓
studio/server.js serves studio/public/index.html
         ↓
studio/public/app.js loads module list via API
         ↓
GET /api/modules → studio/server.js
         ↓
Reads components/modules/manifest.json
         ↓
Returns module list to browser
         ↓
User drags modules, edits fields
         ↓
User clicks Save
         ↓
POST /api/campaigns → studio/server.js
         ↓
studio/db.js saves to studio/data/studio.db
         ↓
User clicks "Copy HTML"
         ↓
POST /api/build → studio/server.js
         ↓
scripts/assemble.js generates HTML
         ↓
Returns HTML to browser
         ↓
User copies HTML → Pastes into D365
```

**Persistence:** SQLite database (`studio/data/studio.db`)

### Email Assembly Engine

**Core Function:** `scripts/assemble.js`

**Input:** Source HTML with `@include` directives
```html
<!DOCTYPE html>
<html>
<head>
<!-- @include ../../components/_base/head.html -->
</head>
<body>
<!-- @include ../../components/modules/header-standard.html -->
<!-- @include ../../components/modules/hero-split.html -->
<!-- @include ../../components/modules/footer.html -->
</body>
</html>
```

**Process:**
1. **Resolve includes** recursively (depth limit: 20)
2. **Extract module IDs** from included file paths
3. **Collect active CSS classes** used by those modules
4. **Prune CSS** by removing unused classes (saves ~40KB)
5. **Apply field overrides** (for Studio: replace placeholders with user content)
6. **Harden for D365** (`scripts/harden-email.js`):
   - Strip `data-editorblocktype` attributes (prevents D365 button flattening)
   - Normalize `background:` to `background-color:` (D365 mangles shorthand)
   - Add Gmail dark mode overrides
   - Add Outlook fallback CSS
7. **Sanitize for export** (final cleanup)
8. **Return complete `<!DOCTYPE html>` document**

**Output:** Production-ready HTML string

**Build Marker:** `email-marketing/2.0.0+d365-send-compat+css-prune+gmail-dynamics-v66`

### Brand Token Integration

**Source:** `brand/tokens.json`

**Schema:**
```json
{
  "colors": {
    "primary": "#ef7800",
    "text": "#000000",
    "background": "#ffffff"
  },
  "typography": {
    "heading": "ARIALNB, Arial, Verdana, sans-serif",
    "body": "ARIALN, Arial, Verdana, sans-serif",
    "h1Size": "22px"
  },
  "fonts": {
    "ARIALN": "https://assets-eur.mkt.dynamics.com/.../fonts/...",
    "ARIALNB": "https://assets-eur.mkt.dynamics.com/.../fonts/..."
  },
  "images": {
    "logo": "https://assets-eur.mkt.dynamics.com/.../images/...",
    "logoDisplayWidth": 200,
    "heroPlaceholder": "https://...",
    "featurePlaceholder": "https://..."
  }
}
```

**Usage:**
- Colors → CSS variables in `components/_base/module-styles.css`
- Fonts → `@font-face` declarations in `components/_base/head.html`
- Images → Default `src` attributes in modules

**CRITICAL:** Images are hosted on Dynamics 365 CDN, not locally. If D365 tenant is deleted, images break.

### SQLite Database Schema

**Location:** `studio/data/studio.db` (local) or `/data/studio.db` (Docker)

**Configuration:** WAL mode enabled (`journal_mode = WAL`)

**Tables:**

**users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt hashed
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',  -- 'admin' or 'editor'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**campaigns**
```sql
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  modules TEXT NOT NULL DEFAULT '[]',        -- JSON array of module IDs
  instances TEXT NOT NULL DEFAULT '[]',      -- JSON array of instance objects
  overrides TEXT NOT NULL DEFAULT '{}',      -- JSON object of field overrides
  status TEXT NOT NULL DEFAULT 'draft',      -- 'draft', 'ready', 'sent'
  created_by INTEGER NOT NULL REFERENCES users(id),
  updated_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Initialization:**
- Database created automatically on first `npm run studio` launch
- Admin user seeded from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- Schema migrations handled in `studio/db.js` function `migrateSchema()`

---

## 5. Critical Email HTML Requirements

### Overview

The email HTML generated by this application follows strict patterns verified through real Dynamics 365 test sends. These rules are documented extensively in **`docs/D365_EMAIL_GUIDELINES.md`** (16,003 bytes, 239+ lines).

**Authority:** Dynamics 365 test sends, not browser previews.

### Core Principles

1. **Table-based layouts** (not div-based flexbox)
2. **Inline critical styles** (dimensions, colors, alignment)
3. **Media queries as enhancements** (desktop fallback must work without them)
4. **Minimal Dynamics metadata** (avoid `data-container` unless truly editable)
5. **Direct paste workflow** (never re-edit in another HTML editor)

### Verified Layout Requirements

#### Table Structure

```html
<!-- Good: Presentation table with inline styles -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" 
       style="width:100%;max-width:640px;margin:0 auto;">
  <tr>
    <td style="padding:20px;text-align:center;">
      Content
    </td>
  </tr>
</table>

<!-- Bad: Div-based layout (breaks in Outlook) -->
<div style="display:flex;max-width:640px;">
  <div style="flex:1;">Content</div>
</div>
```

#### Inline Styles

**Required inline:**
- `width`, `max-width`, `min-width`
- `padding`, `margin`
- `text-align`, `vertical-align`
- `background-color` (never shorthand `background:`)
- `color`, `font-family`, `font-size`

**Can be in `<style>` block:**
- Responsive media queries
- `:hover` states
- Gmail dark mode overrides (`[data-ogsc]`)

#### Buttons (Bulletproof Pattern)

```html
<!-- Good: Table-based bulletproof button -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#ef7800;border-radius:0;padding:12px 24px;">
      <a href="https://example.com" 
         style="color:#ffffff;text-decoration:none;display:inline-block;">
        Click Here
      </a>
    </td>
  </tr>
</table>

<!-- Bad: Padding on anchor (Outlook ignores with width:100%) -->
<a href="https://example.com" 
   style="padding:12px 24px;background-color:#ef7800;width:100%;">
  Click Here
</a>
```

**CRITICAL:** Do NOT use `data-editorblocktype="Button"` attribute. Dynamics strips the surrounding table on send, breaking Outlook rendering. The export pipeline (`scripts/harden-email.js`) removes this attribute automatically.

#### Responsive Behavior

**Mobile-first stacking:**
```css
/* Source HTML: Real table columns, stacked by default */
td.stat-stack {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
}

/* Desktop: Restore side-by-side at 481px+ */
@media (min-width: 481px) {
  td.stat-stack {
    display: table-cell !important;
    width: 33.33% !important;
  }
}
```

**Why 481px:** Dynamics injects `td { display:block }` in Gmail web pane (481-640px width). Use `@media (min-width: 481px)` to override.

**Mobile breakpoint:** ≤480px for stacking

#### Images

```html
<!-- Good: Fixed width image with alt text -->
<img src="https://assets-eur.mkt.dynamics.com/.../image.png"
     alt="Product photo"
     width="600"
     style="width:600px;max-width:100%;height:auto;display:block;">

<!-- Bad: No width attribute (size unpredictable) -->
<img src="..." alt="...">
```

**Requirements:**
- `width` HTML attribute AND inline style
- `alt` text for accessibility
- `max-width:100%` for mobile responsiveness
- `display:block` to remove inline spacing
- Hosted on D365 CDN or external stable URL (not base64)

#### Colors and Typography

**From `brand/tokens.json`:**
- Primary orange: `#ef7800`
- Text: `#000000`
- Background: `#ffffff`
- Canvas: `#f4f4f4`

**Font Loading:**
- ARIALN (body): Loaded via `@font-face` from D365 CDN
- ARIALNB (headings): Loaded via `@font-face` from D365 CDN
- Fallbacks: `Arial, Verdana, sans-serif`

**H1:** 22px, ARIALNB  
**H2:** 20px, ARIALN, orange (#ef7800)  
**H3:** 14px, ARIALNB  
**Body:** 12px, ARIALN  

#### Gmail Dark Mode

```css
/* Prevent Gmail from inverting white backgrounds */
<meta name="color-scheme" content="light only">

/* Lock content area white in dark mode */
[data-ogsc] .content-wrapper {
  background-color: #ffffff !important;
}

/* Lock footer orange in dark mode */
[data-ogsb] .footer-section {
  background-color: #ef7800 !important;
}
```

#### Outlook Compatibility

```html
<!-- MSO conditional comments for Outlook-specific fixes -->
<!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640">
<tr><td>
<![endif]-->

Email content

<!--[if mso]>
</td></tr></table>
<![endif]-->
```

**Use sparingly:** Only for critical Outlook Desktop fixes. Most layout should work without MSO conditionals.

### Dynamics Send Transforms (Verified)

When you paste HTML into Dynamics and send, Dynamics rewrites the markup:

1. **Wraps blocks in anonymous flex divs:**
   ```html
   <div style="width:592px;flex:0 0 592px;display:flex;flex-direction:column">
     <div align="center">…module content…</div>
   </div>
   ```

2. **Sets section tables to `display:block`:**
   - Override with `.outer { display:table !important }` in CSS

3. **Adds `columns-equal-class` to every section:**
   - Ignore this (editor metadata, not a rendering issue)

4. **Flattens `data-editorblocktype="Button"` to bare `<a>`:**
   - Solution: Strip this attribute during export (already implemented)

5. **Mangles `background:` shorthand to `background-image:initial…` and drops color:**
   - Solution: Always use `background-color:` longhand (export pipeline normalizes this)

6. **Preserves:**
   - `<style>` blocks
   - `background-color` longhand
   - `bgcolor` attributes
   - Plain `<a>` links (adds tracking params)
   - MSO conditional comments
   - Presentation tables

### Validation and Testing

**Test Suite:** `npm test` runs `scripts/audit-email.js`

**Verified Checks:**
- Complete `<!DOCTYPE html>` structure
- Single `<head>` and `<body>` tags
- Viewport meta tag present
- Style block before `</head>`
- No `data-editorblocktype="Button"` attributes
- No inline `background:` shorthand (must be `background-color:`)
- Build marker present in HTML
- CSS size under Gmail 102KB clip limit
- All referenced modules exist
- No media queries inside `<body>` (must be in `<head>`)

**Testing Workflow:**
1. `npm run build` → Generate email.html
2. `npm test` → Validate HTML structure
3. `npm run preview` → Visual desktop preview (640px)
4. Paste into D365 → **Design → HTML**
5. D365 **Preview and Test** → Desktop + mobile with sample contact
6. **Enable "No media CSS" preview** → Verify desktop fallback works
7. Send test email to Gmail, Outlook, Apple Mail
8. Verify mobile stacking on phone (≤480px width)

---

## 6. Development Commands

### Installation

```bash
# Clone repository
git clone https://github.com/cazuffi/emailamerketing.git
cd emailamerketing

# Install dependencies
npm install

# Creates node_modules/ with all required packages
# Production dependencies: express, better-sqlite3, bcryptjs, express-session, cheerio
# Dev dependencies: chokidar (file watching)
```

### CLI Workflow Commands

```bash
# Browse all 58 modules in browser
npm run preview -- catalog

# Create new campaign folder with shell
npm run new -- my-campaign-slug
# Creates: campaigns/YYYY-MM-my-campaign-slug/
#   - source.html (shell with @include directives)
#   - notes.md (checklist)
#   - subject-lines.md (subject line options)

# Add modules to campaign
npm run add -- my-campaign-slug hero-split icon-grid-four cta-primary-center
# Appends @include directives to source.html

# List all module IDs in terminal
npm run list

# Build all campaigns (generates email.html files)
npm run build
# Processes all campaigns/*/source.html
# Outputs campaigns/*/email.html

# Preview specific campaign in browser
npm run preview -- my-campaign-slug
# Starts HTTP server on port 4173
# Opens browser automatically
# Watches for file changes, rebuilds on save

# Run email validation tests
npm test
# Executes scripts/audit-email.js
# Validates HTML structure, D365 compatibility
# Fails build if critical issues found
```

### Visual Studio Commands

```bash
# Start Visual Studio server
npm run studio
# Starts Express server on port 3000 (configurable via PORT env var)
# Creates SQLite database if doesn't exist (studio/data/studio.db)
# Seeds admin user from ADMIN_EMAIL and ADMIN_PASSWORD env vars
# Open http://localhost:3000 in browser

# Default credentials (first run only):
# Email: admin@weidmuller.local
# Password: changeme
# (Change these via ADMIN_EMAIL and ADMIN_PASSWORD environment variables)
```

**Studio Environment Variables:**
```bash
PORT=3000                          # HTTP port (default: 3000)
NODE_ENV=production                # Enable security features for hosted deployment
SESSION_SECRET=<random-hex-string> # Session encryption key (required in production)
ADMIN_EMAIL=admin@company.com      # Initial admin user email
ADMIN_PASSWORD=secure-password     # Initial admin user password
ADMIN_NAME=Admin                   # Initial admin display name
DATA_DIR=./studio/data             # SQLite database directory (default: ./studio/data)
```

### Docker Commands

```bash
# Build Docker image locally
docker build -t email-studio .

# Run container locally
docker run -p 3000:3000 \
  -e SESSION_SECRET=dev-secret \
  -e ADMIN_EMAIL=admin@test.com \
  -e ADMIN_PASSWORD=changeme \
  -e NODE_ENV=development \
  email-studio

# Run with persistent storage (mount volume)
docker run -p 3000:3000 \
  -v $(pwd)/studio/data:/data \
  -e DATA_DIR=/data \
  -e SESSION_SECRET=dev-secret \
  -e ADMIN_EMAIL=admin@test.com \
  -e ADMIN_PASSWORD=changeme \
  email-studio
```

### Git Workflow

```bash
# Check status
git status

# Create feature branch (if needed)
git checkout -b feature/my-changes

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat: add new hero module variant"

# Push to GitHub
git push origin <branch-name>

# IMPORTANT: Pushing to main triggers automatic Azure deployment
# See Section 9 for deployment safety
```

---

## 7. Coding Standards

### JavaScript Conventions

**Style:**
- **ES6+ syntax** where supported (Node.js 18+)
- **CommonJS modules** (`require()` / `module.exports`, not ESM `import`/`export`)
- **No TypeScript** (pure JavaScript)
- **No JSDoc comments** unless truly necessary

**Formatting:**
- **2 spaces** for indentation (consistent across codebase)
- **Single quotes** for strings (exception: HTML attributes use double quotes)
- **Semicolons** (not optional)
- **Descriptive variable names** (`campaignDir`, not `cd`)

**Example:**
```javascript
const fs = require('fs');
const path = require('path');

function buildEmail(sourcePath, outputPath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const assembled = assembleFromSource(source);
  fs.writeFileSync(outputPath, assembled);
  return path.relative(ROOT, outputPath);
}
```

### File Organization

**Scripts:**
- One primary function per script file
- Helper functions in `scripts/lib.js` if shared
- Descriptive filenames (`build.js`, `assemble.js`, `new-campaign.js`)

**Modules:**
- One module per HTML file
- Filename matches module ID (e.g., `hero-split.html` → ID: `hero-split`)
- Module metadata in `components/modules/manifest.json`

**Studio:**
- Server logic in `studio/server.js`
- Database operations in `studio/db.js`
- Authentication in `studio/auth.js`
- Frontend in `studio/public/app.js` (single file, no build step)

### HTML Conventions

**Email Modules:**
- Self-contained HTML fragments (no `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>`)
- Inline critical styles
- Semantic CSS class names (`.hero-split-section`, `.stat-stack`)
- Comments for editable regions
- Placeholders for images/text that users will customize

**Example Module Structure:**
```html
<!-- hero-split.html -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" 
       class="hero-split-section" style="width:100%;max-width:640px;">
  <tr>
    <td class="hero-split-text" style="width:50%;padding:20px;">
      <h1 style="color:#ef7800;font-size:22px;">Headline</h1>
      <p>Body text</p>
    </td>
    <td class="hero-split-image" style="width:50%;">
      <img src="https://..." alt="Hero image" width="300" style="width:100%;max-width:300px;">
    </td>
  </tr>
</table>
```

### CSS Conventions

**Critical CSS:** Inline on elements
**Enhancement CSS:** In `<style>` block in `<head>`

**Naming:**
- BEM-like: `.module-name-section`, `.module-name-element`
- Descriptive: `.stat-stack`, `.hero-split-text`, `.cta-button-wrapper`

**Media Queries:**
- Mobile breakpoint: `@media (max-width: 480px)`
- Desktop restoration: `@media (min-width: 481px)` (for Gmail web pane)

### Comments

**Use sparingly.** Code should be self-explanatory through naming.

**When to comment:**
- Non-obvious D365 workarounds
- Complex email rendering hacks
- Business logic that isn't clear from code alone

**Don't comment:**
- Obvious operations (`// Read file`, `// Parse JSON`)
- Function signatures (use descriptive names instead)
- Implementation changes (use Git history)

**Good:**
```javascript
// Strip data-editorblocktype to prevent Dynamics from flattening button tables
html = html.replace(/\s*data-editorblocktype="[^"]*"/gi, '');
```

**Bad:**
```javascript
// Loop through campaigns
for (const campaign of campaigns) {
  // Build the email
  buildEmail(campaign);
}
```

### Agent Responsibilities

When modifying code:

1. **Read existing implementation first** before making changes
2. **Preserve backward compatibility** (existing emails must still build)
3. **Reuse existing utilities** (`scripts/lib.js`, `scripts/assemble.js`)
4. **Match existing patterns** (don't introduce new conventions)
5. **Test changes** (`npm test`, `npm run build`, `npm run preview`)
6. **Update manifest.json** when adding/removing modules
7. **Update documentation** if behavior changes significantly
8. **No unnecessary dependencies** (keep `package.json` minimal)

### Avoid

- ❌ Breaking changes to existing modules
- ❌ Changing brand colors without explicit approval
- ❌ Altering D365 compatibility patterns without verification
- ❌ Adding frontend frameworks (React, Vue, Angular)
- ❌ Adding build tools (webpack, Vite, Babel)
- ❌ Converting to TypeScript
- ❌ Changing from CommonJS to ESM
- ❌ Modifying SQLite schema without migration

---

## 8. Database and Data Safety

### SQLite Configuration

**Database Path:**
- **Local development:** `studio/data/studio.db` (relative to repository root)
- **Docker:** `/data/studio.db` (configured via `DATA_DIR=/data` in Dockerfile)

**Path is configurable:**
```javascript
// studio/db.js
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'studio.db');
```

**Journal Mode:** WAL (Write-Ahead Logging)
```javascript
db.pragma('journal_mode = WAL');
```

**Files Created:**
- `studio.db` - Main database file
- `studio.db-wal` - Write-ahead log (transaction journal)
- `studio.db-shm` - Shared memory index (WAL coordination)

**All 3 files** must be backed up together for consistent snapshots.

### Database Initialization

**Automatic:** Database created on first `npm run studio` launch

**Schema Creation:** `studio/db.js` function `initSchema()`

**Admin User Seeding:**
- Runs only if `users` table is empty
- Uses environment variables:
  - `ADMIN_EMAIL` (default: `admin@weidmuller.local`)
  - `ADMIN_PASSWORD` (default: `changeme`)
  - `ADMIN_NAME` (default: `Admin`)
- Password is bcrypt hashed (salt rounds: 10)

**Schema Migrations:**
- Handled in `studio/db.js` function `migrateSchema()`
- Checks for missing columns, adds them if needed
- Non-destructive (never drops data)

### Data Persistence

**CRITICAL FACTS:**

1. **Database is NOT in Git**
   - Excluded by `.gitignore`: `studio/data/`
   - Contains user PII (emails, names)
   - Contains user passwords (hashed, but still sensitive)

2. **Database is NOT in Docker image**
   - Dockerfile declares `VOLUME /data` (expects external mount)
   - Without Azure Files mount, database is ephemeral (lost on redeploy)

3. **Campaigns in database are NOT backed up automatically**
   - No built-in backup mechanism in application code
   - Must be backed up manually or via Azure Files snapshots

4. **CLI campaigns ARE in Git**
   - `campaigns/*/source.html` files are Git-tracked
   - CLI workflow is safer for long-term preservation

### Persistence Verification

**How to check if database is persistent:**

1. Create test campaign in Studio
2. Restart server (`Ctrl+C`, `npm run studio`)
3. Check if test campaign still exists
4. If YES → persistent (probably using Azure Files)
5. If NO → ephemeral (using container storage, data lost on redeploy)

**Azure Deployment:**
- Requires Azure Files mount at `/data` path
- Configured in Azure Portal → App Service → Configuration → Path mappings
- If NOT configured: Database recreated empty on every deployment

### Backup Strategies

**Option A: Export to CLI format**
```bash
# For each important campaign in Studio:
1. Open campaign in browser
2. Click "Copy HTML"
3. Create campaigns/YYYY-MM-name/ folder
4. Create source.html with @include directives
5. Paste HTML into email.html
6. git add, git commit, git push
```

**Option B: Download database file**
```bash
# Local:
cp studio/data/studio.db ~/backups/studio-$(date +%Y-%m-%d).db

# Azure (via Azure Portal):
# Storage Account → File shares → Download studio.db
```

**Option C: Export as JSON**
```bash
# Download studio.db, then:
sqlite3 studio.db <<EOF
.mode json
.output campaigns-backup.json
SELECT * FROM campaigns;
EOF
```

### AI Agent Safety Rules

**NEVER:**

- ❌ Delete or overwrite `studio/data/studio.db` without explicit user approval
- ❌ Assume SQLite files are stored in Git (they are NOT)
- ❌ Run `DROP TABLE` or `DELETE FROM` without explicit user approval
- ❌ Modify production database schema without migration
- ❌ Commit `studio.db` or `studio/data/` to Git (contains user PII)
- ❌ Assume database is persistent (verify Azure Files mount first)
- ❌ Change database path without updating all references

**ALWAYS:**

- ✅ Verify database location before operations (`DATA_DIR` env var)
- ✅ Preserve existing user accounts during schema changes
- ✅ Preserve existing campaigns during schema changes
- ✅ Test migrations on backup database before applying to production
- ✅ Recommend CLI workflow for critical campaigns (Git-backed)
- ✅ Warn user about data loss risks if Azure Files not mounted
- ✅ Check for pending WAL transactions before backup

**Before destructive database operations:**
1. Ask user for explicit approval
2. Verify backup exists
3. Test on copy first
4. Document what will be lost

---

## 9. Deployment and Security

### GitHub Actions Workflow

**File:** `.github/workflows/main_wmemail.yml`

**Triggers:**
- Push to `main` branch (ANY commit, including documentation)
- Manual dispatch via GitHub Actions UI

**Process:**
1. Checkout code
2. Build Docker image
3. Push to Azure Container Registry (`wmemailacr.azurecr.io/wmemail:${SHA}`)
4. Deploy to Azure Web App (`wmemail`)

**CRITICAL:** Every push to `main` triggers deployment, even documentation-only commits.

**Target:** Azure Web App
- **App Name:** `wmemail`
- **Slot:** Production
- **Expected URL:** `https://wmemail.azurewebsites.net`

**Secrets (stored in GitHub):**
- `AZUREAPPSERVICE_CONTAINERUSERNAME_*` - Container registry username
- `AZUREAPPSERVICE_CONTAINERPASSWORD_*` - Container registry password
- `AZUREAPPSERVICE_CLIENTID_*` - Azure service principal client ID
- `AZUREAPPSERVICE_TENANTID_*` - Azure tenant ID
- `AZUREAPPSERVICE_SUBSCRIPTIONID_*` - Azure subscription ID

### Environment Variables

**Never commit:**
- `.env` file (contains secrets)
- `SESSION_SECRET` value
- `ADMIN_PASSWORD` value
- Database files
- Azure credentials

**Template provided:** `.env.example` (safe to commit)

**Required in Production (Azure):**
```bash
NODE_ENV=production                      # Enable security features
SESSION_SECRET=<random-32-byte-hex>      # openssl rand -hex 32
ADMIN_EMAIL=admin@company.com            # Initial admin user
ADMIN_PASSWORD=<strong-password>         # Initial admin password
DATA_DIR=/data                           # Database storage path
PORT=3000                                # HTTP port (Azure default)
WEBSITES_PORT=3000                       # Azure-specific port variable
```

### Dockerfile Configuration

**Base Image:** `node:22-slim`

**Build Dependencies:**
```dockerfile
RUN apt-get update && apt-get install -y python3 make g++
```
**Why:** `better-sqlite3` requires native compilation

**Working Directory:** `/app`

**Volume:** `/data` (database storage)

**Exposed Port:** 3000

**Entry Point:** `node studio/server.js`

**Environment:**
- `NODE_ENV=production`
- `DATA_DIR=/data`
- `PORT=3000`

### Security Best Practices

**For AI Agents:**

1. **Never log or expose secrets**
   - Do not `console.log()` environment variables
   - Do not include credentials in error messages
   - Do not commit `.env` file

2. **Never modify production without approval**
   - Ask before pushing to `main` branch
   - Ask before changing database schema
   - Ask before modifying GitHub Actions workflow

3. **Verify before deployment**
   - Run `npm test` before pushing
   - Run `npm run build` to verify compilation
   - Check `git diff` before committing

4. **Recognize deployment triggers**
   - Pushing to `main` → Automatic Azure deployment
   - Documentation changes → Also trigger deployment (no path filters)
   - Feature branches → Safe (no automatic deployment)

5. **Never assume deployment success**
   - Successful `git push` ≠ successful production deployment
   - Check Azure Portal or logs to verify
   - Test production URL after deployment

**For Users:**

- Change default `ADMIN_PASSWORD` immediately
- Use strong `SESSION_SECRET` (32+ random bytes)
- Enable HTTPS (Azure provides this automatically)
- Restrict GitHub repository access (private repo recommended)
- Limit Azure service principal permissions (Contributor on resource group only)
- Enable Azure Files snapshots for database backups

### Deployment Checklist

**Before Pushing to main:**

- [ ] Run `npm test` → All tests pass
- [ ] Run `npm run build` → All campaigns build successfully
- [ ] Check `git status` → Only intended files staged
- [ ] Review `git diff` → No secrets or sensitive data
- [ ] Verify branch: `git branch` → On correct branch
- [ ] Confirm no database files in commit: `git diff --cached | grep studio.db`

**After Pushing:**

- [ ] Monitor GitHub Actions → Check build and deploy status
- [ ] Wait for deployment to complete (~5-10 minutes)
- [ ] Test production URL → Verify application works
- [ ] Check Azure logs if issues → App Service → Log stream
- [ ] Verify database persistence → Test campaigns still exist

**If Deployment Fails:**

1. Check GitHub Actions logs for error messages
2. Check Azure Web App logs: Portal → App Service → Diagnose and solve problems
3. Verify environment variables set in Azure: Configuration → Application settings
4. Verify Azure Files mount configured: Configuration → Path mappings
5. Roll back if necessary: Redeploy previous working image

---

## 10. AI Agent Operating Instructions

### Before You Start

**Required Reading:**
1. This document (AGENTS.md) - Complete overview
2. `docs/D365_EMAIL_GUIDELINES.md` - Email HTML rules (16KB, critical)
3. `README.md` - Quick start guide
4. Relevant code in files you'll modify

**Initial Verification:**
```bash
# Verify environment
node --version    # Should be 18+
npm --version     # Should be 9+
git status        # Clean working tree preferred

# Understand current state
npm install       # Install dependencies
npm run build     # Verify build works
npm test          # Verify tests pass
npm run list      # See available modules
```

### Decision Framework

**When to proceed autonomously:**
- Small bug fixes (typos, broken links, missing alt text)
- Adding new email modules following existing patterns
- Updating documentation
- Refactoring without changing behavior
- Performance improvements with no user-facing changes

**When to ask for clarification:**
- Ambiguous requirements
- Changes affecting D365 compatibility
- Modifying brand colors or typography
- Changes to database schema
- Deployment configuration changes
- Removing existing modules or campaigns
- Breaking changes to CLI commands
- Security-sensitive modifications

### Operating Principles

**1. Read first, code second**

Before modifying any file:
- Read the file completely
- Understand its purpose in the system
- Identify all code that calls this file
- Check if tests exist for this functionality

**2. Explain before executing**

For significant changes:
- Describe what you plan to change
- Explain why the change is necessary
- List affected files
- Identify potential risks
- Wait for user approval if uncertain

**3. Make focused changes**

- Change one thing at a time
- Avoid broad refactors unless explicitly requested
- Don't "improve" code that's working correctly
- Preserve existing functionality

**4. Test your changes**

After every modification:
```bash
npm run build     # Verify build still works
npm test          # Verify tests still pass
npm run preview -- catalog  # Visual verification
```

For Studio changes:
```bash
npm run studio    # Start server
# Manually test affected features in browser
```

**5. Document what changed**

In commit messages:
- Describe WHAT changed (not just "fix bug")
- Explain WHY (not just "improve performance")
- List affected files or modules
- Note any breaking changes

Example:
```
feat: add hero-product module with image overlay

- Created components/modules/hero-product.html
- Added entry to components/modules/manifest.json
- Added D365-compatible overlay pattern
- Tested with Outlook Desktop and Gmail

Closes #42
```

### Specific Task Guidelines

#### Adding a New Email Module

**Required Steps:**

1. **Create module file:** `components/modules/your-module-id.html`
   - Follow table-based layout pattern
   - Include inline critical styles
   - Add semantic CSS class names
   - Test in isolation with `npm run preview -- catalog`

2. **Update manifest:** Add entry to `components/modules/manifest.json`
   ```json
   {
     "id": "your-module-id",
     "file": "your-module-id.html",
     "category": "Feature",
     "description": "Brief description of module purpose"
   }
   ```

3. **Test thoroughly:**
   - Add to test campaign: `npm run add -- test-campaign your-module-id`
   - Build: `npm run build`
   - Preview: `npm run preview -- test-campaign`
   - Validate: `npm test`
   - Test in D365 (paste email.html, send test email)

4. **Document:** Update `docs/modules.md` if significant

#### Modifying Build Scripts

**High Risk Area:** Changes can break all existing campaigns.

**Required:**
1. Read `scripts/assemble.js` completely
2. Understand include resolution mechanism
3. Test with multiple campaigns
4. Run full test suite: `npm test`
5. Verify output matches previous version (for unchanged campaigns)
6. Document behavior changes

**Do NOT:**
- Change `@include` directive syntax
- Break backward compatibility with existing campaigns
- Remove CSS pruning without approval
- Disable D365 hardening steps

#### Modifying Studio Database

**Extreme Risk Area:** Data loss possible.

**Before schema changes:**
1. Document current schema
2. Backup database: `cp studio/data/studio.db backup.db`
3. Write migration in `studio/db.js` → `migrateSchema()`
4. Test migration on backup database
5. Verify existing campaigns still load
6. Verify existing users can still log in

**Migration Pattern:**
```javascript
function migrateSchema(database) {
  const cols = database.prepare('PRAGMA table_info(campaigns)').all()
    .map((c) => c.name);
  
  if (!cols.includes('new_column')) {
    database.exec(`ALTER TABLE campaigns ADD COLUMN new_column TEXT DEFAULT 'default_value'`);
  }
}
```

**Never:**
- `DROP TABLE` without explicit approval
- `DELETE FROM` without explicit approval
- Change column types (SQLite limitations)
- Remove columns (breaks backward compatibility)

#### Updating Dependencies

**Security Updates:** Generally safe, but test thoroughly.

**Major Version Updates:** High risk, avoid unless necessary.

**Process:**
```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Test everything
npm install
npm run build
npm test
npm run studio  # Manual testing

# Commit lockfile
git add package.json package-lock.json
git commit -m "chore: update package-name to vX.Y.Z"
```

**Critical Dependencies:**
- `better-sqlite3` - Database driver (native module, requires rebuild)
- `express` - HTTP server (API compatibility critical)
- `cheerio` - HTML parser (must handle email HTML correctly)

### Error Handling

**When you encounter errors:**

1. **Read the error message completely**
   - Error messages contain valuable diagnostic information
   - Stack traces show where the error occurred

2. **Check recent changes**
   - Use `git diff` to see what changed
   - Use `git log` to see recent commits
   - Consider reverting recent changes if breaking

3. **Reproduce the error**
   - Document exact steps to reproduce
   - Identify minimal failing case
   - Test if error exists in clean clone

4. **Report clearly**
   - Share complete error message
   - Share steps to reproduce
   - Share relevant code snippets
   - Propose solution if known

**Common Issues:**

**"Module not found"**
- Run `npm install`
- Check `require()` path is correct
- Verify file exists at that path

**"EADDRINUSE" (port 3000 in use)**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 npm run studio
```

**"Database locked"**
- SQLite WAL mode should prevent this
- Check if another process has database open
- Wait a few seconds and retry

**"Permission denied"**
- Check file permissions: `ls -la`
- Check directory permissions
- Verify you're not trying to write to system directories

### Reporting Changes

**After completing work, report:**

1. **What changed:**
   - Files modified
   - New files created
   - Files deleted

2. **Why it changed:**
   - User request summary
   - Problem being solved
   - Improvement being made

3. **How to verify:**
   - Commands to test changes
   - Expected output
   - Visual verification steps (if applicable)

4. **Risks and limitations:**
   - Known issues or edge cases
   - Areas not tested
   - Potential breaking changes
   - Follow-up work needed

**Example Report:**

```
Completed: Add hero-gradient module with text overlay

Changes:
- Created components/modules/hero-gradient.html
- Updated components/modules/manifest.json
- Added gradient background pattern (D365-compatible)

Testing performed:
- npm test → All tests pass
- npm run build → Builds successfully
- npm run preview -- catalog → Visual verification
- Tested module in campaigns/test-gradient/

Verification commands:
npm run add -- test-gradient hero-gradient
npm run build
npm run preview -- test-gradient

Known limitations:
- Gradient may not render in Outlook 2007-2010 (uses solid fallback)
- Text overlay requires good contrast (document in module description)

Recommendation:
Test in D365 with real send before using in production campaign.
```

---

## 11. Future Development Handoff

### Starting Fresh Without Cursor

This section explains how a new AI coding assistant (ChatGPT, Claude, GitHub Copilot, etc.) can take over development of this application months or years from now, without access to Cursor or its conversation history.

### Prerequisites

**Required Software:**
- Git (version control)
- Node.js 18+ (JavaScript runtime)
- npm (package manager, comes with Node.js)
- Text editor (VS Code, Sublime, Vim, etc.)

**Optional Software:**
- Docker (for containerized deployment)
- Azure CLI (for cloud deployment)
- DB Browser for SQLite (for database inspection)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/cazuffi/emailamerketing.git
cd emailamerketing

# 2. Verify Node.js version
node --version
# Should output: v18.x.x or v22.x.x

# 3. Install dependencies
npm install
# Installs ~50MB of packages to node_modules/

# 4. Verify installation
npm run build
# Should build all campaigns successfully

npm test
# Should pass all email validation tests

npm run preview -- catalog
# Should open browser with module catalog
```

**Success Indicators:**
- No error messages during `npm install`
- `node_modules/` directory created (~50MB)
- `npm run build` completes without errors
- `npm test` shows all tests passing
- Browser opens with module catalog

**If issues occur:**
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Check Node.js version is 18+
- Verify internet connection (downloads packages from npm registry)

### Understanding the Codebase

**Day 1: Read Documentation**
1. This file (AGENTS.md) - Complete overview
2. README.md - Quick start guide
3. docs/D365_EMAIL_GUIDELINES.md - Email HTML rules (critical)
4. docs/workflow.md - Development workflow
5. package.json - Available commands and dependencies

**Day 2: Explore Code**
```bash
# See all available commands
npm run

# List all email modules
npm run list

# Browse modules visually
npm run preview -- catalog

# Examine a real campaign
cat campaigns/2026-07-sales-ignitor-rockstar/source.html
cat campaigns/2026-07-sales-ignitor-rockstar/email.html
```

**Day 3: Run Visual Studio**
```bash
# Start Studio server
npm run studio

# Open browser to http://localhost:3000
# Default credentials:
# - Email: admin@weidmuller.local
# - Password: changeme

# Explore the UI:
# - Browse modules (left panel)
# - Create test campaign
# - Drag modules
# - Edit fields
# - Preview
# - Copy HTML
```

**Key Files to Read:**

| Priority | File | Purpose |
|----------|------|---------|
| ★★★ Critical | `docs/D365_EMAIL_GUIDELINES.md` | Email HTML rules |
| ★★★ Critical | `scripts/assemble.js` | Email assembly engine |
| ★★★ Critical | `components/modules/manifest.json` | Module registry |
| ★★ Important | `scripts/build.js` | Build pipeline entry point |
| ★★ Important | `studio/server.js` | Visual Studio API |
| ★★ Important | `brand/tokens.json` | Brand configuration |
| ★ Helpful | `scripts/harden-email.js` | D365 compatibility transforms |
| ★ Helpful | `scripts/prune-css.js` | CSS optimization |
| ★ Helpful | `studio/db.js` | Database operations |

### Making Your First Change

**Low-Risk Exercise: Add a new spacer module**

```bash
# 1. Create module file
cat > components/modules/spacer-xl.html << 'EOF'
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
  <tr>
    <td style="height:80px;line-height:80px;font-size:0;">&nbsp;</td>
  </tr>
</table>
EOF

# 2. Update manifest
# Edit components/modules/manifest.json
# Add entry:
# { "id": "spacer-xl", "file": "spacer-xl.html", "category": "Layout", "description": "Extra large vertical spacer" }

# 3. Test the module
npm run build
npm run preview -- catalog

# 4. Use in a campaign
npm run new -- test-spacer
npm run add -- test-spacer hero-text-only spacer-xl cta-primary-center
npm run build
npm run preview -- test-spacer

# 5. Run validation
npm test

# 6. Commit changes
git add components/modules/spacer-xl.html
git add components/modules/manifest.json
git commit -m "feat: add extra large spacer module"
```

**Success:** Module appears in catalog, builds correctly, passes tests.

### Common Development Tasks

#### Task: Create a new campaign

```bash
npm run new -- my-campaign
npm run add -- my-campaign header-standard hero-split body-bullets cta-primary-center footer
npm run build
npm run preview -- my-campaign
```

#### Task: Modify an existing module

```bash
# 1. Edit the module file
vim components/modules/hero-split.html

# 2. Test with existing campaigns
npm run build
npm test

# 3. Preview changes
npm run preview -- catalog

# 4. Verify in actual campaign
npm run preview -- sales-ignitor

# 5. Commit changes
git add components/modules/hero-split.html
git commit -m "fix: improve mobile stacking in hero-split module"
```

#### Task: Update brand colors

```bash
# 1. Edit brand tokens
vim brand/tokens.json
# Change "primary": "#ef7800" to new color

# 2. Rebuild all campaigns
npm run build

# 3. Visual verification
npm run preview -- catalog

# 4. Test in D365
# Copy campaigns/*/email.html → Paste into D365 → Send test email

# 5. Commit changes
git add brand/tokens.json
git commit -m "chore: update primary brand color to #..."
```

#### Task: Debug a build error

```bash
# 1. Run build with verbose output
npm run build 2>&1 | tee build.log

# 2. Identify failing campaign
# Error message will show file path

# 3. Check syntax
node -c scripts/build.js
node -c scripts/assemble.js

# 4. Test single campaign
node scripts/build.js  # Builds all campaigns
# Or manually:
node -e "
const {buildFile} = require('./scripts/assemble');
buildFile('campaigns/my-campaign/source.html', 'campaigns/my-campaign/email.html');
"

# 5. Check for missing includes
cat campaigns/my-campaign/source.html | grep "@include"
# Verify all referenced files exist
```

### Testing Your Changes

**Before committing:**

```bash
# 1. Verify build succeeds
npm run build

# 2. Run test suite
npm test

# 3. Preview output
npm run preview -- <campaign-name>

# 4. Check for unintended changes
git status
git diff

# 5. Visual Studio (if changed)
npm run studio
# Test affected features manually
```

**Test Matrix:**

| Change Type | Required Tests |
|-------------|---------------|
| New module | `npm test`, `npm run preview -- catalog`, D365 test send |
| Modified module | `npm test`, preview all campaigns using it, D365 test send |
| Build script | `npm test`, build all campaigns, compare outputs |
| Studio UI | `npm run studio`, manual UI testing |
| Studio API | `npm run studio`, test with frontend, check database |
| Database schema | Backup DB, test migration, verify data intact |

### Deployment Process

**Development → Production:**

```bash
# 1. Test locally
npm test
npm run build
npm run studio  # Manual testing

# 2. Commit changes
git add <files>
git commit -m "descriptive message"

# 3. Push to GitHub (triggers deployment if on main branch)
git push origin main

# 4. Monitor deployment
# GitHub: Actions tab → Watch workflow
# Azure: Portal → App Service → Deployment Center

# 5. Verify production
# Open https://wmemail.azurewebsites.net
# Test changed functionality

# 6. Check logs if issues
# Azure Portal → App Service → Log stream
```

**⚠️ IMPORTANT:** Pushing to `main` triggers automatic Azure deployment. Create feature branches for experimental work:

```bash
git checkout -b feature/my-experiment
# Make changes
git add <files>
git commit -m "experiment: trying new approach"
git push origin feature/my-experiment
# No deployment triggered (not on main branch)

# When ready to deploy:
git checkout main
git merge feature/my-experiment
git push origin main  # Now triggers deployment
```

### Working with AI Assistants

**Recommended Workflow:**

1. **Paste AGENTS.md into conversation**
   - Gives AI complete context
   - Explains architecture and constraints
   - Defines safety rules

2. **Share specific code snippets**
   - Don't paste entire 2000-line files
   - Focus on relevant functions
   - Include comments for context

3. **Ask specific questions**
   - Good: "How do I add a new field to the campaign database schema?"
   - Bad: "Improve this code"

4. **Verify AI suggestions**
   - AI may hallucinate features that don't exist
   - Always check proposed changes against actual code
   - Test thoroughly before committing

**Example AI Conversation:**

```
You: I need to add a new email module called "timeline-vertical" that shows 
3-5 milestone items in a vertical timeline layout. It should work in Outlook 
and follow D365 guidelines. How do I implement this?

AI: Based on AGENTS.md section 5, email modules must use table-based layouts...

You: [Reviews AI's HTML suggestion]
This looks good, but I'm concerned about the border-left timeline line. 
Will that render correctly in Outlook Desktop?

AI: You're right to be cautious. According to docs/D365_EMAIL_GUIDELINES.md...

You: [Implements AI's revised suggestion, tests thoroughly]
```

**AI Tools Compatible with This Workflow:**

- **ChatGPT** (web or API): General coding help
- **Claude** (web or API): Excellent for understanding documentation
- **GitHub Copilot**: Inline code suggestions in VS Code
- **Cursor** (if you choose to keep it): Full IDE integration
- **Continue** (VS Code extension): Open-source, bring your own API key

**API-Based Billing Options:**
- OpenAI GPT-4: ~$0.03 per 1K tokens (pay per use)
- Anthropic Claude: ~$0.01 per 1K tokens (pay per use)
- GitHub Copilot: $10/month or $100/year (flat rate)

### Recovering from Mistakes

**Undo uncommitted changes:**
```bash
# Discard changes to single file
git checkout -- path/to/file

# Discard all uncommitted changes
git reset --hard HEAD

# Restore deleted file
git checkout HEAD -- path/to/file
```

**Undo committed changes (not yet pushed):**
```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit, discard changes
git reset --hard HEAD~1

# Undo last 3 commits
git reset --hard HEAD~3
```

**Undo pushed changes:**
```bash
# Revert a specific commit (creates new commit)
git revert <commit-hash>
git push origin main

# Force push (dangerous, avoid if possible)
git reset --hard <good-commit-hash>
git push origin main --force
```

**Database recovery:**
```bash
# Restore from backup
cp backup/studio.db studio/data/studio.db

# Restore from Azure Files snapshot
# Azure Portal → Storage Account → File shares → Snapshots → Restore
```

### Long-Term Maintenance

**Quarterly Tasks:**

- [ ] Update dependencies: `npm update`, test thoroughly
- [ ] Review security advisories: `npm audit`
- [ ] Backup database: Download from Azure or `cp studio/data/studio.db`
- [ ] Review Azure costs: Portal → Cost Management
- [ ] Test all example campaigns: `npm run build`, verify outputs unchanged
- [ ] Review and update documentation if outdated

**Annual Tasks:**

- [ ] Consider Node.js version upgrade (currently 22)
- [ ] Review and remove unused modules
- [ ] Audit codebase for dead code
- [ ] Performance profiling: Build times, Studio responsiveness
- [ ] Security audit: Dependencies, authentication, secrets management

**Signs This Guide Needs Updating:**

- Major version changes to dependencies
- Breaking changes to D365 email rendering
- Changes to Azure deployment architecture
- Addition of new frameworks or build tools
- Significant refactors to core architecture

---

## Appendix: Quick Reference

### File Paths Cheat Sheet

```
Email modules:        components/modules/*.html
Module manifest:      components/modules/manifest.json
Brand configuration:  brand/tokens.json
Build script:         scripts/build.js
Assembly engine:      scripts/assemble.js
Studio server:        studio/server.js
Studio database:      studio/data/studio.db (local) or /data/studio.db (Docker)
Campaign example:     campaigns/2026-07-sales-ignitor-rockstar/
Email guidelines:     docs/D365_EMAIL_GUIDELINES.md
GitHub Actions:       .github/workflows/main_wmemail.yml
Environment vars:     .env.example (template, actual .env is gitignored)
```

### Command Cheat Sheet

```bash
npm install                        # Install dependencies
npm run build                      # Build all campaigns
npm run preview -- <campaign>      # Preview campaign in browser
npm run preview -- catalog         # Browse all modules
npm test                           # Run validation tests
npm run studio                     # Start Visual Studio (port 3000)
npm run new -- <slug>              # Create new campaign
npm run add -- <slug> <modules>    # Add modules to campaign
npm run list                       # List all module IDs

git status                         # Check working tree
git diff                           # See uncommitted changes
git log --oneline -10              # Recent commits
git push origin main               # Deploy to Azure (automatic)
```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` or `PORT=3001 npm run studio` |
| Module not found | `npm install` |
| Database locked | Wait and retry, or restart Studio |
| Build fails | Check error message, verify all `@include` paths exist |
| Tests fail | Read test output, fix reported issues, run `npm test` again |
| Deploy fails | Check GitHub Actions logs, verify Azure configuration |
| Changes not in D365 | Did you copy the **built** `email.html` (not `source.html`)? |
| Campaigns disappeared | Check if database is persistent (Azure Files mount) |

### Critical Safety Reminders

- ✅ Read AGENTS.md before starting
- ✅ Test changes with `npm test` and `npm run build`
- ✅ Never commit secrets or database files
- ✅ Verify Azure Files mount before assuming database is safe
- ✅ Pushing to `main` triggers automatic deployment
- ✅ Backup database before schema changes
- ✅ Follow D365 email guidelines (no divs, tables only)
- ✅ Preserve backward compatibility with existing campaigns

---

**Document Version:** 1.0.0  
**Last Updated:** October 18, 2026  
**Maintained By:** Repository contributors  
**License:** Private (not open source)

**For questions or clarifications, refer to:**
- This document (AGENTS.md)
- docs/D365_EMAIL_GUIDELINES.md
- README.md
- GitHub Issues (if repository is private, contact repository owner)

**This document is designed to be self-sufficient. Future AI coding assistants should be able to understand and maintain this application using only the information in this file and the actual code in the repository.**
