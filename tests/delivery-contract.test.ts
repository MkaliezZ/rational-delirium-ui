import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const roots: string[] = [];
const fixture = () => {const dir = mkdtempSync(join(tmpdir(), "rd-readiness-test-")); roots.push(dir); return dir;};
afterEach(() => {
  for (const dir of roots.splice(0)) {
    const child = relative(resolve(tmpdir()), resolve(dir));
    if (child.startsWith("rd-readiness-test-") && !child.includes("..")) rmSync(dir, {recursive: true, force: true});
  }
});

describe("installation and portable graph export", () => {
  it("an incomplete build cannot partially overwrite an existing installation", () => {
    const sandbox = fixture(), candidate = join(sandbox, "candidate"), vault = join(sandbox, "vault");
    mkdirSync(join(candidate, "scripts"), {recursive: true}); mkdirSync(join(candidate, "dist"));
    const target = join(vault, ".obsidian/plugins/rational-delirium"); mkdirSync(target, {recursive: true});
    for (const name of ["deploy.mjs", "runtime-files.mjs"]) writeFileSync(join(candidate, "scripts", name), readFileSync(join(root, "scripts", name)));
    for (const name of ["main.js", "manifest.json", "styles.css", "tokens-rational-archive.css"]) {
      writeFileSync(join(target, name), "OLD BUILD");
      if (name !== "tokens-rational-archive.css") writeFileSync(join(candidate, "dist", name), "NEW BUILD");
    }
    const run = spawnSync(process.execPath, [join(candidate, "scripts/deploy.mjs"), vault], {encoding: "utf8"});
    expect(run.status).toBe(1); expect(run.stderr).toContain("incomplete build");
    for (const name of readdirSync(target)) expect(readFileSync(join(target, name), "utf8")).toBe("OLD BUILD");
  });
  it("deploys exactly the four matching runtime files without changing vault settings", () => {
    const vault = fixture(); mkdirSync(join(vault, ".obsidian"));
    writeFileSync(join(vault, ".obsidian/app.json"), '{"fixture":true}');
    execFileSync(process.execPath, ["scripts/deploy.mjs", vault], {cwd: root});
    const installed = join(vault, ".obsidian/plugins/rational-delirium");
    const files = ["main.js", "manifest.json", "styles.css", "tokens-rational-archive.css"].sort();
    expect(readdirSync(installed).sort()).toEqual(files);
    for (const name of files) expect(readFileSync(join(installed, name))).toEqual(readFileSync(join(root, "dist", name)));
    expect(readFileSync(join(vault, ".obsidian/app.json"), "utf8")).toBe('{"fixture":true}');
    expect(readdirSync(join(vault, ".obsidian")).sort()).toEqual(["app.json", "plugins"]);
  });

  it("exports both schemas with exactly the live index semantics and deterministic output", () => {
    const vault = fixture(); mkdirSync(join(vault, "EVIDENCE")); mkdirSync(join(vault, "Notes"));
    writeFileSync(join(vault, "EVIDENCE/e.md"), '---\ntype: evidence\nid: E-1\nstatus: verified\nsupports: "[[Notes/idea]]"\n---\n# Legacy evidence\n');
    writeFileSync(join(vault, "Notes/idea.md"), '---\nobject_id: ko-20261107-0001\nkind: concept\nstatus: active\ntitle: "An idea"\ndepends_on: [E-1]\n---\n');
    const run = () => execFileSync(process.execPath, ["scripts/project-graph.mjs", vault], {cwd: root, encoding: "utf8"});
    const first = run(), second = run();
    expect(second).toBe(first);
    const graph = JSON.parse(first);
    expect(graph.nodes.map((n: {object_id: string}) => n.object_id)).toEqual(["E-1", "ko-20261107-0001"]);
    expect(graph.edges).toHaveLength(2); expect(graph.unresolved).toHaveLength(0); expect(graph.diagnostics).toHaveLength(0);
    const output = join(vault, "semantic-graph/graph.json");
    execFileSync(process.execPath, ["scripts/project-graph.mjs", vault, "-o", output], {cwd: root});
    expect(readFileSync(output, "utf8")).toBe(first);
  });

  it("rejects a missing input instead of publishing an empty success", () => {
    const result = spawnSync(process.execPath, ["scripts/project-graph.mjs", join(fixture(), "missing")], {cwd: root, encoding: "utf8"});
    expect(result.status).toBe(1); expect(result.stdout).toBe(""); expect(result.stderr).toContain("Graph export failed");
  });
});
