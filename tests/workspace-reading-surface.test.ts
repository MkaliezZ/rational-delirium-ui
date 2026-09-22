/** RD Product Surface Refactor Phase 2 — the archival reading
 * surface. Dossier header hierarchy, identity strip of real
 * declared fields only, declared-kind index, structured provenance
 * layers and relation rows, mature inspector (object + linked
 * objects + review), and the semantic ban list (no confidence, no
 * truth, no rank) held against source and rendered DOM.
 *
 * V2 Phase A: the rail and the inspector are real dock leaves now
 * (rd-archive-nav / rd-inspector) sharing the session store with
 * the workspace view; the DOM assertions for them run against the
 * dock views. Dossier, strip, layer and relation assertions stay
 * on the workspace view. */

import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { App, WorkspaceLeaf } from "obsidian";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";
import { renderKnowledgePanel, buildKnowledgePanelModel } from "../src/semantic-graph/knowledge-panel";
import type { KoDetailResult, KoSourceReader } from "../src/semantic-graph/ko-detail-reader";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";
import { RDInspectorView } from "../src/views/inspector-view";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { RDShellController } from "../src/architecture/rd-shell-controller";
import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viewSrc = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
const navSrc = readFileSync(join(root, "src", "views", "archive-nav-view.ts"), "utf-8");
const inspSrc = readFileSync(join(root, "src", "views", "inspector-view.ts"), "utf-8");
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

const GRAPH_JSON = JSON.stringify({
  schema: GRAPH_SCHEMA_TAG,
  nodes: [
    { object_id: "FICT-CASE-0002", kind: "concept", status: "active",
      title: "Second object of another declared kind", predecessor: null, successor: null },
    { object_id: "FICT-CASE-0001", kind: "hypothesis", status: "active",
      title: "The corridor encodes its own history", predecessor: "FICT-CASE-0003", successor: null },
    { object_id: "FICT-CASE-0003", kind: "hypothesis", status: "superseded",
      title: "An earlier framing, kept visible", predecessor: null, successor: "FICT-CASE-0001" },
  ],
  edges: [
    { source: "FICT-CASE-0001", target: "FICT-CASE-0002", relation: "supports" },
    { source: "FICT-CASE-0002", target: "FICT-CASE-0001", relation: "contradicts" },
  ],
  unresolved: [
    { source: "FICT-CASE-0001", target: "FICT-CASE-0009", relation: "derived_from" },
  ],
  diagnostics: [],
});

const LOAD = parseGraphSnapshot(GRAPH_JSON);
if (LOAD.state !== "available") throw new Error("fixture must load");

const SOURCE_DETAIL: KoDetailResult = {
  state: "available",
  path: "HYPOTHESES/fict-case-0001.md",
  frontmatter: {
    object_id: "FICT-CASE-0001",
    kind: "hypothesis",
    status: "active",
    title: "The corridor encodes its own history",
    workspace_context: "FICT-W",
    provenance: {
      observation: "What was observed in the fictional corridor.",
      evidence: "Excerpt of the fictional survey log.",
      inference: "The pattern may be intentional.",
      conclusion: "",
    },
  },
};

const sourceReader: KoSourceReader = {
  resolve: async (objectId: string) =>
    objectId === "FICT-CASE-0001" ? SOURCE_DETAIL : { state: "missing" as const },
};

const emptyCollab = { readDir: async () => ({ state: "missing" as const }) };

/** Minimal shell-side app fake: the controller only needs the leaf
 * bookkeeping surface. */
const fakeApp = {
  workspace: {
    getLeavesOfType: () => [],
    ensureSideLeaf: async () => ({}),
    detachLeavesOfType: () => {},
    revealLeaf: async () => {},
  },
} as unknown as App;

interface ShellViews {
  view: RDWorkspaceShellView;
  nav: RDArchiveNavView;
  inspector: RDInspectorView;
}

const shells: ShellViews[] = [];
afterEach(async () => {
  for (const shell of shells.splice(0)) {
    await shell.view.onClose();
    await shell.nav.onClose();
    await shell.inspector.onClose();
  }
  document.body.replaceChildren();
});

async function openWorkspace(selected: string | null): Promise<ShellViews> {
  const store = new RDWorkspaceStore();
  if (selected !== null) store.setSelectedObject(selected);
  const source = { read: async () => ({ state: "available" as const, text: GRAPH_JSON }) };
  const browser = new CollaborationBrowser();
  const shellController = new RDShellController(fakeApp, store);
  const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
    store,
    source,
    sourceReader,
    collaborationSource: emptyCollab,
    openView: async () => {},
    browser,
  });
  const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
    store, source, openView: async () => {},
  });
  const inspector = new RDInspectorView({} as WorkspaceLeaf, {
    store, source, browser, shellController,
  });
  const shell: ShellViews = { view, nav, inspector };
  shells.push(shell);
  await view.onOpen();
  await nav.onOpen();
  await inspector.onOpen();
  await vi.waitFor(
    () => {
      // with a selection the reading plane is a dossier (present or
      // honestly absent); without one the desk home is up.
      const text = view.contentEl.textContent ?? "";
      const ready = selected === null
        ? text.includes("An investigation desk")
        : /not a validity badge|not in snapshot \(declared data unavailable here\)/.test(text);
      expect(ready).toBe(true);
    },
    { timeout: 3000 },
  );
  return shell;
}

describe("phase2 dossier header", () => {
  it("renders eyebrow → serif title → identity line → identity strip", async () => {
    const { view } = await openWorkspace("FICT-CASE-0001");
    await vi.waitFor(() => {
      expect(view.contentEl.textContent).toContain("resolved · current-source read");
    });
    const eyebrow = view.contentEl.querySelector(".rdws-dossier-eyebrow");
    expect(eyebrow?.textContent).toContain("Knowledge Object · hypothesis");
    expect(eyebrow?.textContent).toContain("declared classification");
    const title = view.contentEl.querySelector("h2.rdws-ko-title");
    expect(title?.textContent).toBe("The corridor encodes its own history");
    expect(view.contentEl.querySelector(".rdws-ko-identity")?.textContent)
      .toContain("not a validity badge");

    const strip = view.contentEl.querySelector(".rdws-identity-strip");
    expect(strip).not.toBeNull();
    const labels = [...strip!.querySelectorAll("dt")].map((el) => el.textContent);
    // real declared fields only — no dates, no scores, no invented metadata
    expect(labels).toEqual(["kind", "lifecycle", "snapshot", "relations", "source", "provenance"]);
    const values = [...strip!.querySelectorAll("dd")].map((el) => el.textContent);
    expect(values).toContain("hypothesis");
    expect(values).toContain("active");
    expect(values).toContain("derived projection · freshness unverified");
    expect(values).toContain("2 declared · 1 unresolved");
    expect(values).toContain("3 of 4 layers carry text");
  });

  it("identity strip degrades honestly when no declaring note exists", async () => {
    const { view } = await openWorkspace("FICT-CASE-0002");
    const strip = view.contentEl.querySelector(".rdws-identity-strip");
    const sourceItem = [...strip!.querySelectorAll(".rdws-strip-item")]
      .find((el) => el.querySelector("dt")?.textContent === "source");
    expect(sourceItem?.getAttribute("data-state")).toBe("missing");
    expect(sourceItem?.textContent).toContain("no declaring note found");
  });

  it("a selection absent from the snapshot shows honest unavailability", async () => {
    const { view } = await openWorkspace("FICT-CASE-9999");
    expect(view.contentEl.querySelector(".rdws-dossier-eyebrow")?.textContent)
      .toContain("not in snapshot");
    const values = [...view.contentEl.querySelectorAll(".rdws-strip-item dd")]
      .map((el) => el.textContent);
    expect(values).toContain("not in snapshot");
    expect(values).toContain("declared data unavailable here");
  });
});

describe("phase2 declared-kind archive index (left dock)", () => {
  it("groups by declared kind only; neutral kind and id order; real counts", async () => {
    const { nav } = await openWorkspace(null);
    const kinds = [...nav.contentEl.querySelectorAll(".rdan-kind-name")]
      .map((el) => el.textContent);
    expect(kinds).toEqual(["concept", "hypothesis"]); // alphabetical, declared kinds only
    const counts = [...nav.contentEl.querySelectorAll(".rdan-kind-count")]
      .map((el) => el.textContent);
    expect(counts).toEqual(["· 1", "· 2"]);
    // kind groups first, ids in neutral order within each group
    const order = [...nav.contentEl.querySelectorAll(".rdan-object-row-id")]
      .map((el) => el.textContent);
    expect(order).toEqual(["FICT-CASE-0002", "FICT-CASE-0001", "FICT-CASE-0003"]);
  });

  it("object rows carry the same aria contract and select through the shared store", async () => {
    const { view, nav } = await openWorkspace(null);
    const row = nav.contentEl
      .querySelector<HTMLButtonElement>('.rdan-object-row[aria-label="inspect FICT-CASE-0001"]')!;
    expect(row).not.toBeNull();
    row.click();
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent)
        .toBe("The corridor encodes its own history");
      expect(nav.contentEl
        .querySelector('.rdan-object-row[aria-label="inspect FICT-CASE-0001"]')
        ?.getAttribute("aria-pressed")).toBe("true");
    });
  });
});

describe("phase2 inspector (right dock)", () => {
  it("shows Object metadata and Linked objects from declared graph data", async () => {
    const { inspector } = await openWorkspace("FICT-CASE-0001");
    const groups = [...inspector.contentEl.querySelectorAll(".rd-inspector .rdin-group")];
    const labels = groups.map((g) => g.querySelector(".rdin-label")?.textContent);
    expect(labels).toEqual([
      "Object", "Linked objects", "Workspace review", "Recent workspace contributions",
      "Diagnostics",
    ]);
    // phase2.1 hierarchy: object context zone, then the subordinate
    // workspace zone; diagnostics quiet at the bottom
    const zones = [...inspector.contentEl.querySelectorAll(".rdin-zone")];
    expect(zones.map((z) => z.getAttribute("data-zone"))).toEqual(["object", "workspace"]);
    expect(zones[0].querySelectorAll(".rdin-group").length).toBe(2);
    expect(zones[1].querySelectorAll(".rdin-group").length).toBe(2);

    const objectGroup = groups[0];
    expect(objectGroup.textContent).toContain("FICT-CASE-0001");
    expect(objectGroup.textContent).toContain("predecessor");
    expect(objectGroup.textContent).toContain("FICT-CASE-0003");

    const linked = groups[1];
    const rows = [...linked.querySelectorAll(".rdin-link-row")];
    expect(rows.length).toBe(3); // supports + contradicts + unresolved derived_from
    const contradicts = rows.find((r) => r.getAttribute("data-relation") === "contradicts");
    expect(contradicts?.querySelector(".rdin-link-type")?.textContent).toContain("← contradicts");
    const unresolvedRow = rows.find((r) => r.classList.contains("rdin-link-unresolved"));
    expect(unresolvedRow?.tagName).toBe("DIV"); // unresolved targets never navigate
    expect(unresolvedRow?.getAttribute("aria-disabled")).toBe("true");
    expect(unresolvedRow?.textContent).toContain("unresolved");
  });

  it("linked rows navigate by exact object_id through the shared store", async () => {
    const { view, inspector } = await openWorkspace("FICT-CASE-0001");
    const row = [...inspector.contentEl.querySelectorAll<HTMLButtonElement>(".rdin-link-row")]
      .find((el) => el.getAttribute("aria-label") === "inspect FICT-CASE-0002")!;
    row.click();
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent)
        .toBe("Second object of another declared kind");
    });
  });

  it("Human review stays separate from object knowledge state", async () => {
    const { inspector } = await openWorkspace("FICT-CASE-0001");
    // the collaboration model lands asynchronously on open and each
    // landing rebuilds the inspector — re-query the live node and
    // wait for the settled empty state rather than the transient
    // "reading proposal records…" placeholder
    const reviewNow = () =>
      [...inspector.contentEl.querySelectorAll(".rdin-group")]
        .find((g) => g.querySelector(".rdin-label")?.textContent === "Workspace review");
    expect(reviewNow()).toBeDefined();
    await vi.waitFor(() => {
      expect(reviewNow()?.textContent).toContain("No proposal records found.");
    }, { timeout: 3000 });
  });

  it("honest empty state when nothing is selected (no fabricated object)", async () => {
    const { inspector } = await openWorkspace(null);
    const objectZone = inspector.contentEl.querySelector('.rdin-zone[data-zone="object"]');
    expect(objectZone?.textContent).toContain("nothing selected");
    // workspace zone still renders; no knowledge-object metadata invented
    expect(inspector.contentEl.querySelector('.rdin-zone[data-zone="workspace"]')).not.toBeNull();
    expect(inspector.contentEl.textContent).not.toContain("predecessor");
  });
});

describe("phase2 structured panel sections", () => {
  const model = buildKnowledgePanelModel({
    load: LOAD,
    workspace: "FICT-W",
    objectId: "FICT-CASE-0001",
    sourceDetail: SOURCE_DETAIL,
  });

  it("provenance renders numbered layer markers, states and excerpt text", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    const layers = [...host.querySelectorAll(".rdkp-layer")];
    expect(layers.map((l) => l.getAttribute("data-layer")))
      .toEqual(["observation", "evidence", "inference", "conclusion"]);
    expect(layers.map((l) => l.querySelector(".rdkp-layer-marker")?.textContent))
      .toEqual(["01", "02", "03", "04"]);
    const first = layers[0];
    expect(first.getAttribute("data-state")).toBe("available");
    expect(first.querySelector(".rdkp-layer-label")?.textContent).toBe("Observation");
    expect(first.querySelector(".rdkp-layer-text")?.textContent)
      .toBe("What was observed in the fictional corridor.");
    const conclusion = layers[3];
    expect(conclusion.getAttribute("data-state")).toBe("declared empty");
    expect(conclusion.querySelector(".rdkp-layer-text")?.textContent).toBe("(declared empty)");
  });

  it("relation rows carry type/direction/path/endpoint with semantic data-relation", () => {
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    const rows = [...host.querySelectorAll(".rdkp-relation-row")];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.getAttribute("data-relation")).toMatch(/^(supports|contradicts|derived_from)$/);
      expect(row.querySelector(".rdkp-rel-dir")?.textContent).toMatch(/^\[(outgoing|incoming)\]$/);
      expect(row.querySelector(".rdkp-rel-path")?.textContent).toContain("source: FICT-");
      expect(row.querySelector(".rdkp-rel-endpoint")?.textContent).toContain("endpoint:");
    }
    const contradicts = rows.find((r) => r.getAttribute("data-relation") === "contradicts");
    expect(contradicts?.getAttribute("data-direction")).toBe("incoming");
    expect(host.textContent).toContain("unresolved declaration: derived_from");
  });
});

describe("phase2 semantic ban list and CSS contract", () => {
  it("no confidence/truth/rank vocabulary in the surface sources", () => {
    const banned = ["confidence", "truth score", "importance", "correctness", "AI judge", "autoApprove"];
    for (const src of [viewSrc, navSrc, inspSrc]) {
      for (const b of banned) expect(src.toLowerCase()).not.toContain(b.toLowerCase());
    }
  });

  it("rendered surface carries no scoring vocabulary", async () => {
    const { view, nav, inspector } = await openWorkspace("FICT-CASE-0001");
    for (const el of [view.contentEl, nav.contentEl, inspector.contentEl]) {
      const text = (el.textContent ?? "").toLowerCase();
      for (const b of ["confidence", "truth score", "importance", "correctness", "verified-true"]) {
        expect(text).not.toContain(b);
      }
    }
  });

  it("CSS: identity strip is ruled and wraps; layers excerpt serif; conflict accent restrained", () => {
    const p2 = css.slice(css.indexOf("RD Product Surface Refactor Phase 2"));
    expect(p2).toMatch(/\.rdws-identity-strip[\s\S]*?flex-wrap: wrap;/);
    expect(p2).toContain(".rdws-strip-item:last-child");
    expect(p2).toMatch(/\.rdkp-layer\[data-state="available"\] \.rdkp-layer-text[\s\S]*?font-style: italic;/);
    expect(p2).toContain('.rdkp-relation-row[data-relation="contradicts"] .rdkp-rel-type');
    // V2: the inspector linked-row accent moved to the dock classes
    expect(p2).toContain('.rdin-link-row[data-relation="contradicts"] .rdin-link-type');
    // V2 Phase B: the uniform § section marker yielded to restrained
    // geometric line-markers — one per dossier section, CSS-only
    // pseudo-elements (aria-hidden by construction), always paired
    // with the pinned text label. Equivalent marker assertion: every
    // dossier section and every provenance layer carries its mark.
    expect(p2).toContain('.rdkp-provenance > .rdkp-section-title::before');
    expect(p2).toContain('.rdkp-relations > .rdkp-section-title::before');
    expect(p2).toContain('.rdkp-lineage > .rdkp-section-title::before');
    expect(p2).toContain('.rdkp-record > .rdkp-section-title::before');
    expect(p2).toContain('.rdkp-diagnostics > .rdkp-section-title::before');
    expect(p2).toContain('.rdkp-layer[data-layer="observation"] .rdkp-layer-marker::before');
    expect(p2).toContain('.rdkp-layer[data-layer="evidence"] .rdkp-layer-marker::before');
    expect(p2).toContain('.rdkp-layer[data-layer="inference"] .rdkp-layer-marker::before');
    expect(p2).toContain('.rdkp-layer[data-layer="conclusion"] .rdkp-layer-marker::before');
    expect(p2).toMatch(/rdws-narrow \.rdws-ko-title[\s\S]*?font-size: 26px;/);
    // no scoring visuals: no gradients, no shadows
    expect(p2).not.toContain("linear-gradient");
    expect(p2).not.toContain("box-shadow");
  });

  it("phase2.1 CSS (V2 dock surfaces): left rows are two-line flex, kinds divide, composition is bounded", () => {
    const p21 = css.slice(css.indexOf("RD Product Surface Refactor Phase 2.1"));
    // deliberate row structure: id/lifecycle baseline, title own line
    expect(p21).toMatch(/\.rdan-object-row \{[\s\S]*?display: flex;/);
    expect(p21).toMatch(/\.rdan-object-row-meta \{[\s\S]*?flex: 0 0 auto;/);
    expect(p21).toMatch(/\.rdan-object-row-title \{[\s\S]*?flex: 1 1 100%;/);
    // kind headings are index dividers with breathing room
    expect(p21).toMatch(/\.rdan-kind \{[\s\S]*?border-top: 1px solid/);
    // ultra-wide composition is bounded and centered on all bands
    for (const sel of [".rdws-masthead,", ".rdws-statusline,", ".rdws-center"]) {
      expect(p21).toContain(sel);
    }
    expect(p21).toMatch(/max-width: 1720px;/);
    expect(p21).toMatch(/margin: 0 auto;/);
    // inspector hierarchy zones exist and workspace is subordinate
    expect(p21).toContain('[data-zone="workspace"]');
    // narrow economy: compact bar and statusline; dossier typography
    // stays compact (the internal planes and their folding rules
    // are gone with the V1 architecture)
    expect(p21).toMatch(/rdws-narrow \.rdws-masthead[\s\S]*?padding: 8px 14px;/);
    expect(p21).toMatch(/rdws-narrow \.rdws-statusline[\s\S]*?font-size: 12px;/);
    expect(css).toMatch(/rdws-narrow \.rdws-ko-title[\s\S]*?font-size: 26px;/);
  });
});
