#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TEMPLATES = {
  newsletter: 'templates/newsletter/weekly-update.mjml',
  promo: 'templates/promo/product-launch.mjml',
  welcome: 'templates/transactional/welcome.mjml',
  event: 'templates/event/invitation.mjml',
};

const PRESETS = {
  newsletter: {
    subjectLines: `# Subject line options

- [ ] {{headline}} — your weekly update
- [ ] What's new this week from Weidmüller
- [ ] [Newsletter] {{headline}}

# Preheader

Catch up on the latest news, products, and insights.
`,
    notes: `# Campaign notes

- **Campaign type:** Newsletter
- **Audience / segment:**
- **Goal:** Drive engagement with regular content updates
- **Send date:**
- **Platform:** Dynamics 365 Customer Insights — Journeys
- **D365 template:** WM_newsletter
- **Customer Journey:**
- **Content Settings:**

## Recommended D365 blocks

WM_header → WM_intro → WM_body → WM_divider → WM_body → WM_cta_button → WM_footer

## D365 checklist

- [ ] Start from WM_newsletter template or build from blocks
- [ ] HTML imported (if dev handoff)
- [ ] Check content passes
- [ ] Preview and Test (desktop + mobile)
- [ ] Subject + preheader set in D365
- [ ] Journey live with correct Content Settings

## Feedback / iterations

- 
`,
  },
  promo: {
    subjectLines: `# Subject line options

- [ ] Introducing {{product_name}} — {{key_benefit}}
- [ ] {{headline}} | Weidmüller
- [ ] Don't miss: {{offer_text}}

# Preheader

{{subheadline}} — learn more and request a demo.
`,
    notes: `# Campaign notes

- **Campaign type:** Promo / product launch
- **Audience / segment:**
- **Goal:** Drive awareness and demo/sample requests
- **Send date:**
- **Platform:** Dynamics 365 Customer Insights — Journeys
- **D365 template:** WM_promo
- **Customer Journey:**
- **Content Settings:**

## Key messages

- 
- 
- 

## Assets to update before send

- [ ] Replace hero image in D365 designer
- [ ] Replace feature block image
- [ ] Confirm CTA links (add tracking UTM params)
- [ ] Verify product page URL

## Recommended D365 blocks

WM_header → WM_hero → WM_intro → WM_body → WM_cta_button → WM_accent_band → WM_feature_block_left → WM_footer

## D365 checklist

- [ ] Start from WM_promo template or build from blocks
- [ ] HTML imported (if dev handoff)
- [ ] Check content passes
- [ ] Preview and Test (desktop + mobile)
- [ ] Subject + preheader set in D365
- [ ] Journey live with correct Content Settings

## Feedback / iterations

- 
`,
  },
  welcome: {
    subjectLines: `# Subject line options

- [ ] Welcome to Weidmüller, {{FirstName}}
- [ ] Getting started with Weidmüller
- [ ] Your Weidmüller onboarding guide

# Preheader

Here's what you need to know to get started.
`,
    notes: `# Campaign notes

- **Campaign type:** Welcome / onboarding
- **Audience / segment:** New contacts / subscribers
- **Goal:** Onboard and set expectations
- **Send date:**
- **Platform:** Dynamics 365 Customer Insights — Journeys
- **D365 template:** WM_welcome
- **Customer Journey:**
- **Content Settings:**

## Recommended D365 blocks

WM_header → WM_intro → WM_body → WM_cta_button → WM_footer

## D365 checklist

- [ ] Start from WM_welcome template
- [ ] Check content passes
- [ ] Preview and Test with sample contacts
- [ ] Subject + preheader set in D365
- [ ] Journey live with correct Content Settings

## Feedback / iterations

- 
`,
  },
  event: {
    subjectLines: `# Subject line options

- [ ] You're invited: {{event_name}}
- [ ] Save the date — {{event_name}} | Weidmüller
- [ ] Join us at {{event_name}} on {{event_date}}

# Preheader

{{event_date}} at {{event_location}} — register today.
`,
    notes: `# Campaign notes

- **Campaign type:** Event / trade show / webinar invitation
- **Audience / segment:**
- **Goal:** Drive registrations and attendance
- **Send date:**
- **Platform:** Dynamics 365 Customer Insights — Journeys
- **D365 template:** WM_event
- **Customer Journey:**
- **Content Settings:**

## Event details

- **Event name:**
- **Date:**
- **Time:**
- **Location / link:**
- **Registration URL:**

## Assets to update before send

- [ ] Replace hero image with event banner
- [ ] Update WM_event_details block (date, time, location, agenda)
- [ ] Confirm RSVP / registration CTA link
- [ ] Add calendar invite link if applicable

## Recommended D365 blocks

WM_header → WM_hero → WM_intro → WM_body → WM_event_details → WM_cta_button → WM_accent_band → WM_footer

## D365 checklist

- [ ] Start from WM_event template or build from blocks
- [ ] HTML imported (if dev handoff)
- [ ] Check content passes
- [ ] Preview and Test (desktop + mobile)
- [ ] Subject + preheader set in D365
- [ ] Journey live with correct Content Settings

## Feedback / iterations

- 
`,
  },
};

function printUsage() {
  console.log(`
Create a new email draft from a template.

Usage:
  npm run new-draft -- <slug> [template]

Arguments:
  slug      Folder name, e.g. "summer-sale" (date prefix added automatically)
  template  newsletter | promo | welcome | event  (default: newsletter)

Examples:
  npm run new-draft -- summer-sale promo
  npm run new-draft -- husum-wind-2026 event
  npm run new-draft -- welcome-series welcome

Templates:
  newsletter  Weekly newsletter layout (D365: WM_newsletter)
  promo       Product launch / sale email (D365: WM_promo)
  welcome     Onboarding welcome email (D365: WM_welcome)
  event       Event / webinar invitation (D365: WM_event)
`);
}

function main() {
  const slug = process.argv[2];
  const templateKey = process.argv[3] || 'newsletter';

  if (!slug || slug === '--help' || slug === '-h') {
    printUsage();
    process.exit(slug ? 0 : 1);
  }

  const templatePath = TEMPLATES[templateKey];
  if (!templatePath) {
    console.error(`Unknown template: ${templateKey}`);
    printUsage();
    process.exit(1);
  }

  const sourceFile = path.join(ROOT, templatePath);
  if (!fs.existsSync(sourceFile)) {
    console.error(`Template file missing: ${templatePath}`);
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 7);
  const folderName = `${date}-${slug.replace(/\s+/g, '-').toLowerCase()}`;
  const draftDir = path.join(ROOT, 'drafts', folderName);

  if (fs.existsSync(draftDir)) {
    console.error(`Draft already exists: drafts/${folderName}`);
    process.exit(1);
  }

  const preset = PRESETS[templateKey] || PRESETS.newsletter;

  fs.mkdirSync(draftDir, { recursive: true });
  fs.copyFileSync(sourceFile, path.join(draftDir, 'email.mjml'));
  fs.writeFileSync(path.join(draftDir, 'subject-lines.md'), preset.subjectLines);
  fs.writeFileSync(path.join(draftDir, 'notes.md'), preset.notes);

  console.log(`Created draft: drafts/${folderName}/`);
  console.log('  - email.mjml');
  console.log('  - subject-lines.md');
  console.log('  - notes.md');
  console.log(`\nTemplate:  ${templateKey} → D365 WM_${templateKey === 'promo' ? 'promo' : templateKey}`);
  console.log(`Preview:   npm run preview -- ${folderName}`);
  console.log(`Build:     npm run build`);
  console.log(`Validate:  npm run validate:d365`);
}

main();
