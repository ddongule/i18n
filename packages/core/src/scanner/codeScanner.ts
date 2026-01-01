import { globSync } from "glob";
import fs from "fs";

export function scanCode(baseDir: string) {
  const files = globSync(`${baseDir}/**/*.{ts,tsx,js,jsx}`, {
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  const keys = new Set<string>();
  const regex = /t\(["'`](.+?)["'`]\)/g;

  files.forEach((file: string) => {
    const content = fs.readFileSync(file, "utf-8");

    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });

  return Array.from(keys);
}
