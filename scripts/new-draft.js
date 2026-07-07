#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TEMPLATES = {
  newsletter: 'templates/newsletter/weekly-update.mjml',
  promo: 'templates/promo/product-launch.mjml',
  welcome: 'templates/transactional/welcome.mjml',
};

const SUBJECT_LINES = `# Subject line options

- [ ] Option 1 — edit me
- [ ] Option 2 — edit me
- [ ] Option 3 — edit me

# Preheader

Short preview text that appears after the subject in the inbox.
`;

const NOTES = `# Campaign notes

- **Audience:**
- **Goal:**
- **Send date:**
- **ESP:** (Mailchimp, SendGrid, etc.)

## Feedback / iterations

- 
`;

function printUsage() {
  console.log(`
Create a new email draft from a template.

Usage:
  npm run new-draft -- <slug> [template]

Arguments:
  slug      Folder name, e.g. "summer-sale" (date prefix added automatically)
  template  newsletter | promo | welcome  (default: newsletter)

Examples:
  npm run new-draft -- summer-sale promo
  npm run new-draft -- welcome-series welcome

Templates:
  newsletter  Weekly newsletter layout
  promo       Product launch / sale email
  welcome     Onboarding welcome email
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

  fs.mkdirSync(draftDir, { recursive: true });
  fs.copyFileSync(sourceFile, path.join(draftDir, 'email.mjml'));
  fs.writeFileSync(path.join(draftDir, 'subject-lines.md'), SUBJECT_LINES);
  fs.writeFileSync(path.join(draftDir, 'notes.md'), NOTES);

  console.log(`Created draft: drafts/${folderName}/`);
  console.log('  - email.mjml');
  console.log('  - subject-lines.md');
  console.log('  - notes.md');
  console.log(`\nPreview:  npm run preview -- ${folderName}`);
  console.log(`Build:    npm run build`);
}

main();
