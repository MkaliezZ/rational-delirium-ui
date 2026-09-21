/** RD Product Surface Refactor Phase 1 — workspace layout
 * regression tests. Presentation structure only: planes exist,
 * masthead exists, review/contribution summaries render from
 * declared artifacts, honest unavailable snapshot state, no new
 * action controls beyond the decision buttons, responsive classes
 * wired per pane-width contract. */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";
import { buildKnowledgePanelModel, renderKnowledgePanel } from "../src/semantic-graph/knowledge-panel";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const viewSrc = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

describe("phase1 workspace structure", () => {
  it("renders the three-plane structure with semantic landmarks", () => {
    expect(viewSrc).toContain('createChild(layout, "nav", { cls: "rdws-plane-left" })');
    expect(viewSrc).toContain('createChild(layout, "aside", { cls: "rdws-plane-right" })');
    expect(viewSrc).toContain('"rdws-plane-center"');
    expect(viewSrc).toContain("rdws-masthead");
    expect(viewSrc).toContain("rdws-ko-title");
    expect(viewSrc).toContain("rdws-desk-title");
  });

  it("left rail: selection group, neutral object list, surface destinations", () => {
    // object rows sorted by id (neutral order)
    expect(viewSrc).toContain("localeCompare(b.object_id)");
    // surfaces include collaboration as first-class destination
    expect(viewSrc).toContain('{ key: "Collaboration", mode: "collaboration" }');
    expect(viewSrc).toContain("rdws-collab-toggle");
  });

  it("right plane: review attention + contributions from declared data only", () => {
    expect(viewSrc).toContain('"Human review"');
    expect(viewSrc).toContain("status === \"pending\"");
    expect(viewSrc).toContain('"Recent contributions"');
    expect(viewSrc).toContain("Diagnostics");
    expect(viewSrc).toContain("observations, not repair requests");
    // review rows navigate read-only into collaboration
    expect(viewSrc).toContain("openProposalInCollaboration");
  });

  it("honest unavailable snapshot state, workspace not broken", () => {
    expect(viewSrc).toContain("snapshot unavailable — the vault still contains its knowledge");
    expect(viewSrc).toContain("does not mean no knowledge exists");
    expect(viewSrc).toContain("workspace works without it");
  });

  it("no new action controls: decision buttons remain the only write", () => {
    for (const banned of ["Run Agent", "runAgent(", "Execute(", "Automation", "autoApprove"]) {
      expect(viewSrc).not.toContain(banned);
    }
    // the decision path is unchanged (single port)
    expect(viewSrc).toContain("recordProposalDecision");
    expect(viewSrc).toContain("recordDecision(path, decision)");
  });

  it("responsive classes follow the pane-width contract", () => {
    expect(viewSrc).toContain('classList.toggle("rdws-narrow"');
    expect(viewSrc).toContain('classList.toggle("rdws-mid"');
    expect(viewSrc).toContain("width < 700");
    expect(viewSrc).toContain("width < 1100");
    // right plane folds before left rail; reading surface unsqueezed
    expect(css).toContain(".rd-workspace-shell.rdws-mid .rdws-plane-right { display: none; }");
    expect(css).toContain(".rd-workspace-shell.rdws-narrow .rdws-plane-right { display: none; }");
  });
});

describe("phase1 typography contract (CSS)", () => {
  it("applies the archival scale: serif titles, mono metadata, 4px rhythm", () => {
    expect(css).toContain("--rd-font-serif:");
    expect(css).toMatch(/\.rdws-masthead-title[\s\S]*?font-size: 28px;\s*\n\s*line-height: 36px;/);
    expect(css).toMatch(/\.rdws-ko-title[\s\S]*?font-size: 22px;\s*\n\s*line-height: 30px;/);
    expect(css).toMatch(/\.rdws-desk-lead[\s\S]*?font-size: 16px;\s*\n\s*line-height: 26px;/);
    expect(css).toMatch(/\.rdws-object-row-id[\s\S]*?font-size: 13px;/);
    // center plane dominates; sides are fixed
    expect(css).toContain(".rdws-plane-center {");
    expect(css).toMatch(/\.rdws-plane-left[\s\S]*?flex: 0 0 224px;/);
    expect(css).toMatch(/\.rdws-plane-right[\s\S]*?flex: 0 0 312px;/);
  });

  it("no dashboard patterns: no KPI tiles, no big radii, no border-left walls", () => {
    const deskSection = css.slice(css.indexOf("RD Product Surface Refactor Phase 1"));
    expect(deskSection).not.toContain("border-radius: 16px");
    expect(deskSection).not.toContain("border-radius: 12px");
    expect(deskSection).not.toMatch(/grid-template-columns:\s*repeat\(auto-fit/);
    // semantic tokens only (hex only as var() fallbacks)
    const standalone = deskSection
      .split("\n")
      .filter((line) => /:\s*#[0-9a-fA-F]{6}\s*;/.test(line.replace(/var\([^)]*\)/g, "")));
    expect(standalone).toEqual([]);
  });
});

describe("phase1 knowledge reading unchanged (data semantics)", () => {
  const GRAPH = parseGraphSnapshot(JSON.stringify({
    schema: GRAPH_SCHEMA_TAG,
    nodes: [
      { object_id: "ko-20260921-0001", kind: "hypothesis", status: "active",
        title: "Rebuild duration is cache-state dependent", predecessor: null, successor: null },
    ],
    edges: [], unresolved: [], diagnostics: [],
  }));
  if (GRAPH.state !== "available") throw new Error("fixture must load");

  it("reading plane still renders the panel with navigation (re-homed, unmodified)", () => {
    const model = buildKnowledgePanelModel({
      load: GRAPH, workspace: "W", objectId: "ko-20260921-0001",
    });
    const host = document.createElement("div");
    const visited: string[] = [];
    renderKnowledgePanel(host, model, { onSelectObject: (id) => visited.push(id) });
    expect(host.textContent).toContain("ko-20260921-0001");
    expect(host.textContent).toContain("not a validity badge");
    expect(host.querySelector(".rd-knowledge-panel")).not.toBeNull();
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0001");
    expect(store.getState().selectedObjectId).toBe("ko-20260921-0001");
  });
});
