# i18n-MCP (한국어)

**실무용 i18n 관리 자동화 도구**

[🌎 English README](./README.md)

지원 기능
- 🔍 번역 키 누락 탐지
- 🧹 사용하지 않는 키 정리
- 📥 Google Sheets / XLSX 연동
- 📦 CLI 제공
- 🚧 MCP 지원 예정

---

## 🚀 주요 기능

✔ 누락된 번역 키 탐지  
✔ 사용되지 않는 키 탐지  
✔ Markdown / JSON 리포트 생성  
✔ 자동 unused key 삭제  
✔ 자동 missing key 생성  
✔ Locale 구조 자동 동기화  
✔ Dry-run / Backup / Confirm 안전장치 제공  

---

## 📥 스프레드시트 연동

### ✅ Google Sheets (추천)

PM / 기획자 / 번역 담당자 협업에 최적화

```
i18n-mcp import --sheet <스프레드시트_ID>
```

지원 옵션
- `--tab`
- `--override`
- `--dry-run`
- `--backup`

시트 형식 예시:

| key | en | ko |
|------|------|------|
| home.title | Welcome | 환영합니다 |
| home.ok | OK | 확인 |

---

### 📂 XLSX Import

```
i18n-mcp import --file translations.xlsx
```

---

## 🔍 코드 스캔

```
i18n-mcp scan --lang en
```

예시 출력:

```
✔ Locales Loaded: 120
✔ Code Keys: 115

❗ Missing Keys (3)
...
🧹 Unused Keys (2)
...
```

---

## 🛡 안전 기능

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 실제 수정 없이 시뮬레이션 |
| `--backup` | 수정 전 백업 생성 |
| `--no-confirm` | 사용자 확인 없이 실행 |
| `--locale` | 특정 언어만 적용 |
| `--lang` | 기준 언어 설정 |

---

## 🔐 Google Sheets 설정 방법

1️⃣ Google Cloud 프로젝트 생성  
2️⃣ Google Sheets API 활성화  
3️⃣ Service Account 생성  
4️⃣ JSON Key 다운로드  
5️⃣ 아래 경로에 저장

```
credentials/google-service-account.json
```

6️⃣ 스프레드시트 공유 → 서비스 계정 이메일 추가

---

## 📂 프로젝트 구조

```
packages/
  core → 로직
  cli  → CLI 도구
locales/ → 번역 파일
credentials/ → 인증 키
```

---

## 🧪 개발 방법

```
pnpm install
pnpm -r build
```

실행

```
node packages/cli/dist/index.js scan
```

---

## ⚠️ 보안 주의
`credentials/` 커밋 금지  
이미 `.gitignore` 설정 완료됨

---

## 🧭 로드맵

- Google Sheet Export
- 자동 동기화 모드
- MCP 지원
- CI/CD 지원
- GitHub PR 자동 생성

---

## ❤️ 기여
PR 환영 🙏

---

## 📄 라이선스
MIT
