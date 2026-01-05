# i18n-MCP

Automation toolkit for managing **i18n translations at production scale**.

[🇰🇷 한국어 README 보기](./README_KR.md)

Supports:
- 🔍 Scanning missing / unused translation keys  
- 🧹 Auto-fixing locale inconsistencies  
- 📥 Importing translations from Google Sheets / XLSX  
- 📦 CLI Tool  
- 🚧 MCP integration (planned)

Perfect for:
- Frontend & Web Apps
- Multi-language products
- PM / Localization Team / Developer collaboration


---

## 🚀 Features

### i18n Quality Automation
✔ Detect missing translation keys  
✔ Detect unused translation keys  
✔ Generate reports (Markdown / JSON)  
✔ Auto delete unused keys  
✔ Auto create missing keys  
✔ Locale structure syncing  
✔ Dry run / confirmation / backup mode  


---

## 📥 Spreadsheet Import Support

### ✅ Google Sheets (Recommended)

Real-time collaboration with PMs & localization teams.

```
i18n-mcp import --sheet <SHEET_ID>
```

Supports:
- `--tab`
- `--override`
- `--dry-run`
- `--backup`

Sheet format example:

| key | en | ko |
|------|------|------|
| home.title | Welcome | 환영합니다 |
| home.ok | OK | 확인 |

---

### 📂 XLSX File Import

```
i18n-mcp import --file translations.xlsx
```

---

## 🔍 Scan i18n Keys

```
i18n-mcp scan --lang en
```

Example output:

```
✔ Locales Loaded: 120
✔ Code Keys: 115

❗ Missing Keys (3)
- profile.logout.button
- settings.notification.enabled
...

🧹 Unused Keys (2)
- debug.testKey
- home.legacy.title
```

Markdown report:

```
i18n-mcp scan --md
```

JSON report:

```
i18n-mcp scan --json
```

---

## 🛡 Safety Features

| Option | Description |
|--------|-------------|
| `--dry-run` | No changes applied |
| `--backup` | Backup before modifying |
| `--no-confirm` | Skip confirmation |
| `--locale <code>` | Only modify target locale |
| `--lang <base>` | Set reference base language |

---

## 🔐 Google Sheets Setup

1️⃣ Create Google Cloud Project  
2️⃣ Enable **Google Sheets API**  
3️⃣ Create **Service Account**  
4️⃣ Download JSON credentials  
5️⃣ Save credentials to:

```
/credentials/google-service-account.json
```

6️⃣ Share the sheet with the service account email

---

## 📂 Project Structure

```
packages/
  core      → i18n logic
  cli       → command line interface
locales/    → translation files
credentials/ → google auth (ignored)
```

---

## 🧪 Development

```
pnpm install
pnpm -r build
```

Run CLI:

```
node packages/cli/dist/index.js scan
```

---

## ⚠ Security Note

Do NOT commit credentials

```
credentials/
*.json
```

Already ignored in `.gitignore`.

---

## 🧭 Roadmap

- Export → Google Sheets
- Sync Mode (auto pull / push)
- MCP Support
- CI / CD Integration
- GitHub PR automation

---

## ❤️ Contributions
PRs welcome 🙏

---

## 📄 License
MIT
