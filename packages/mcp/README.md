# i18n-mcp

An MCP (Model Context Protocol) server that exposes i18n automation as **AI-callable tools**.

It exposes both **AI-callable tools** and **read-only resources** so an agent can
understand a project's i18n state once per session instead of re-scanning every time.

Use it when you want ChatGPT/Cursor/Claude (or other MCP clients) to:

- **Scan** i18n health
- **Fix** missing/unused keys safely
- **Import / export** translations from Google Sheets
- (Optional) **Create PRs** with changes
- **Read** locale, namespace, and sync-status context as resources

> Published as **`@ddongule/i18n-mcp`**. This package is for AI integrations and
> requires an MCP client setup. If you just want a normal CLI, use **@ddongule/i18n-cli**.

---

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Install](#install)
- [Run Locally](#run-locally)
- [Client Setup](#client-setup)
  - [ChatGPT Desktop](#chatgpt-desktop)
  - [Cursor](#cursor)
  - [Claude Desktop](#claude-desktop)
- [Tools](#tools)
  - [scan_i18n](#scan_i18n)
  - [fix_i18n](#fix_i18n)
  - [import_i18n_from_sheet](#import_i18n_from_sheet)
  - [export_i18n_to_sheet](#export_i18n_to_sheet)
  - [create_i18n_pr](#create_i18n_pr)
- [Resources](#resources)
- [Configuration](#configuration)
- [Recommended Workflows](#recommended-workflows)
- [Google Sheets Credentials](#google-sheets-credentials)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## What is MCP?

MCP is a standard way for AI clients to discover and call local tools.
You run a small “server” process that advertises tools (with JSON schemas),
and the AI client can call them with structured arguments.

In practice:

- You run `i18n-mcp` locally (or in a controlled environment)
- Your MCP client connects to it
- The AI can run tools like `fix_i18n` and read tool results

---

## Install

Use `npx`:

```bash
npx @ddongule/i18n-mcp
```

Or install:

```bash
pnpm add -D @ddongule/i18n-mcp
```

---

## Run Locally

Most MCP clients use stdio transport, so you typically just point the client to:

```bash
npx @ddongule/i18n-mcp
```

---

## Client Setup

### ChatGPT Desktop

Example MCP config:

```json
{
  "mcpServers": {
    "i18n-mcp": {
      "command": "npx",
      "args": ["-y", "@ddongule/i18n-mcp"]
    }
  }
}
```

### Cursor

In Cursor MCP settings:

```json
{
  "mcpServers": {
    "i18n-mcp": {
      "command": "npx",
      "args": ["-y", "@ddongule/i18n-mcp"]
    }
  }
}
```

### Claude Desktop

Example:

```json
{
  "mcpServers": {
    "i18n-mcp": {
      "command": "npx",
      "args": ["-y", "@ddongule/i18n-mcp"]
    }
  }
}
```

> Config locations differ by client/version. The key idea is to run `npx @ddongule/i18n-mcp` via stdio.

---

## Tools

### scan_i18n

Scan the project and report keys that are **missing** from the base locale or
**unused** by the code. Read-only.

**Input**

- `baseLang` (string, default `en`)

**Example**

```json
{ "name": "scan_i18n", "arguments": { "baseLang": "en" } }
```

---

### fix_i18n

Scan and optionally fix locale files.

**Input**

- `baseLang` (string, default `en`)
- `deleteUnused` (boolean, default `false`)
- `createMissing` (boolean, default `false`)
- `fixStructure` (boolean, default `false`)
- `locale` (string, optional)
- `apply` (boolean, default `false`) — when false, behaves like dry-run
- `backup` (boolean, default `false`) — back up locale files before writing (only when `apply=true`)

**Example**

```json
{
  "name": "fix_i18n",
  "arguments": {
    "baseLang": "en",
    "deleteUnused": true,
    "createMissing": true,
    "fixStructure": true,
    "apply": false
  }
}
```

---

### import_i18n_from_sheet

Import translations into `./locales` from Google Sheets.

**Input**

- `sheetId` (string, required)
- `sheetName` (string, default `Sheet1`)
- `dryRun` (boolean, default `false`)

**Example**

```json
{
  "name": "import_i18n_from_sheet",
  "arguments": {
    "sheetId": "1L7h7Ra3hrOrp5MW7_uWV6ANNrBF0b9CgSfJ9hXy7D7w",
    "sheetName": "Translations",
    "dryRun": true
  }
}
```

---

### export_i18n_to_sheet

Export locale JSON files to Google Sheets.

**Input**

- `sheetId` (string, required)
- `sheetName` (string, default `Sheet1`)
- `localesDir` (string, optional; default `./locales`)
- `dryRun` (boolean, default `false`)

**Example**

```json
{
  "name": "export_i18n_to_sheet",
  "arguments": {
    "sheetId": "1L7h7Ra3hrOrp5MW7_uWV6ANNrBF0b9CgSfJ9hXy7D7w",
    "sheetName": "Translations",
    "dryRun": true
  }
}
```

---

### create_i18n_pr

Create a GitHub pull request for locale changes.

**Recommended guards (v1)**

- If dry-run mode was used: **do not create a PR**
- If there are **no changes**: **do not create a PR**
- If `gh` CLI is missing: show a clear error message

**Input**

- `title` (string, default `chore(i18n): fix translations`)
- `body` (string)
- `branch` (string, default `i18n/auto-fix`)

Commits the `locales` directory and opens a PR against `main`.

---

## Resources

Read-only context an agent can load **once per session** instead of re-scanning
every time. All return `application/json`.

### `i18n://locales`

Locale files present in the project and their key counts.

```json
{ "localesDir": "…/locales", "locales": [ { "locale": "en", "keyCount": 120 }, { "locale": "ko", "keyCount": 118 } ] }
```

### `i18n://namespaces`

Top-level translation-key namespaces of the base locale.

```json
{ "baseLang": "en", "totalKeys": 120, "namespaces": [ { "namespace": "home", "keyCount": 8 }, { "namespace": "settings", "keyCount": 15 } ] }
```

### `i18n://status`

Current missing / unused / out-of-sync summary from a fresh scan.

```json
{ "baseLang": "en", "totalLocaleKeys": 120, "totalCodeKeys": 122, "missingCount": 2, "unusedCount": 0, "inSync": false, "missingKeys": ["profile.logout.button"], "unusedKeys": [] }
```

---

## Configuration

The server operates on the client's working directory. Defaults can be
overridden with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `I18N_LOCALES_DIR` | `./locales` | Directory holding locale JSON files (absolute or relative to cwd) |
| `I18N_BASE_LANG` | `en` | Base/reference locale |

```json
{
  "mcpServers": {
    "i18n-mcp": {
      "command": "npx",
      "args": ["-y", "@ddongule/i18n-mcp"],
      "env": { "I18N_LOCALES_DIR": "src/locales", "I18N_BASE_LANG": "en" }
    }
  }
}
```

---

## Recommended Workflows

### Workflow A: Safe AI-assisted review

1. `fix_i18n` with `apply=false`
2. AI explains proposed changes
3. Human approves
4. `fix_i18n` with `apply=true`
5. `create_i18n_pr`

### Workflow B: Import from sheet

1. `import_i18n_from_sheet` with `dryRun=true`
2. Review preview
3. `import_i18n_from_sheet` with `dryRun=false`
4. `create_i18n_pr`

---

## Google Sheets Credentials

Use a Service Account JSON key:

- Create a Google Cloud project
- Create a Service Account
- Create a JSON key
- Save it locally: `./credentials/google-service-account.json`

Share the spreadsheet with the service account email (`client_email`) as Viewer (import) or Editor (export).

---

## Security Notes

- The MCP server runs locally with filesystem access.
- Store credentials outside your repo and add them to `.gitignore`.
- If you enable PR creation, it runs `git` and `gh` commands—use only in trusted repos.

---

## Troubleshooting

### “gh not found”

Install GitHub CLI and authenticate:

```bash
gh auth login
```

### “Unable to parse range”

Your `sheetName` is wrong; use the correct tab name.

---

## License

MIT
