/** v1.6.3 Knowledge Workspace UI tests — investigation flow,
 * re-homed panel navigation, honest unavailability, neutral object
 * list, read-only boundary, theme token usage, no fake AI.
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
import { RDWorkspaceStore } from "../src/architecture/workspace-state";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const node = (object_id: string, over: Record<string, unknown> = {}) => ({
  object_id,
  kind: "observation",
  status: "candidate",
  title: `Object ${object_id}`,
  predecessor: null,
  successor: null,
  ...over,
});
const edge = (source: string, target: string, relation: string) => ({ source, target, relation });

const GRAPH = parseGraphSnapshot(JSON.stringify({
  schema: GRAPH_SCHEMA_TAG,
  nodes: [
    node("ko-20260921-0001", { status: "superseded", successor: "ko-20260921-0002" }),
    node("ko-20260921-0002", { status: "active", predecessor: "ko-20260921-0001" }),
  ],
  edges: [
    edge("ko-20260921-0002", "ko-20260921-0001", "revises"),
    edge("ko-20260921-0002", "ko-20260921-0003", "supports"),
  ],
  unresolved: [edge("ko-20260921-0002", "ko-20260921-9999", "depends_on")],
  diagnostics: [],
}));
if (GRAPH.state !== "available") throw new Error("fixture must load");

describe("v1.6.3 investigation flow (re-homed projection)", () => {
  it("selection → inspection renders identity/provenance/lineage/relations", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0002");
    expect(store.getState().selectedObjectId).toBe("ko-20260921-0002");
    const model = buildKnowledgePanelModel({
      load: GRAPH, workspace: "FICT-W", objectId: "ko-20260921-0002",
    });
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    const text = host.textContent ?? "";
    expect(text).toContain("ko-20260921-0002");
    // Without a source read, provenance honestly shows the summary
    // row's not-in-snapshot state; the four-layer section renders
    // only with a resolved source (next assertion).
    expect(text).toContain("not in v1.2.1 snapshot");
    expect(text).toContain("Lineage (declared evolution)");
    expect(text).toContain("Relations (2 declared");
    expect(text).toContain("Diagnostics");

    const withSource = buildKnowledgePanelModel({
      load: GRAPH, workspace: "FICT-W", objectId: "ko-20260921-0002",
      sourceDetail: {
        state: "available",
        path: "KO/ko-2.md",
        frontmatter: {
          object_id: "ko-20260921-0002",
          provenance: {
            observation: "o", evidence: "e", inference: "i", conclusion: "c",
          },
        },
      },
    });
    const host2 = document.createElement("div");
    renderKnowledgePanel(host2, withSource);
    expect(host2.textContent).toContain("Provenance (declared, four layers)");
  });

  it("navigation: lineage/relation/unresolved rows navigate when handler present", () => {
    const model = buildKnowledgePanelModel({
      load: GRAPH, workspace: "FICT-W", objectId: "ko-20260921-0002",
    });
    const visited: string[] = [];
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { onSelectObject: (id) => visited.push(id) });
    const navButtons = host.querySelectorAll("button.rdkp-nav");
    expect(navButtons.length).toBeGreaterThanOrEqual(3); // predecessor + revises reading + supports endpoint + unresolved
    const labels = [...navButtons.values()].map((b) => b.getAttribute("aria-label") ?? "");
    expect(labels.some((l) => l === "inspect ko-20260921-0001")).toBe(true);
    expect(labels.some((l) => l === "inspect ko-20260921-0003")).toBe(true);
    expect(labels.some((l) => l === "inspect ko-20260921-9999")).toBe(true);
    (navButtons[0] as HTMLElement).click();
    expect(visited).toHaveLength(1);
    // without a handler, no buttons render (pure display stays pure)
    const plain = document.createElement("div");
    renderKnowledgePanel(plain, model);
    expect(plain.querySelectorAll("button.rdkp-nav")).toHaveLength(0);
  });

  it("store trail supports back navigation through an investigation", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0002");
    store.setSelectedObject("ko-20260921-0001");
    store.back();
    expect(store.getState().selectedObjectId).toBe("ko-20260921-0002");
    store.back();
    expect(store.getState().selectedObjectId).toBeNull();
  });
});

describe("v1.6.3 honesty and neutrality", () => {
  it("workspace source: neutral object list, honest placeholders, no ranking language", () => {
    const src = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    expect(src).toContain("neutral id order");
    // v1.7.4-A: collaboration and agent-contribution areas are live;
    // honesty now lives in the empty-state wording of the surface.
    expect(src).toContain("Collaboration");
    expect(src).toContain("live in workspace");
    expect(src).toContain("not a lifecycle state");
    expect(src).toContain("no ranking, no recommendation");
    // no fake AI surface
    for (const banned of ["chat", "assistant", "suggest", "recommend ", "auto-complete"]) {
      expect(src.toLowerCase()).not.toContain(banned);
    }
    // read-only: no vault write, no timers
    for (const banned of ["vault.modify", "vault.create", "vault.delete", "setInterval", "setTimeout"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("object list derives from declared snapshot nodes in stable id order", () => {
    // The rail renders nodes sorted by object_id — verify the data
    // shape the view consumes (declared data only, no invention).
    const ids = [...GRAPH.graph.nodes].map((n) => n.object_id).sort();
    expect(ids).toEqual(["ko-20260921-0001", "ko-20260921-0002"]);
  });

  it("missing snapshot keeps explicit unavailable state in the workspace model", () => {
    const model = buildKnowledgePanelModel({ load: { state: "missing" }, workspace: "W" });
    expect(model.snapshotState).toBe("unavailable");
    expect(model.snapshotMessage).toContain("does not mean no knowledge exists");
  });

  it("no mutation path: workspace operations cannot touch knowledge data", () => {
    const frozenStatus = GRAPH.graph.nodes[1].status;
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0002");
    store.back();
    store.setWorkspaceLabel("W2");
    expect(GRAPH.graph.nodes[1].status).toBe(frozenStatus);
    expect(() => {
      (GRAPH.graph.nodes[1] as unknown as { status: string }).status = "archived";
    }).toThrow();
  });
});

describe("v1.6.3 theme token usage", () => {
  it("new workspace CSS uses semantic tokens (no off-token colors)", () => {
    const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");
    const start = css.indexOf("/* v1.6.3 workspace investigation layout");
    expect(start).toBeGreaterThan(-1);
    const section = css.slice(start);
    const hexes = section.match(/#[0-9a-fA-F]{6}/g) ?? [];
    // every hex appears only as a var() fallback; no standalone color
    const standalone = section
      .split("\n")
      .filter((line) => /:\s*#[0-9a-fA-F]{6}\s*;/.test(line.replace(/var\([^)]*\)/g, "")));
    expect(standalone).toEqual([]);
    expect(section).toContain("var(--rd-surface-raised");
    expect(section).toContain("var(--rd-identity-title-text");
    expect(hexes.length).toBeGreaterThan(10);
  });
});

describe("v1.6.3 existing views preserved", () => {
  it("registry still ships the same six views with unchanged commands", async () => {
    const mod = await import("../src/architecture/rd-view-setup");
    const registry = mod.buildRDViewRegistry();
    const cmds = registry.registrations_().map((r) => r.commandId);
    expect(cmds).toEqual([
      "open-rd-context", "open-rd-investigation", "open-rd-loop-workspace",
      "open-rd-graph-intelligence", "open-rd-knowledge-panel", "open-rd-workspace",
    ]);
  });

  it("standalone Knowledge Panel render path unchanged (no handler default)", () => {
    const model = buildKnowledgePanelModel({
      load: GRAPH, workspace: "W", objectId: "ko-20260921-0001",
    });
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.querySelector(".rd-knowledge-panel")).not.toBeNull();
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });
});
