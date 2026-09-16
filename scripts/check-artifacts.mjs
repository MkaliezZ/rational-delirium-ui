import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

const problems = [];

const files = readdirSync(dist).sort();
const expected = ["main.js", "manifest.json", "styles.css"];
if (JSON.stringify(files) !== JSON.stringify(expected)) {
  problems.push(`dist contains ${JSON.stringify(files)}, expected exactly ${JSON.stringify(expected)}`);
}

for (const name of expected) {
  try {
    readFileSync(join(dist, name));
  } catch {
    problems.push(`missing ${name}`);
  }
}

if (!problems.includes("missing manifest.json")) {
  try {
    const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
    for (const key of ["id", "name", "version", "minAppVersion", "isDesktopOnly"]) {
      if (!(key in manifest)) problems.push(`manifest missing ${key}`);
    }
  } catch (err) {
    problems.push(`manifest invalid: ${err.message}`);
  }
}

if (!problems.includes("missing main.js")) {
  const main = readFileSync(join(dist, "main.js"), "utf8");
  const forbiddenTokens = [
    [/node:?(fs|path|os)\b/, "node builtin fs/path/os"],
    [/child_process/, "child_process"],
    [/\bnode:(net|tls|dgram|worker_threads)\b/, "node network/worker"],
    [/\brequire\(("|')(fs|child_process|net|tls|http|https|dgram|worker_threads)("|')\)/, "forbidden require"],
    [/D:\\+node24/, "absolute node24 path"],
    [/D:\\+node\b/, "absolute node path"],
    [/[A-Za-z]:\\\\Users\\\\/, "absolute macOS-style user path"],
    [/\/Users\//, "absolute macOS path"],
    [/\bastra\/bridge/, "Bridge import"],
    [/bridge_state/, "bridge_state reference"],
    [/https?:\/\/(?!www\.w3\.org)/, "network endpoint"],
  ];
  for (const [re, label] of forbiddenTokens) {
    if (re.test(main)) problems.push(`main.js contains ${label}`);
  }
  if (main.includes("sourceMappingURL")) problems.push("main.js references a source map");
}

if (problems.length > 0) {
  console.error("ARTIFACT_CHECK=FAIL");
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}

const sha = (name) =>
  createHash("sha256").update(readFileSync(join(dist, name))).digest("hex");

console.log("ARTIFACT_CHECK=PASS");
console.log(`SHA256 main.js      = ${sha("main.js")}`);
console.log(`SHA256 manifest.json= ${sha("manifest.json")}`);
console.log(`SHA256 styles.css   = ${sha("styles.css")}`);
