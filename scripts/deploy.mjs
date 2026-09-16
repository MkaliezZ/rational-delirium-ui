import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// NOT executed against the real vault during implementation.
// Usage: node scripts/deploy.mjs <target-vault-path>
// Copies exactly the three runtime files into
// <vault>/.obsidian/plugins/rational-delirium/ and nothing else.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
if (argv.length !== 1) {
  console.error("usage: node scripts/deploy.mjs <target-vault>");
  process.exit(1);
}
const vault = resolve(argv[0]);
if (!existsSync(join(vault, ".obsidian")) || !statSync(join(vault, ".obsidian")).isDirectory()) {
  console.error("target does not look like an Obsidian vault (no .obsidian/)");
  process.exit(1);
}
const pluginDir = join(vault, ".obsidian", "plugins", "rational-delirium");
mkdirSync(pluginDir, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
  copyFileSync(join(root, "dist", f), join(pluginDir, f));
}
console.log("deployed runtime files only; plugin NOT enabled; no config touched");
