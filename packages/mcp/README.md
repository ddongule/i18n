# i18n-mcp

An MCP (Model Context Protocol) server that exposes i18n automation as **AI-callable tools**.

Use it when you want ChatGPT/Cursor/Claude (or other MCP clients) to:

- **Scan** i18n health
- **Fix** missing/unused keys safely
- **Import** translations from Google Sheets or XLSX
- (Optional) **Create PRs** with changes

> This package is for AI integrations and requires an MCP client setup.
> If you just want a normal CLI, use **i18n-cli**.

---

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Install](#install)
- [Run Locally](#run-locally)
- [Client Setup](#client-setup)
  - [ChatGPT Desktop](#chatgpt-desktop)
  - [Cursor](#cursor)
  - [Claude Desktop](#claude-desktop)
- [Tools (v1)](#tools-v1)
  - [fix_i18n](#fix_i18n)
  - [import_i18n_from_sheet](#import_i18n_from_sheet)
  - [export_i18n_to_sheet](#export_i18n_to_sheet)
  - [create_i18n_pr](#create_i18n_pr)
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
npx i18n-mcp
```

Or install:

```bash
pnpm add -D i18n-mcp
```

---

## Run Locally

Most MCP clients use stdio transport, so you typically just point the client to:

```bash
npx i18n-mcp
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
      "args": ["-y", "i18n-mcp"]
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
      "args": ["-y", "i18n-mcp"]
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
      "args": ["-y", "i18n-mcp"]
    }
  }
}
```

> Config locations differ by client/version. The key idea is to run `npx i18n-mcp` via stdio.

---

## Tools (v1)

### fix_i18n

Scan and optionally fix locale files.

**Input**

- `baseLang` (string, default `en`)
- `deleteUnused` (boolean, default `false`)
- `createMissing` (boolean, default `false`)
- `fixStructure` (boolean, default `false`)
- `locale` (string, optional)
- `apply` (boolean, default `false`) — when false, behaves like dry-run

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
- `credentialsPath` (string, optional)
- `dryRun` (boolean, default `false`)
- `override` (boolean, default `false`)
- `localesDir` (string, optional; default `./locales`)

**Example**

```json
{
  "name": "import_i18n_from_sheet",
  "arguments": {
    "sheetId": "1L7h7Ra3hrOrp5MW7_uWV6ANNrBF0b9CgSfJ9hXy7D7w",
    "sheetName": "Translations",
    "dryRun": true,
    "override": false
  }
}
```

---

### export_i18n_to_sheet

Export locale JSON files to Google Sheets.

**Input**

- `sheetId` (string, required)
- `sheetName` (string, default `Sheet1`)
- `credentialsPath` (string, optional)
- `dryRun` (boolean, default `false`)
- `localesDir` (string, optional; default `./locales`)

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

- `title` (string)
- `body` (string)
- `branch` (string, default `i18n/auto-fix`)
- `base` (string, default `main`)
- `localesDir` (string, default `./locales`)

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
