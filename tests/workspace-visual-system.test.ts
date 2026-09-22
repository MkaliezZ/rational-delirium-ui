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
const navSrc = readFileSync(join(root, "src", "views", "archive-nav-view.ts"), "utf-8");
const inspSrc = readFileSync(join(root, "src", "views", "inspector-view.ts"), "utf-8");
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

describe("phase1 workspace structure (V2 real shell)", () => {
  it("workspace view is center-only; nav and inspector are real dock leaves", () => {
    // no internal planes remain in the workspace view
    expect(viewSrc).not.toContain("rdws-plane-left");
    expect(viewSrc).not.toContain("rdws-plane-right");
    expect(viewSrc).not.toContain("rdws-planes");
    expect(viewSrc).toContain('"rdws-center"');
    expect(viewSrc).toContain("rdws-masthead");
    expect(viewSrc).toContain("rdws-ko-title");
    expect(viewSrc).toContain("rdws-desk-title");
    // semantic landmarks live in the dock views now
    expect(navSrc).toContain('createChild(this.contentEl, "nav", { cls: "rd-archive-nav" })');
    expect(inspSrc).toContain('createChild(this.contentEl, "aside", { cls: "rd-inspector" })');
    // no plane-era CSS survives
    expect(css).not.toContain(".rdws-plane-left");
    expect(css).not.toContain(".rdws-plane-right");
    expect(css).not.toContain(".rdws-planes");
    expect(css).not.toContain("rdws-mid");
  });

  it("left dock: selection group, neutral object list, surface destinations", () => {
    // object rows sorted by id (neutral order)
    expect(navSrc).toContain("localeCompare(b.object_id)");
    // surfaces include collaboration as first-class destination
    expect(navSrc).toContain('{ key: "Collaboration", mode: "collaboration" }');
    expect(navSrc).toContain("rdan-collab-toggle");
    // archive identity head carries the brand and the workspace label
    expect(navSrc).toContain("Rational Delirium");
    expect(navSrc).toContain("investigation archive ·");
  });

  it("right dock: review attention + contributions from declared data only", () => {
    expect(inspSrc).toContain('"Workspace review"');
    expect(inspSrc).toContain("status === \"pending\"");
    expect(inspSrc).toContain('"Recent workspace contributions"');
    expect(inspSrc).toContain("Diagnostics");
    expect(inspSrc).toContain("observations, not repair requests");
    // review rows navigate read-only into the workspace collaboration
    expect(inspSrc).toContain("openProposalInWorkspace");
    expect(viewSrc).toContain("openProposalInCollaboration");
  });

  it("honest unavailable snapshot state, workspace not broken", () => {
    expect(navSrc).toContain("snapshot unavailable — the vault still contains its knowledge");
    expect(viewSrc).toContain("workspace works without it");
    const stateSrc = readFileSync(join(root, "src", "architecture", "workspace-state.ts"), "utf-8");
    expect(stateSrc).toContain("does not mean no knowledge exists");
  });

  it("no new action controls: decision buttons remain the only write", () => {
    for (const banned of ["Run Agent", "runAgent(", "Execute(", "Automation", "autoApprove"]) {
      expect(viewSrc).not.toContain(banned);
      expect(navSrc).not.toContain(banned);
      expect(inspSrc).not.toContain(banned);
    }
    // the decision path is unchanged (single port)
    expect(viewSrc).toContain("recordProposalDecision");
    expect(viewSrc).toContain("recordDecision(path, decision)");
  });

  it("responsive classes follow the pane-width contract (narrow dossier only)", () => {
    expect(viewSrc).toContain('classList.toggle("rdws-narrow"');
    expect(viewSrc).toContain("width < 700");
    // the internal-plane folding rules are gone with the planes;
    // narrow now only compacts the dossier typography
    expect(viewSrc).not.toContain("rdws-mid");
    expect(css).toMatch(/rdws-narrow \.rdws-ko-title[\s\S]*?font-size: 26px;/);
  });
});

describe("phase1 typography contract (CSS)", () => {
  it("applies the archival scale: serif titles, mono metadata, 4px rhythm", () => {
    expect(css).toContain("--rd-font-serif:");
    // the archive identity head moved to the left dock, dock-scale serif
    expect(css).toMatch(/\.rdan-brand-title[\s\S]*?font-family: var\(--rd-font-serif/);
    // Phase 2 raised the KO dossier title to the display scale
    expect(css).toMatch(/\.rdws-ko-title[\s\S]*?font-size: 30px;\s*\n\s*line-height: 38px;/);
    expect(css).toMatch(/\.rdws-desk-lead[\s\S]*?font-size: 16px;\s*\n\s*line-height: 26px;/);
    expect(css).toMatch(/\.rdan-object-row-id[\s\S]*?font-size: 13px;/);
    // center band exists; fixed side planes are gone
    expect(css).toContain(".rd-workspace-shell .rdws-center {");
    expect(css).not.toContain(".rdws-plane-left");
    expect(css).not.toContain(".rdws-plane-right");
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
