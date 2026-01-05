# i18n-cli

A practical i18n maintenance CLI for front-end repositories.

It helps you:
- **Scan** code usage vs. locale JSON files
- Detect **Missing** keys (used in code but absent in locale files)
- Detect **Unused** keys (present in locale files but not used in code)
- **Safely fix** issues (create missing keys, delete unused keys, align locale structures)
- **Import** translations from **Google Sheets** or **.xlsx**
- (Optional) **Export** locale JSON back to Google Sheets (if enabled in your build)

> Designed for real-world teams: dry-run first, safe deletes, and predictable output.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Conventions](#project-conventions)
- [Commands](#commands)
  - [scan](#scan)
  - [import](#import)
  - [export](#export)
- [How It Works](#how-it-works)
- [Sample: Before & After](#sample-before--after)
- [Google Sheets Setup](#google-sheets-setup)
- [CI / Automation Ideas](#ci--automation-ideas)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Install

Use `npx` (no install):

```bash
npx i18n-cli scan
```

Or install as a dev dependency:

```bash
pnpm add -D i18n-cli
# or npm i -D i18n-cli
# or yarn add -D i18n-cli
```

Then run:

```bash
pnpm i18n-cli scan
# or npx i18n-cli scan
```

---

## Project Conventions

`i18n-cli` assumes:

- Your locale files are JSON under:

```
./locales/
  en.json
  ko.json
  ja.json
  ...
```

- Your code uses translation keys like:

```ts
t("home.title")
t("profile.logout.button")
```

If your project uses a different `t()` function name or different patterns, you can extend the scanner in your fork (or add a custom scanner later).

---

## Commands

Run `npx i18n-cli --help` for the latest options.

### scan

Scan your repository and report i18n status.

```bash
npx i18n-cli scan
```

#### Most used options

- `--lang <code>`: base locale language (default: `en`)
- `--md`: print Markdown report and save to `i18n-report.md` (unless `--no-save`)
- `--json`: print JSON report and save to `i18n-report.json` (unless `--no-save`)
- `--no-save`: do not save reports (works with `--md` / `--json`)
- `--check-consistency`: verify all locale structures are aligned
- `--delete-unused`: delete unused keys (**safe unused only**, if enabled)
- `--create-missing`: create missing keys with an empty placeholder
- `--fix-structure`: align locale structures
- `--locale <code>`: apply modifications to only one locale (default: all)
- `--dry-run`: simulate changes only (recommended first)
- `--backup`: backup locale files before writing
- `--no-confirm`: do not ask before applying changes

#### Examples

Base locale `en`, print pretty output:

```bash
npx i18n-cli scan --lang en
```

Generate Markdown report without saving:

```bash
npx i18n-cli scan --md --no-save
```

Create missing keys across **all locales**, but do not write:

```bash
npx i18n-cli scan --create-missing --dry-run
```

Delete safe unused keys and apply changes:

```bash
npx i18n-cli scan --delete-unused
```

> Tip: Prefer **dry-run first** before writing changes.

---

### import

Import translations into `./locales/*.json` from either `.xlsx` or Google Sheets.

#### Import from XLSX

```bash
npx i18n-cli import --file ./translations.xlsx
```

Options:
- `--file <path>`: path to `.xlsx`
- `--override`: replace existing translations
- `--dry-run`: preview only
- `--locales-dir <path>`: target locales folder (default `./locales`)

#### Import from Google Sheets

```bash
npx i18n-cli import --sheet <SPREADSHEET_ID> --sheet-name <TAB_NAME>
```

Common options:
- `--sheet <id>`: Google spreadsheet id
- `--sheet-name <name>`: sheet tab name (e.g. `Translations`)
- `--cred <path>`: service account credentials JSON path  
  (default example: `./credentials/google-service-account.json`)
- `--dry-run`: preview only
- `--override`: replace existing translations
- `--locales-dir <path>`: target locales folder (default `./locales`)

Example:

```bash
npx i18n-cli import \
  --sheet 1L7h7Ra3hrOrp5MW7_uWV6ANNrBF0b9CgSfJ9hXy7D7w \
  --sheet-name Translations \
  --cred ./credentials/google-service-account.json
```

---

### export

If your build includes `export` (optional), you can export locale JSON to Google Sheets.

```bash
npx i18n-cli export --sheet <SPREADSHEET_ID> --sheet-name <TAB_NAME>
```

Typical options:
- `--sheet <id>`
- `--sheet-name <tab>`
- `--cred <path>`
- `--dry-run`
- `--locales-dir <path>`

---

## How It Works

### Key concepts

- **Base locale**: the “source of truth” structure (usually `en`)
- **Missing keys**: keys used in code but missing in one or more locales
- **Unused keys**: keys present in locale files but not referenced in code

### What gets scanned

- `./locales/*.json` are loaded and flattened to dot-keys:
  - `{"home":{"title":"Welcome"}}` → `home.title`
- Code scanner searches for patterns like:
  - `t("...")`, `i18n.t("...")`, etc. (depends on your implementation)

---

## Sample: Before & After

### Example locale files

`locales/en.json`

```json
{
  "home": {
    "title": "Welcome",
    "button": { "ok": "OK" }
  },
  "profile": {
    "logout": { "button": "Logout" }
  },
  "settings2": {
    "notification": { "enabled": "On" }
  }
}
```

`locales/ko.json`

```json
{
  "home": {
    "title": "환영합니다"
  }
}
```

### Example code

```ts
function example() {
  t("home.title");
  t("profile.logout.button");
  t("settings.notification.enabled");
}
```

### Run scan

```bash
npx i18n-cli scan --lang en
```

Example findings:
- **Missing (per-locale)**: `profile.logout.button` missing in `ko`, `settings.notification.enabled` missing in multiple
- **Unused (locale-only)**: `home.button.ok`, `settings2.notification.enabled`

### Fix structure & create missing (dry-run first)

```bash
npx i18n-cli scan --fix-structure --create-missing --dry-run
```

Then apply:

```bash
npx i18n-cli scan --fix-structure --create-missing
```

After (example result):

`locales/ko.json`

```json
{
  "home": {
    "title": "환영합니다",
    "button": { "ok": "" }
  },
  "profile": {
    "logout": { "button": "" }
  },
  "settings": {
    "notification": { "enabled": "" }
  }
}
```

---

## Google Sheets Setup

### 1) Create a Google Cloud project & service account

- Create a **Service Account** in Google Cloud Console
- Create a **JSON key** and save it (e.g. `./credentials/google-service-account.json`)

### 2) Share the sheet with the service account email

Open the spreadsheet → **Share** → add:
- `client_email` from your credentials JSON

Give it **Viewer** for import, and **Editor** for export.

### 3) Sheet format

Recommended header:

| key | en | ko | ja |
|---|---|---|---|
| home.title | Welcome | 환영합니다 | ようこそ |

Notes:
- First column is the key (dot format)
- Languages can be any codes (`en`, `ko`, `ja`, ...)

If your sheet has extra header rows, the importer should locate the header row containing `key` + language columns.

---

## CI / Automation Ideas

- Run `scan --json` on PR and upload `i18n-report.json` as an artifact
- Fail CI if missing keys exceed a threshold
- Use `--dry-run` in CI; apply fixes via a separate “fix PR” job

---

## Troubleshooting

### “Google credentials file not found”
Provide credentials:

```bash
npx i18n-cli import --sheet <ID> --cred ./credentials/google-service-account.json
```

### “Unable to parse range”
Your sheet tab name is wrong:

```bash
npx i18n-cli import --sheet <ID> --sheet-name <TAB_NAME>
```

### “No locale files found”
Ensure:
- `./locales` exists
- files are named like `en.json`, `ko.json`

---

## License

MIT
