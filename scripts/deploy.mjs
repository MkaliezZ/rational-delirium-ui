import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { RUNTIME_FILES } from "./runtime-files.mjs";

// NOT executed against the real vault during implementation.
// Usage: node scripts/deploy.mjs <target-vault-path>
// Copies exactly the four runtime files into
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
for (const name of RUNTIME_FILES) {
  const source = join(root, "dist", name);
  if (!existsSync(source) || !statSync(source).isFile()) {
    console.error(`incomplete build: missing ${name}; no installed files were changed`);
    process.exit(1);
  }
}
mkdirSync(pluginDir, { recursive: true });
for (const f of RUNTIME_FILES) {
  copyFileSync(join(root, "dist", f), join(pluginDir, f));
}
console.log("deployed runtime files only; plugin NOT enabled; no config touched");
