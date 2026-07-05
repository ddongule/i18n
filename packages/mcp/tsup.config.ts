import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  bundle: true,
  // Keep heavy runtime deps external; they are declared in dependencies.
  external: ["@modelcontextprotocol/sdk", "googleapis", "xlsx", "glob", "zod"],
  clean: true,
  sourcemap: false,
  dts: false,
  esbuildOptions(options) {
    // Bundle the workspace core straight from its TypeScript source so it is
    // compiled as ESM (avoids CJS `require` shims failing at runtime).
    options.alias = {
      ...(options.alias ?? {}),
      "i18n-mcp-core": path.resolve(__dirname, "../core/src/index.ts"),
    };
  },
});
