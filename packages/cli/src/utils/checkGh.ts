import { execSync } from "child_process";

export function ensureGhInstalled() {
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    throw new Error(
      "GitHub CLI (gh) is not installed or not available in PATH.\n" +
        "Install it from: https://cli.github.com/\n" +
        "Then run: gh auth login"
    );
  }
}
