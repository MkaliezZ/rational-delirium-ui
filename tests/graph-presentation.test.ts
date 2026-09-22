import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { WorkspaceLeaf } from "obsidian";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";
import { RDGraphIntelligenceView } from "../src/views/graph-intelligence-view";
import { RDInspectorView } from "../src/views/inspector-view";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { buildRDViewRegistry } from "../src/architecture/rd-view-setup";
import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";
import { GraphSnapshotCoordinator } from "../src/architecture/graph-snapshot-coordinator";
import type { RDShellController } from "../src/architecture/rd-shell-controller";
import { GRAPH_SCHEMA_TAG } from "../src/semantic-graph/graph-loader";

const A = "CASES/A.md", B = "EVIDENCE/B.md";
const hosts: ProductionAcceptanceHost[] = [];
const views: Array<{ onClose(): Promise<void> }> = [];
afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
  document.body.replaceChildren();
});
async function setup(relations = ['supports: "[[B]]"', 'contradicts: "[[Missing]]"']) {
  const host = new ProductionAcceptanceHost(); hosts.push(host);
  await host.start([
    [A, fixtureNote({ path: A, type: "case", id: "CASE-A", frontmatterExtra: relations })],
    [B, fixtureNote({ path: B, type: "evidence", id: "EV-B" })],
  ], A);
  const store = new RDWorkspaceStore();
  const reg = buildRDViewRegistry().get("rd-graph-intelligence")!;
  const services = {
    index: host.wiring.index, navigation: host.navigation, workspaceStore: store,
    onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
    onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
    activeFileProvider: () => A,
  };
  const view = reg.createView({} as WorkspaceLeaf, services) as RDGraphIntelligenceView;
  views.push(view); document.body.append(view.contentEl); await view.onOpen();
  return { host, store, view, services };
}

describe("Graph Intelligence presentation", () => {
  it("renders deterministic native geometry with real edge direction and full provenance", async () => {
    const { view } = await setup(['supported_by: "[[B]]"', 'contradicts: "[[Missing]]"']);
    const stage = () => view.contentEl.querySelector(".rdg-map-stage")!;
    const first = stage().outerHTML; view.render(); expect(stage().outerHTML).toBe(first);
    expect(stage().querySelector('svg')).not.toBeNull();
    expect(stage().querySelector('[data-predicate="supports"]')?.getAttribute("data-direction")).toBe("incoming");
    expect(stage().querySelector('[data-predicate="supports"] path')?.getAttribute("marker-end")).toMatch(/^url\(#rdg-arrow-/);
    expect(stage().querySelector('[data-predicate="contradicts"]')?.getAttribute("data-resolution")).toBe("BROKEN");
    expect(view.contentEl.querySelectorAll(".rdg-prov-line")).toHaveLength(2);
    expect(view.contentEl.textContent).toContain("supported_by @ CASES/A.md");
    expect(view.contentEl.textContent).toContain("raw [[B]]");
    expect(view.contentEl.querySelectorAll(".rdg-src")).toHaveLength(2);
  });
  it("publishes identity only through the production factory, leaving graph authority untouched", async () => {
    const { view, store, host } = await setup();
    const graphBefore = store.getState().graphSnapshot;
    const b = view.contentEl.querySelector<HTMLButtonElement>('[data-object-id="EV-B"]')!;
    expect(b.tagName).toBe("BUTTON"); expect(b.disabled).toBe(false);
    b.focus(); b.click(); // Native button Enter/Space activation uses the same click handler.
    expect(store.getState().selectedObjectId).toBe("EV-B");
    expect(store.getState().selectionSource).toBe("graph-intelligence");
    expect(store.getState().graphSnapshot).toBe(graphBefore);
    expect(Object.isFrozen(store.getState())).toBe(true);
    expect(document.activeElement?.getAttribute("data-object-id")).toBe("EV-B");
    expect(view.contentEl.querySelector('[data-object-id="EV-B"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(host.openSpy).not.toHaveBeenCalled(); expect(host.vault.writeCalls).toEqual([]);
  });
  it("ordinary index redraw preserves the user's viewport exploration", async () => {
    const { view } = await setup();
    const viewport = view.contentEl.querySelector<HTMLElement>('.rdg-map-viewport')!;
    viewport.scrollLeft = 140; viewport.scrollTop = 40; view.render();
    const next = view.contentEl.querySelector<HTMLElement>('.rdg-map-viewport')!;
    expect(next.scrollLeft).toBe(140); expect(next.scrollTop).toBe(40);
  });
  it("unresolved endpoints are inert declarations, not invented selectable objects", async () => {
    const { view, store } = await setup();
    const missing = view.contentEl.querySelector<HTMLElement>('.rdg-map-node[data-resolution="BROKEN"]')!;
    expect(missing.tagName).toBe("DIV"); expect(missing.getAttribute("aria-disabled")).toBe("true");
    expect(missing.hasAttribute("data-object-id")).toBe(false);
    missing.click(); expect(store.getState().selectedObjectId).toBeNull();
    expect(missing.textContent).toContain("Identity unavailable");
  });
  it("multiple predicates reuse a node without losing edge rows; self relations remain declared", async () => {
    const { view } = await setup(['supports: "[[B]]"', 'contradicts: "[[B]]"', 'related: "[[A]]"']);
    expect(view.contentEl.querySelectorAll('.rdg-map-node[data-object-id="EV-B"]')).toHaveLength(1);
    expect(view.contentEl.querySelectorAll('.rdg-map-edge')).toHaveLength(3);
    expect(view.contentEl.querySelectorAll('.rdg-rel')).toHaveLength(3);
    for (const p of view.contentEl.querySelectorAll('.rdg-map-edge path')) expect(p.getAttribute("d")).not.toMatch(/NaN|undefined/);
  });
  it("close blocks stale native results and selection publication; reopen renders once", async () => {
    const { view, host, services, store } = await setup();
    let finish!: (v: "UNAVAILABLE") => void;
    const openLocalGraph = vi.fn(() => new Promise<"UNAVAILABLE">(r => { finish = r; }));
    const late = new RDGraphIntelligenceView({} as WorkspaceLeaf, {
      ...services, navigation: { ...services.navigation, open: vi.fn(), activeSurface: () => "rd-context", openLocalGraph },
      onSelectIdentity: id => store.setSelectedObject(id.objectId, id.source),
    });
    views.push(late); await late.onOpen();
    late.contentEl.querySelector<HTMLButtonElement>('.rdg-native')!.click();
    await late.onClose(); finish("UNAVAILABLE"); await Promise.resolve(); await Promise.resolve();
    late.selectObject(B); expect(late.contentEl.textContent).toBe(""); expect(store.getState().selectedObjectId).toBeNull();
    await late.onOpen(); await late.onOpen();
    expect(late.contentEl.querySelectorAll('.rdg-map-stage')).toHaveLength(1);
    expect(late.contentEl.textContent).not.toContain("Native Local Graph unavailable.");
    expect(host.vault.writeCalls).toEqual([]); expect(view.selected).toBe(A);
  });
});

async function inspector(store: RDWorkspaceStore) {
  const source = { read: vi.fn(async () => ({ state: "missing" as const })) };
  const coordinator = new GraphSnapshotCoordinator(store, source);
  const view = new RDInspectorView({} as WorkspaceLeaf, {
    store, source, coordinator, browser: new CollaborationBrowser(), shellController: {} as RDShellController,
  });
  views.push(view); await view.onOpen(); return { view, source };
}
const node = (object_id: string) => ({ object_id, kind: "hypothesis", status: "active", title: "CASE-A", predecessor: null, successor: null });
const snapshot = (ids: string[]) => ({ state: "available" as const, graph: { schema: GRAPH_SCHEMA_TAG,
  nodes: ids.map(node), edges: [], unresolved: [], diagnostics: [] } });

describe("Graph to Inspector identity boundary", () => {
  it("resolves exact id from workspace snapshot without loading graph data again", async () => {
    const store = new RDWorkspaceStore(); const { view, source } = await inspector(store);
    store.setGraphSnapshot(snapshot(["CASE-A"])); store.setSelectedObject("CASE-A", "graph-intelligence");
    expect(view.contentEl.querySelector('.rdin-meta')?.textContent).toContain("CASE-A");
    expect(view.contentEl.querySelector('.rdin-meta')?.textContent).toContain("hypothesis");
    expect(source.read).toHaveBeenCalledTimes(1);
  });
  it.each([null, "CASE-A", "CASES/CASE-A.md", "case-a"])("never guesses missing id %s from title, filename, path or case", async id => {
    const store = new RDWorkspaceStore(); const { view } = await inspector(store);
    store.setGraphSnapshot(snapshot(["OTHER-ID"])); store.setSelectedObject(id, "graph-intelligence");
    expect(view.contentEl.textContent).toContain("Current object unavailable in workspace snapshot");
    expect(view.contentEl.querySelector('.rdin-meta')).toBeNull();
  });
  it("missing snapshot and duplicate snapshot identity stay unavailable", async () => {
    const store = new RDWorkspaceStore(); const { view } = await inspector(store);
    store.setSelectedObject("CASE-A", "graph-intelligence");
    expect(view.contentEl.textContent).toContain("Current object unavailable in workspace snapshot");
    store.setGraphSnapshot(snapshot(["CASE-A", "CASE-A"]));
    expect(view.contentEl.textContent).toContain("ambiguous identity");
    expect(view.contentEl.querySelector('.rdin-meta')).toBeNull();
  });
});

describe("presentation scope guards", () => {
  it("adds no loader, index, persistence, scheduled work or mutation path", () => {
    for (const path of ["src/views/graph-presentation.ts", "src/views/graph-intelligence-view.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/new RDIndex|GraphSnapshotCoordinator|SemanticGraphSnapshot|getMarkdownFiles|setTimeout|setInterval|requestAnimationFrame|localStorage|saveData|loadData|\.animate\(|processFrontMatter|vault\.(?:modify|create|delete|rename)/);
    }
  });
  it("all Graph presentation selectors remain scoped away from editors and third-party views", () => {
    const css = readFileSync("styles/styles.css", "utf8");
    const graph = css.slice(css.indexOf("/* v0.4.4 Graph Intelligence"), css.indexOf("/* v1.3.1 Knowledge Panel"));
    const sheet = new CSSStyleSheet(); sheet.replaceSync(graph);
    function check(rules: CSSRuleList) {
      for (const rule of rules) {
        if ("selectorText" in rule) for (const selector of String(rule.selectorText).split(",")) expect(selector.trim()).toMatch(/^\.rd-graph(?:\s|$)/);
        else if ("cssRules" in rule) check(rule.cssRules as CSSRuleList);
      }
    }
    check(sheet.cssRules);
  });
});
