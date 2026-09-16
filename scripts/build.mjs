import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(root, "dist"), { recursive: true });

await build({
  entryPoints: [join(root, "src", "main.ts")],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  external: ["obsidian"],
  outfile: join(root, "dist", "main.js"),
  sourcemap: false,
  legalComments: "none",
  minify: false,
  logLevel: "info",
});

copyFileSync(join(root, "manifest.json"), join(root, "dist", "manifest.json"));
copyFileSync(join(root, "styles", "styles.css"), join(root, "dist", "styles.css"));
console.log("build complete: dist/main.js, dist/manifest.json, dist/styles.css");
