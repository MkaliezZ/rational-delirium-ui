/** RD Product Surface Refactor Phase 2.2 — case dossier content
 * composition contracts. The reading surface composes declared
 * content (provenance prose, relation groups) before a folded raw
 * declared record; the left index rows own their wrapped height;
 * Phase 2.1 gains (zones, 1720 composition, narrow reading-first)
 * stay locked. Semantics frozen: layer order, relation exactness,
 * honest absent layers, no scoring vocabulary. */

import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkspaceLeaf } from "obsidian";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";
import { buildKnowledgePanelModel, renderKnowledgePanel } from "../src/semantic-graph/knowledge-panel";
import type { KoDetailResult, KoSourceReader } from "../src/semantic-graph/ko-detail-reader";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

const GRAPH_JSON = JSON.stringify({
  schema: GRAPH_SCHEMA_TAG,
  nodes: [
    { object_id: "ko-20260921-0001", kind: "hypothesis", status: "active",
      title: "Object A", predecessor: null, successor: null },
    { object_id: "ko-20260921-0002", kind: "reference", status: "active",
      title: "Object B", predecessor: null, successor: null },
  ],
  edges: [
    { source: "ko-20260921-0002", target: "ko-20260921-0001", relation: "contradicts" },
    { source: "ko-20260921-0001", target: "ko-20260921-0002", relation: "supports" },
  ],
  unresolved: [
    { source: "ko-20260921-0001", target: "ko-20260921-9999", relation: "derived_from" },
  ],
  diagnostics: [],
});

const LOAD = parseGraphSnapshot(GRAPH_JSON);
if (LOAD.state !== "available") throw new Error("fixture must load");

const SOURCE_DETAIL: KoDetailResult = {
  state: "available",
  path: "NOTES/a.md",
  frontmatter: {
    object_id: "ko-20260921-0001",
    kind: "hypothesis",
    status: "active",
    title: "Object A",
    workspace_context: "FICT-W",
    provenance: {
      observation: "Declared observation text.",
      evidence: "Declared evidence text.",
      // inference deliberately absent — honest missing layer
      conclusion: "",
    },
  },
};

const reader: KoSourceReader = {
  resolve: async (id: string) => (id === "ko-20260921-0001" ? SOURCE_DETAIL : { state: "missing" as const }),
};

const model = buildKnowledgePanelModel({
  load: LOAD, workspace: "FICT-W", objectId: "ko-20260921-0001", sourceDetail: SOURCE_DETAIL,
});

describe("phase2.2 composed dossier content", () => {
  it("composed mode omits panel head/message/query; standalone keeps them", () => {
    const composed = document.createElement("div");
    renderKnowledgePanel(composed, model, { composedInDossier: true });
    expect(composed.querySelector(".rdkp-head")).toBeNull();
    expect(composed.querySelector(".rdkp-message")).toBeNull();
    expect(composed.querySelector(".rdkp-query")).toBeNull();
    expect(composed.querySelector(".rd-knowledge-panel")?.classList.contains("rdkp-composed")).toBe(true);

    const standalone = document.createElement("div");
    renderKnowledgePanel(standalone, model);
    expect(standalone.querySelector(".rdkp-head")).not.toBeNull();
    expect(standalone.querySelector(".rdkp-message")).not.toBeNull();
    expect(standalone.querySelector(".rdkp-query")).not.toBeNull();
  });

  it("reading rhythm: provenance first, then relations, lineage, record, diagnostics", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const sections = [...host.querySelectorAll("details")].map((d) => d.className);
    expect(sections).toEqual(["rdkp-provenance", "rdkp-relations", "rdkp-lineage", "rdkp-record", "rdkp-diagnostics"]);
  });

  it("provenance layer order stays exactly Observation → Evidence → Inference → Conclusion", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const layers = [...host.querySelectorAll(".rdkp-layer")];
    expect(layers.map((l) => l.getAttribute("data-layer")))
      .toEqual(["observation", "evidence", "inference", "conclusion"]);
  });

  it("absent provenance layers stay visible as honest states", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const layers = [...host.querySelectorAll(".rdkp-layer")];
    expect(layers[2].getAttribute("data-state")).toBe("not declared");
    expect(layers[2].textContent).toContain("not declared in source frontmatter");
    expect(layers[3].getAttribute("data-state")).toBe("declared empty");
  });

  it("relations group by declared type; type/direction/path/endpoint stay exact", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const groups = [...host.querySelectorAll(".rdkp-rel-group")];
    const typed = groups.filter((g) => g.getAttribute("data-relation"));
    expect(typed.map((g) => g.getAttribute("data-relation"))).toEqual(["contradicts", "supports"]);
    expect(groups.length).toBe(3); // contradicts + supports + unresolved declarations
    const contradictsRow = typed[0].querySelector(".rdkp-relation-row")!;
    expect(contradictsRow.getAttribute("data-direction")).toBe("incoming");
    expect(contradictsRow.textContent).toContain("source: ko-20260921-0002 → target: ko-20260921-0001");
    expect(contradictsRow.textContent).toContain("[endpoint: available]");
    expect(host.textContent).toContain("unresolved declaration: derived_from → ko-20260921-9999");
  });

  it("contradicts stays a declared relation, never a truth conclusion", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const contradicts = host.querySelector('.rdkp-rel-group[data-relation="contradicts"]');
    expect(contradicts).not.toBeNull();
    const text = (contradicts?.textContent ?? "").toLowerCase();
    for (const claim of ["proves", "proven", "is false", "wrong", "invalidated", "confidence"]) {
      expect(text).not.toContain(claim);
    }
  });

  it("raw metadata stays available but secondary in a folded declared record", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const record = host.querySelector("details.rdkp-record");
    expect(record).not.toBeNull();
    expect(record?.hasAttribute("open")).toBe(false);
    const text = record?.textContent ?? "";
    for (const exact of [
      "object_id", "ko-20260921-0001", "title", "Object A",
      "kind", "status", "predecessor", "successor", "origin", "validation",
    ]) {
      expect(text).toContain(exact);
    }
  });

  it("no confidence/truth/ranking vocabulary in the composed surface", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model, { composedInDossier: true });
    const text = (host.textContent ?? "").toLowerCase();
    for (const banned of ["confidence", "truth score", "importance", "correctness", "ranking", "verified-true"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("phase2.2 left-nav height ownership (CSS contract)", () => {
  it("RD row buttons set height:auto / min-height:0 against the fixed host button height", () => {
    const p22 = css.slice(css.indexOf("RD Product Surface Refactor Phase 2.2"));
    expect(p22).toMatch(/\.rdws-object-row,[\s\S]*?\.rdws-surface-row,[\s\S]*?height: auto;/);
    expect(p22).toMatch(/\.rd-knowledge-panel \.rdkp-relation-row,[\s\S]*?min-height: 0;/);
  });

  it("phase2.1 gains stay locked: zones, 1720 composition, narrow reading-first", () => {
    expect(css).toContain('[data-zone="workspace"]');
    expect(css).toMatch(/max-width: 1720px;/);
    expect(css).toMatch(/rdws-narrow \.rdws-plane-center \{ order: -1; \}/);
    expect(css).toMatch(/rdws-narrow \.rdws-plane-left \{[\s\S]*?max-height: 26vh;/);
  });
});

describe("phase2.2 workspace integration", () => {
  const views: RDWorkspaceShellView[] = [];
  afterEach(async () => {
    for (const view of views.splice(0)) await view.onClose();
    document.body.replaceChildren();
  });

  it("inspector zones preserved under the composed dossier", async () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0001");
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
      store,
      source: { read: async () => ({ state: "available" as const, text: GRAPH_JSON }) },
      sourceReader: reader,
      collaborationSource: { readDir: async () => ({ state: "missing" as const }) },
      openView: async () => {},
    });
    views.push(view);
    await view.onOpen();
    await vi.waitFor(() => {
      expect(view.contentEl.textContent).toContain("Declared observation text.");
    }, { timeout: 3000 });
    const zones = [...view.contentEl.querySelectorAll(".rdws-insp-zone")];
    expect(zones.map((z) => z.getAttribute("data-zone"))).toEqual(["object", "workspace"]);
    // composed: no duplicated panel head inside the dossier
    expect(view.contentEl.querySelector(".rdws-reading .rdkp-head")).toBeNull();
    expect(view.contentEl.querySelector(".rdws-reading .rdkp-record")).not.toBeNull();
  });
});
