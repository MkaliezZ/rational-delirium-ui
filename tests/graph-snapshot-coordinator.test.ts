/** V2 review fixes — graph snapshot authority (V2-01) and dock
 * async lifecycle (V2-02).
 *
 * V2-01: one GraphSnapshotCoordinator per session is the single
 * load/publish authority. Concurrent cold-open of the workspace +
 * both docks shares ONE underlying source read; generations are
 * explicit and monotonic; a stale completion can never overwrite a
 * newer published snapshot; all three surfaces render from the
 * same published store snapshot; an explicit refresh switches all
 * surfaces together.
 *
 * V2-02: dock views (archive nav, inspector) carry an active flag
 * + open generation token. An awaited continuation that resolves
 * after close — or after a close→reopen cycle — drops silently:
 * no render into the closed view. Publish authority stays in the
 * coordinator; dock guards only protect their own DOM.
 */

import { describe, expect, it, afterEach, vi } from "vitest";
import type { App, WorkspaceLeaf } from "obsidian";
import { GRAPH_SCHEMA_TAG } from "../src/semantic-graph/graph-loader";
import type { KoSourceReader } from "../src/semantic-graph/ko-detail-reader";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { GraphSnapshotCoordinator } from "../src/architecture/graph-snapshot-coordinator";
import { RDShellController } from "../src/architecture/rd-shell-controller";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";
import { RDInspectorView } from "../src/views/inspector-view";
import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";

/* ---------- fakes ---------- */

class FakeLeaf {
  constructor(public viewType: string, readonly side?: string) {}
  async setViewState(state: { type: string }): Promise<void> { this.viewType = state.type; }
}

class FakeWorkspace {
  leaves: FakeLeaf[] = [];
  getLeavesOfType(viewType: string): FakeLeaf[] {
    return this.leaves.filter((l) => l.viewType === viewType);
  }
  async ensureSideLeaf(type: string, side: string): Promise<FakeLeaf> {
    const leaf = new FakeLeaf(type, side);
    this.leaves.push(leaf);
    return leaf;
  }
  detachLeavesOfType(viewType: string): void {
    this.leaves = this.leaves.filter((l) => l.viewType !== viewType);
  }
}

class FakeApp {
  readonly workspace = new FakeWorkspace();
}

/* ---------- controllable graph source ---------- */

interface Gate {
  resolve: (value: { readonly state: "available"; readonly text: string }) => void;
}

function makeGraphJson(title: string, status = "active"): string {
  return JSON.stringify({
    schema: GRAPH_SCHEMA_TAG,
    nodes: [
      { object_id: "ko-20260921-0001", kind: "hypothesis", status,
        title, predecessor: null, successor: null },
      { object_id: "ko-20260921-0002", kind: "reference", status: "active",
        title: "Object B", predecessor: null, successor: null },
    ],
    edges: [{ source: "ko-20260921-0001", target: "ko-20260921-0002", relation: "supports" }],
    unresolved: [],
    diagnostics: [],
  });
}

/** A GraphSource whose reads block until resolveNext() is called. */
function gatedSource() {
  type ReadResult = { readonly state: "available"; readonly text: string };
  let reads = 0;
  const gates: Gate[] = [];
  return {
    readCount: () => reads,
    source: {
      read: (): Promise<ReadResult> => {
        reads += 1;
        return new Promise<ReadResult>((resolve) => {
          gates.push({
            resolve: (v) => resolve(v),
          });
        });
      },
    },
    /** Resolve the oldest pending read with the given snapshot text. */
    resolveNext: (text: string) => {
      const gate = gates.shift();
      if (gate === undefined) throw new Error("no pending read");
      gate.resolve({ state: "available", text });
    },
    /** Resolve the NEWEST pending read (a later generation that
     * completes before an older one). */
    resolveLatest: (text: string) => {
      const gate = gates.pop();
      if (gate === undefined) throw new Error("no pending read");
      gate.resolve({ state: "available", text });
    },
    pending: () => gates.length,
  };
}

const missingCollab = { readDir: async () => ({ state: "missing" as const }) };
const missingReader: KoSourceReader = { resolve: async () => ({ state: "missing" as const }) };

const openViews: Array<{ onClose(): Promise<void> }> = [];
afterEach(async () => {
  for (const v of openViews.splice(0)) await v.onClose();
  document.body.replaceChildren();
});

function makeShell() {
  const app = new FakeApp();
  const store = new RDWorkspaceStore();
  const controller = new RDShellController(app as unknown as App, store);
  const browser = new CollaborationBrowser();
  return { app, store, controller, browser };
}

/* ---------- V2-01 ---------- */

describe("V2-01 — single graph snapshot authority", () => {
  it("A. concurrent cold-open of workspace+nav+inspector reads the source exactly once", async () => {
    const { store, controller, browser } = makeShell();
    const g = gatedSource();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
      store, source: g.source, sourceReader: missingReader,
      collaborationSource: missingCollab, openView: async () => {},
      browser, coordinator,
    });
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, openView: async () => {},
    });
    const inspector = new RDInspectorView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, browser, shellController: controller,
    });
    openViews.push(view, nav, inspector);
    const opening = Promise.all([view.onOpen(), nav.onOpen(), inspector.onOpen()]);
    // all three cold opens join the single in-flight generation
    expect(g.readCount()).toBe(1);
    g.resolveNext(makeGraphJson("Object A"));
    await opening;
    expect(g.readCount()).toBe(1);
    const snapshot = store.getState().graphSnapshot;
    expect(snapshot?.state).toBe("available");
    expect(coordinator.publishedGeneration()).toBe(1);
  });

  it("B. an older generation completing last can never overwrite the newer published one", async () => {
    const { store } = makeShell();
    const g = gatedSource();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const gen1 = coordinator.ensureLoaded();
    const gen2 = coordinator.refresh();
    expect(g.readCount()).toBe(2);
    // gen2 completes FIRST and publishes
    g.resolveLatest(makeGraphJson("Newer"));
    await gen2;
    expect(store.getState().graphSnapshot?.state).toBe("available");
    expect(coordinator.publishedGeneration()).toBe(2);
    // gen1 completes LAST — stale; must not displace gen2
    g.resolveNext(makeGraphJson("Older"));
    await gen1;
    const snapshot = store.getState().graphSnapshot;
    expect(snapshot?.state).toBe("available");
    if (snapshot?.state === "available") {
      expect(snapshot.graph.nodes[0].title).toBe("Newer");
    }
    expect(coordinator.publishedGeneration()).toBe(2);
  });

  it("C. all three surfaces render from the same published snapshot in the store", async () => {
    const { store, controller, browser } = makeShell();
    const g = gatedSource();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
      store, source: g.source, sourceReader: missingReader,
      collaborationSource: missingCollab, openView: async () => {},
      browser, coordinator,
    });
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, openView: async () => {},
    });
    const inspector = new RDInspectorView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, browser, shellController: controller,
    });
    openViews.push(view, nav, inspector);
    const opening = Promise.all([view.onOpen(), nav.onOpen(), inspector.onOpen()]);
    g.resolveNext(makeGraphJson("Object A"));
    await opening;
    const published = store.getState().graphSnapshot;
    expect(published?.state).toBe("available");
    // one selection, three surfaces, one snapshot
    store.setSelectedObject("ko-20260921-0001");
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
      expect(nav.contentEl.querySelector(".rdan-selection-id")?.textContent)
        .toBe("ko-20260921-0001");
      expect(inspector.contentEl.querySelector(".rdin-meta")?.textContent)
        .toContain("ko-20260921-0001");
    });
    // the store's published snapshot is still the coordinator's one
    // published generation — no surface diverged onto a private copy
    expect(store.getState().graphSnapshot).toBe(published);
    expect(coordinator.publishedGeneration()).toBe(1);
  });

  it("D. an explicit refresh switches all surfaces to the new snapshot together", async () => {
    const { store, controller, browser } = makeShell();
    const g = gatedSource();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
      store, source: g.source, sourceReader: missingReader,
      collaborationSource: missingCollab, openView: async () => {},
      browser, coordinator,
    });
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, openView: async () => {},
    });
    const inspector = new RDInspectorView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, browser, shellController: controller,
    });
    openViews.push(view, nav, inspector);
    const opening = Promise.all([view.onOpen(), nav.onOpen(), inspector.onOpen()]);
    g.resolveNext(makeGraphJson("Object A"));
    await opening;
    store.setSelectedObject("ko-20260921-0001");
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
    });
    // explicit re-read → new generation → all surfaces switch
    const refreshing = coordinator.refresh();
    g.resolveNext(makeGraphJson("Object A revised", "archived"));
    await refreshing;
    expect(coordinator.publishedGeneration()).toBe(2);
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent)
        .toBe("Object A revised");
      expect(nav.contentEl.querySelector(
        '.rdan-object-row[aria-label="inspect ko-20260921-0001"] .rdan-object-row-title',
      )?.textContent).toBe("Object A revised");
      expect(inspector.contentEl.querySelector(".rdin-meta")?.textContent)
        .toContain("archived");
    });
    const snapshot = store.getState().graphSnapshot;
    if (snapshot?.state === "available") {
      expect(snapshot.graph.nodes[0].title).toBe("Object A revised");
    } else {
      throw new Error("snapshot must stay available after refresh");
    }
  });
});

/* ---------- V2-02 ---------- */

describe("V2-02 — dock async lifecycle", () => {
  async function makeNav(g: ReturnType<typeof gatedSource>) {
    const { store } = makeShell();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, openView: async () => {},
    });
    openViews.push(nav);
    return { store, coordinator, nav };
  }

  async function makeInspector(g: ReturnType<typeof gatedSource>) {
    const { store, controller, browser } = makeShell();
    const coordinator = new GraphSnapshotCoordinator(store, g.source);
    const inspector = new RDInspectorView({} as WorkspaceLeaf, {
      store, source: g.source, coordinator, browser, shellController: controller,
    });
    openViews.push(inspector);
    return { store, coordinator, inspector };
  }

  it("ARCHIVE_NAV: a load completing after close never renders into the closed view", async () => {
    const g = gatedSource();
    const { nav } = await makeNav(g);
    const opening = nav.onOpen();
    await nav.onClose(); // closed while the read is still pending
    g.resolveNext(makeGraphJson("Object A"));
    await opening; // stale continuation must drop silently
    expect(nav.contentEl.childElementCount).toBe(0);
    expect(nav.contentEl.querySelector(".rd-archive-nav")).toBeNull();
  });

  it("ARCHIVE_NAV: close→reopen — the stale result cannot touch the reopened generation", async () => {
    const g = gatedSource();
    const { nav } = await makeNav(g);
    const staleOpen = nav.onOpen();
    await nav.onClose();
    g.resolveNext(makeGraphJson("Object A"));
    await staleOpen;
    expect(nav.contentEl.childElementCount).toBe(0);
    // reopen: renders the (now published) snapshot cleanly, exactly once
    await nav.onOpen();
    expect(nav.contentEl.querySelectorAll(".rd-archive-nav")).toHaveLength(1);
    expect(nav.contentEl.textContent).toContain("ko-20260921-0001");
  });

  it("INSPECTOR: a load completing after close never renders into the closed view", async () => {
    const g = gatedSource();
    const { inspector } = await makeInspector(g);
    const opening = inspector.onOpen();
    await inspector.onClose(); // closed while the read is still pending
    g.resolveNext(makeGraphJson("Object A"));
    await opening; // stale continuation must drop silently
    expect(inspector.contentEl.childElementCount).toBe(0);
    expect(inspector.contentEl.querySelector(".rd-inspector")).toBeNull();
  });

  it("INSPECTOR: close→reopen — the stale result cannot touch the reopened generation", async () => {
    const g = gatedSource();
    const { store, inspector } = await makeInspector(g);
    const staleOpen = inspector.onOpen();
    await inspector.onClose();
    g.resolveNext(makeGraphJson("Object A"));
    await staleOpen;
    expect(inspector.contentEl.childElementCount).toBe(0);
    // reopen: selection render flows from the shared store as usual
    await inspector.onOpen();
    store.setSelectedObject("ko-20260921-0001");
    await vi.waitFor(() => {
      expect(inspector.contentEl.querySelector(".rdin-meta")?.textContent)
        .toContain("ko-20260921-0001");
    });
    expect(inspector.contentEl.querySelectorAll(".rd-inspector")).toHaveLength(1);
  });
});
