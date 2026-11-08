/** Optional deterministic export using exactly the plugin's index/parser. */
import { build } from "esbuild";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
if (args.length !== 1 && !(args.length === 3 && args[1] === "-o")) {
  console.error("usage: npm run project-graph -- <vault-directory> [-o graph.json]");
  process.exit(1);
}
try {
  const vault = resolve(args[0]);
  if (!statSync(vault).isDirectory()) throw new Error("input must be a directory");
  const bundled = await build({stdin: {contents:
    `export {RDIndex} from ${JSON.stringify(join(root, "src/index/rd-index.ts"))};` +
    `export {isIndexablePath,isForbiddenDataSource} from ${JSON.stringify(join(root, "src/scope.ts"))};`,
    resolveDir: root, loader: "ts"}, bundle: true, write: false, platform: "node", format: "esm", target: "node24",
    banner: {js: `import {createRequire} from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});`}});
  const {RDIndex, isIndexablePath, isForbiddenDataSource} = await import(
    "data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
  const paths = [];
  const walk = (relative) => {
    for (const entry of readdirSync(join(vault, relative), {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name))) {
      const path = relative ? relative + "/" + entry.name : entry.name;
      if (entry.isSymbolicLink() || entry.name.startsWith(".") || isForbiddenDataSource(path)) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && isIndexablePath(path)) paths.push(path);
    }
  };
  walk("");
  const index = new RDIndex({list: () => paths,
    read: async (path) => readFileSync(join(vault, path), "utf8"),
    mtime: (path) => statSync(join(vault, path)).mtimeMs});
  await index.build();
  const graph = JSON.stringify(index.semanticSnapshot(), null, 2) + "\n";
  if (args[2] !== undefined) {
    const output = resolve(args[2]);
    if (!output.toLowerCase().endsWith(".json")) throw new Error("output must be a .json artifact");
    mkdirSync(dirname(output), {recursive: true});
    writeFileSync(output, graph, "utf8");
  } else process.stdout.write(graph);
  index.dispose();
} catch (err) {
  console.error(`Graph export failed: ${err.message}`);
  process.exitCode = 1;
}
