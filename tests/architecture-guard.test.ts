import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe("architecture regression guard (§40)", () => {
  const mainSrc = readFileSync(join(root, "src", "main.ts"), "utf-8");

  it("main.ts imports RuntimeWiring", () => {
    expect(mainSrc).toContain("RuntimeWiring");
    expect(mainSrc).toContain('from "./runtime/runtime-wiring"');
  });

  it("main.ts instantiates RuntimeWiring", () => {
    expect(mainSrc).toMatch(/new RuntimeWiring\(/);
  });

  it("main.ts uses RuntimeWiring.start()", () => {
    expect(mainSrc).toMatch(/wiring\.start\(\)/);
  });

  it("main.ts uses RuntimeWiring.dispose()", () => {
    expect(mainSrc).toMatch(/wiring\?\.dispose\(\)|wiring\.dispose\(\)/);
  });

  it("main.ts does NOT contain duplicate vault lifecycle handlers", () => {
    // main.ts should NOT directly implement applyCreate/applyModify/
    // applyDelete/applyRename — those live in RuntimeWiring
    expect(mainSrc).not.toMatch(/private async applyCreate/);
    expect(mainSrc).not.toMatch(/private async applyModify/);
    expect(mainSrc).not.toMatch(/private async applyDelete/);
    expect(mainSrc).not.toMatch(/private async applyRename/);
  });

  it("main.ts does NOT contain duplicate BUILDING/REPLAYING/LIVE state", () => {
    // the phase state machine should only exist in RuntimeWiring
    expect(mainSrc).not.toMatch(/buildPhase/);
    expect(mainSrc).not.toMatch(/BUILDING/);
    expect(mainSrc).not.toMatch(/REPLAYING/);
  });

  it("main.ts does NOT contain duplicate scheduler instantiation", () => {
    // the live scheduler should only be created in RuntimeWiring
    expect(mainSrc).not.toMatch(/new PendingPathScheduler/);
  });

  it("main.ts does NOT contain duplicate pending paths set", () => {
    expect(mainSrc).not.toMatch(/pendingPaths/);
    expect(mainSrc).not.toMatch(/buildPending/);
  });

  it("RuntimeWiring module exists and is importable", async () => {
    const mod = await import("../src/runtime/runtime-wiring");
    expect(mod.RuntimeWiring).toBeDefined();
    expect(typeof mod.RuntimeWiring).toBe("function");
  });

  it("dist/main.js contains RuntimeWiring production code", () => {
    const distPath = join(root, "dist", "main.js");
    // strict: readFileSync throws are NOT caught; assertion failures fail
    const dist = readFileSync(distPath, "utf-8");
    expect(dist).toContain("RuntimeWiring");
  });
});

describe("v0.4.2 investigation dashboard narrow guard (§29)", () => {
  const investigationSources = [
    "src/investigation/investigation-projection.ts",
    "src/views/investigation-view.ts",
  ].map((rel) => readFileSync(join(root, rel), "utf-8"));
  const mainSrc = readFileSync(join(root, "src", "main.ts"), "utf-8");

  it("dashboard modules never instantiate their own RDIndex", () => {
    for (const src of investigationSources) {
      expect(src).not.toMatch(/new RDIndex/);
    }
  });

  it("dashboard modules never scan the Vault or register watchers", () => {
    for (const src of investigationSources) {
      expect(src).not.toMatch(/getMarkdownFiles/);
      expect(src).not.toMatch(/\.on\(["'](create|modify|rename|delete)/);
      expect(src).not.toMatch(/Vault\.create|Vault\.modify|Vault\.delete|Vault\.rename/);
      expect(src).not.toMatch(/processFrontMatter/);
      expect(src).not.toMatch(/saveData|localStorage|data\.json/);
    }
  });

  it("main.ts still instantiates exactly ONE RuntimeWiring", () => {
    expect(mainSrc.match(/new RuntimeWiring\(/g)).toHaveLength(1);
  });
});

describe("v0.4.3 loop workspace narrow guard", () => {
  const loopSources = [
    "src/loop/loop-projection.ts",
    "src/views/loop-view.ts",
  ].map((rel) => readFileSync(join(root, rel), "utf-8"));

  it("loop modules never instantiate their own RDIndex", () => {
    for (const src of loopSources) {
      expect(src).not.toMatch(/new RDIndex/);
    }
  });

  it("loop modules never scan the Vault, watch, or persist", () => {
    for (const src of loopSources) {
      expect(src).not.toMatch(/getMarkdownFiles/);
      expect(src).not.toMatch(/\.on\(["'](create|modify|rename|delete|file-open)/);
      expect(src).not.toMatch(/Vault\.create|Vault\.modify|Vault\.delete|Vault\.rename/);
      expect(src).not.toMatch(/processFrontMatter/);
      expect(src).not.toMatch(/saveData|localStorage|IndexedDB|data\.json/);
    }
  });
});

describe("v0.4.4 graph intelligence narrow guard", () => {
  const graphSources = [
    "src/graph/graph-projection.ts",
    "src/views/graph-intelligence-view.ts",
  ].map((rel) => readFileSync(join(root, rel), "utf-8"));

  it("graph modules never instantiate their own RDIndex or scan the Vault", () => {
    for (const src of graphSources) {
      expect(src).not.toMatch(/new RDIndex/);
      expect(src).not.toMatch(/getMarkdownFiles/);
      expect(src).not.toMatch(/\.on\(["'](create|modify|rename|delete|file-open)/);
      expect(src).not.toMatch(/setInterval/);
      expect(src).not.toMatch(/saveData|localStorage|IndexedDB|data\.json/);
    }
  });

  it("graph modules contain no renderer/canvas/graph-DOM internals (§18)", () => {
    for (const src of graphSources) {
      expect(src).not.toMatch(/GraphView|canvas|d3|cytoscape|MutationObserver/);
      expect(src).not.toMatch(/workspace-leaf|graph-view|\.graph-canvas/);
    }
  });

  it("ordinary backlink APIs never enter graph modules (§23)", () => {
    for (const src of graphSources) {
      expect(src).not.toMatch(/ordinaryLinksOf|ordinaryBacklinksOf/);
    }
  });

  it("exactly ONE NavigationPort command constant exists and no second port", () => {
    const navSrc = readFileSync(join(root, "src", "platform", "navigation-core.ts"), "utf-8");
    expect(navSrc.match(/NATIVE_LOCAL_GRAPH_COMMAND_ID/g)).toHaveLength(1);
    expect(navSrc).toContain('"graph:open-local"');
    for (const src of graphSources) {
      expect(src).not.toMatch(/class \w+Navigation|new ObsidianNavigationPort/);
    }
  });
});

describe("v0.4.2 CSS scope isolation (§30)", () => {
  it("every stylesheet selector is scoped under .rd-context, .rd-investigation, .rd-loop, .rd-graph or .rd-knowledge-panel", () => {
    const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");
    // Strip comments, then collect selector text preceding every '{'.
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const selectors: string[] = [];
    for (const chunk of cleaned.split("}")) {
      const idx = chunk.indexOf("{");
      if (idx === -1) continue;
      selectors.push(chunk.slice(0, idx).trim());
    }
    expect(selectors.length).toBeGreaterThan(10);
    for (const selector of selectors) {
      // media prelude lines etc. have no selector text
      if (selector === "" || selector.startsWith("@")) continue;
      for (const part of selector.split(",")) {
        const s = part.trim();
        if (s === "") continue;
        expect(
          s.startsWith(".rd-context") || s.startsWith(".rd-investigation")
            || s.startsWith(".rd-loop") || s.startsWith(".rd-graph")
            || s.startsWith(".rd-knowledge-panel"),
          `unscoped selector: ${s}`,
        ).toBe(true);
      }
    }
  });
});
