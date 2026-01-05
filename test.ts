function example() {
  t("home.title");
  t("profile.logout.button");
  t("settings.notification.enabled");
}

/**
 * @TODO:
 * scan할 때, 
 * {
  "home": {
    "title": "welcome",
    "button": {
      "ok": "ok"
    }
  },
  "profile": {
    "logout": "logout"
  }
}

이거 3개인데 
📦 Running i18n scan...

Base Locale: en

✔ Locales Loaded (base): 4
✔ Code Keys: 4

❗ Missing Keys (0)
  (none)

🧹 Unused Keys (1)
  - home.button.ok

──────────────────────────────

스캔에 4개라고 나옴;;
뭔가 그리고 불친절해서 좀 더 디테일하게 나왔음 좋겠음

 */
