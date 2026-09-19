/** v1.6.4 animation & interaction polish tests — pure-CSS motion:
 * no mutation path, reduced-motion parity, theme compatibility,
 * forbidden-pattern absence, loop absence, view preservation.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../src/semantic-graph/knowledge-panel";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");
const start = css.indexOf("v1.6.4 — Animation & interaction polish");
const section = start >= 0 ? css.slice(start) : "";

describe("v1.6.4 motion implementation shape", () => {
  it("is present and defines motion tokens as overridable custom properties", () => {
    expect(start).toBeGreaterThan(-1);
    expect(section).toContain("--rd-motion-duration:");
    expect(section).toContain("--rd-motion-duration-fast:");
    expect(section).toContain("--rd-motion-ease:");
    // tokens defined on RD surfaces so themes may override feel
    expect(section).toContain(".rd-knowledge-panel,");
    expect(section).toContain(".rd-workspace-shell");
  });

  it("uses only two one-shot keyframes; no loops, no infinite, no timers", () => {
    const keyframes = css.match(/@keyframes ([a-z-]+)/g) ?? [];
    expect(keyframes).toEqual(["@keyframes rd-reveal", "@keyframes rd-enter"]);
    expect(css.toLowerCase()).not.toContain("infinite");
    expect(css).not.toContain("animation-iteration-count");
    // no JS-side animation machinery was introduced
    const viewSrc = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    const panelSrc = readFileSync(join(root, "src", "semantic-graph", "knowledge-panel.ts"), "utf-8");
    for (const src of [viewSrc, panelSrc]) {
      for (const banned of [
        "requestAnimationFrame", "setInterval", "setTimeout",
        "Animation(", "animate(", "transition",
      ]) {
        expect(src).not.toContain(banned);
      }
    }
  });

  it("forbidden motion patterns are absent (no glow/ranking/AI theatrics)", () => {
    for (const banned of ["glow", "pulse", "shimmer", "sparkle", "bounce", "shake", "flash"]) {
      expect(section.toLowerCase()).not.toContain(banned);
    }
    expect(css).not.toContain("box-shadow");
    expect(css).not.toContain("drop-shadow");
    // no CLASS or animation NAME encodes those semantics (display
    // text may legitimately quote the prohibitions, e.g. the
    // "not a validity badge" labels)
    const panelSrc = readFileSync(join(root, "src", "semantic-graph", "knowledge-panel.ts"), "utf-8");
    const quoted = panelSrc.match(/"[^"]*"|cls: [^,}]+/g) ?? [];
    for (const q of quoted) {
      expect(/truth|confiden|rank|score|winner/i.test(q), q).toBe(false);
    }
  });

  it("structure motion conveys order only: provenance layers stagger, nothing emphasized", () => {
    // sibling-chain delays apply uniformly by position; no class
    // singles out a layer as stronger/truer.
    expect(section).toContain(".rdkp-layer ~ .rdkp-layer");
    expect(section).toContain("animation-delay: 60ms");
    expect(section).toContain("animation-delay: 120ms");
    expect(section).toContain("animation-delay: 180ms");
    // no per-layer color/scale/weight escalation in the motion section
    expect(section).not.toMatch(/font-weight|scale\(|filter:/);
  });

  it("reduced motion removes movement while keeping information", () => {
    const reduce = section.indexOf("prefers-reduced-motion");
    expect(reduce).toBeGreaterThan(-1);
    const block = section.slice(reduce);
    expect(block).toContain("animation: none !important");
    expect(block).toContain("transition: none !important");
    expect(block).toContain(".rd-knowledge-panel *");
    expect(block).toContain(".rd-workspace-shell *");
  });

  it("theme compatibility: motion values ride var() with fallbacks; no new palette", () => {
    const standalone = section.match(/:\s*#[0-9a-fA-F]{6}\s*;/) ?? [];
    expect(standalone).toEqual([]); // no color outside var() fallbacks
    expect(section).toContain("var(--rd-motion-duration");
    expect(section).toContain("var(--rd-motion-ease");
    expect(section).toContain("var(--rd-surface-focus-rule");
  });
});

describe("v1.6.4 boundary: animation cannot mutate data", () => {
  const GRAPH = parseGraphSnapshot(JSON.stringify({
    schema: GRAPH_SCHEMA_TAG,
    nodes: [
      { object_id: "ko-20260921-0001", kind: "fact", status: "active", title: "t", predecessor: null, successor: null },
      { object_id: "ko-20260921-0002", kind: "observation", status: "candidate", title: "u", predecessor: "ko-20260921-0001", successor: null },
    ],
    edges: [{ source: "ko-20260921-0002", target: "ko-20260921-0001", relation: "revises" }],
    unresolved: [], diagnostics: [],
  }));
  if (GRAPH.state !== "available") throw new Error("fixture must load");

  it("rendering with navigation + section markup changes no knowledge data", () => {
    const visited: string[] = [];
    const model = buildKnowledgePanelModel({
      load: GRAPH, workspace: "W", objectId: "ko-20260921-0002",
    });
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { onSelectObject: (id) => visited.push(id) });
    const nav = host.querySelector("button.rdkp-nav");
    expect(nav).not.toBeNull();
    (nav as HTMLElement).click();
    expect(visited).toEqual(["ko-20260921-0001"]);
    expect(GRAPH.graph.nodes[0].status).toBe("active");
    expect(() => {
      (GRAPH.graph.nodes[0] as unknown as { status: string }).status = "x";
    }).toThrow();
    // CSS is declarative: styles cannot call back into data
    expect(section).not.toMatch(/javascript:|expression\(/);
  });

  it("existing views preserved: registry command surface unchanged", async () => {
    const mod = await import("../src/architecture/rd-view-setup");
    const registry = mod.buildRDViewRegistry();
    expect(registry.registrations_().map((r) => r.commandId)).toEqual([
      "open-rd-context", "open-rd-investigation", "open-rd-loop-workspace",
      "open-rd-graph-intelligence", "open-rd-knowledge-panel", "open-rd-workspace",
    ]);
  });
});
