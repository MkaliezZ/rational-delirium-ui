/** V2 Phase A — shell architecture tests: the Rational Archive
 * shell is a REAL Obsidian shell now. The workspace view's onOpen
 * attaches the shell scope (body class + two dock leaves), onClose
 * releases it; the archive navigation and the inspector are dock
 * ItemViews sharing the one session store and the one shared
 * collaboration browser. Pure presentation: no writes, no timers,
 * no focus theft, no duplicate leaves.
 *
 * Covers the task's twelve shell behaviors.
 */

import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { App, WorkspaceLeaf } from "obsidian";
import { GRAPH_SCHEMA_TAG } from "../src/semantic-graph/graph-loader";
import type { KoSourceReader } from "../src/semantic-graph/ko-detail-reader";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import {
  RDShellController,
  RD_SHELL_BODY_CLASS,
} from "../src/architecture/rd-shell-controller";
import { buildRDViewRegistry } from "../src/architecture/rd-view-setup";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";
import { RDInspectorView } from "../src/views/inspector-view";
import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/* ---------- shell-side fakes ---------- */

class FakeLeaf {
  revealed = false;
  constructor(
    public viewType: string,
    readonly side?: string,
    readonly options?: { active?: boolean },
  ) {}
  async setViewState(state: { type: string }): Promise<void> { this.viewType = state.type; }
}

class FakeWorkspace {
  leaves: FakeLeaf[] = [];
  readonly ensured: Array<{ type: string; side: string; options?: { active?: boolean } }> = [];
  readonly detached: string[] = [];
  getLeavesOfType(viewType: string): FakeLeaf[] {
    return this.leaves.filter((l) => l.viewType === viewType);
  }
  async ensureSideLeaf(
    type: string, side: string, options?: { active?: boolean },
  ): Promise<FakeLeaf> {
    const leaf = new FakeLeaf(type, side, options);
    this.leaves.push(leaf);
    this.ensured.push({ type, side, options });
    return leaf;
  }
  detachLeavesOfType(viewType: string): void {
    this.detached.push(viewType);
    this.leaves = this.leaves.filter((l) => l.viewType !== viewType);
  }
  getLeftLeaf(): FakeLeaf { const l = new FakeLeaf("", "left"); this.leaves.push(l); return l; }
  getRightLeaf(): FakeLeaf { const l = new FakeLeaf("", "right"); this.leaves.push(l); return l; }
  getLeaf(): FakeLeaf { const l = new FakeLeaf(""); this.leaves.push(l); return l; }
  async revealLeaf(leaf: FakeLeaf): Promise<void> { leaf.revealed = true; }
}

class FakeApp {
  readonly workspace = new FakeWorkspace();
}

/* ---------- data fixtures ---------- */

const GRAPH_JSON = JSON.stringify({
  schema: GRAPH_SCHEMA_TAG,
  nodes: [
    { object_id: "ko-20260921-0001", kind: "hypothesis", status: "active",
      title: "Object A", predecessor: null, successor: null },
    { object_id: "ko-20260921-0002", kind: "reference", status: "active",
      title: "Object B", predecessor: null, successor: null },
  ],
  edges: [{ source: "ko-20260921-0001", target: "ko-20260921-0002", relation: "supports" }],
  unresolved: [],
  diagnostics: [],
});

const graphSource = { read: async () => ({ state: "available" as const, text: GRAPH_JSON }) };
const missingCollab = { readDir: async () => ({ state: "missing" as const }) };
const missingReader: KoSourceReader = { resolve: async () => ({ state: "missing" as const }) };

const openViews: Array<{ onClose(): Promise<void> }> = [];
afterEach(async () => {
  for (const v of openViews.splice(0)) await v.onClose();
  document.body.replaceChildren();
  document.body.classList.remove(RD_SHELL_BODY_CLASS);
});

function makeShell(): {
  app: FakeApp;
  store: RDWorkspaceStore;
  controller: RDShellController;
  browser: CollaborationBrowser;
} {
  const app = new FakeApp();
  const store = new RDWorkspaceStore();
  const controller = new RDShellController(app as unknown as App, store);
  const browser = new CollaborationBrowser();
  return { app, store, controller, browser };
}

function makeWorkspace(
  store: RDWorkspaceStore,
  controller: RDShellController,
  browser: CollaborationBrowser,
): RDWorkspaceShellView {
  const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
    store,
    source: graphSource,
    sourceReader: missingReader,
    collaborationSource: missingCollab,
    openView: async () => {},
    browser,
    shellController: controller,
  });
  openViews.push(view);
  return view;
}

function makeNav(store: RDWorkspaceStore): RDArchiveNavView {
  const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
    store, source: graphSource, openView: async () => {},
  });
  openViews.push(nav);
  return nav;
}

function makeInspector(
  store: RDWorkspaceStore,
  browser: CollaborationBrowser,
  controller: RDShellController,
): RDInspectorView {
  const inspector = new RDInspectorView({} as WorkspaceLeaf, {
    store, source: graphSource, browser, shellController: controller,
  });
  openViews.push(inspector);
  return inspector;
}

/* ---------- 1–3: shell scope lifecycle ---------- */

describe("shell scope lifecycle", () => {
  it("1. attach adds the body class and ensures both dock leaves, without focus theft", async () => {
    const { app, store, controller } = makeShell();
    const view = makeWorkspace(store, controller, new CollaborationBrowser());
    await view.onOpen();
    expect(document.body.classList.contains(RD_SHELL_BODY_CLASS)).toBe(true);
    const ensured = app.workspace.ensured;
    expect(ensured).toEqual([
      { type: "rd-archive-nav", side: "left", options: { active: false } },
      { type: "rd-inspector", side: "right", options: { active: false } },
    ]);
    // no dock leaf is revealed (only the main leaf may be revealed,
    // and attach never touches it)
    expect(app.workspace.leaves.every((l) => !l.revealed)).toBe(true);
  });

  it("2. release removes the class and detaches the dock leaves; dispose is idempotent", async () => {
    const { app, store, controller } = makeShell();
    const view = makeWorkspace(store, controller, new CollaborationBrowser());
    await view.onOpen();
    expect(app.workspace.leaves.length).toBe(2);
    await view.onClose();
    expect(document.body.classList.contains(RD_SHELL_BODY_CLASS)).toBe(false);
    expect(app.workspace.detached.sort()).toEqual(["rd-archive-nav", "rd-inspector"]);
    expect(app.workspace.leaves.length).toBe(0);
    // dispose after release is a safe no-op (plugin unload path)
    controller.dispose();
    controller.dispose();
    expect(document.body.classList.contains(RD_SHELL_BODY_CLASS)).toBe(false);
    expect(app.workspace.detached).toHaveLength(2);
  });

  it("3. repeated activation creates no duplicate leaves; close/reopen is clean", async () => {
    const { app, store, controller } = makeShell();
    const view = makeWorkspace(store, controller, new CollaborationBrowser());
    await view.onOpen();
    await view.onOpen(); // reopen idempotency
    controller.attach(view); // defensive re-attach
    expect(app.workspace.getLeavesOfType("rd-archive-nav")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("rd-inspector")).toHaveLength(1);
    await view.onClose();
    expect(app.workspace.leaves).toHaveLength(0);
    // and a fresh open re-creates exactly one of each
    const view2 = makeWorkspace(store, controller, new CollaborationBrowser());
    await view2.onOpen();
    expect(document.body.classList.contains(RD_SHELL_BODY_CLASS)).toBe(true);
    expect(app.workspace.getLeavesOfType("rd-archive-nav")).toHaveLength(1);
    expect(app.workspace.getLeavesOfType("rd-inspector")).toHaveLength(1);
  });

  it("attach never duplicates a dock leaf that already exists", async () => {
    const { app, store, controller } = makeShell();
    app.workspace.leaves.push(new FakeLeaf("rd-archive-nav", "left"));
    const view = makeWorkspace(store, controller, new CollaborationBrowser());
    await view.onOpen();
    expect(app.workspace.getLeavesOfType("rd-archive-nav")).toHaveLength(1);
    expect(app.workspace.ensured.map((e) => e.type)).toEqual(["rd-inspector"]);
  });
});

/* ---------- 4–6: shared state, no new authority ---------- */

describe("shared session state across the shell", () => {
  it("4. the archive nav reads and writes the SAME store as the workspace", async () => {
    const { store, controller, browser } = makeShell();
    const view = makeWorkspace(store, controller, browser);
    await view.onOpen();
    const nav = makeNav(store);
    await nav.onOpen(); // store already published → no second read needed
    // store → nav: selection appears in the dock
    store.setSelectedObject("ko-20260921-0001");
    expect(nav.contentEl.querySelector(".rdan-selection-id")?.textContent)
      .toBe("ko-20260921-0001");
    // nav → store: row click selects through the shared store
    nav.contentEl
      .querySelector<HTMLButtonElement>('.rdan-object-row[aria-label="inspect ko-20260921-0002"]')!
      .click();
    expect(store.getState().selectedObjectId).toBe("ko-20260921-0002");
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object B");
    });
  });

  it("5. the inspector follows the same selection", async () => {
    const { store, controller, browser } = makeShell();
    const view = makeWorkspace(store, controller, browser);
    await view.onOpen();
    const inspector = makeInspector(store, browser, controller);
    await inspector.onOpen();
    store.setSelectedObject("ko-20260921-0001");
    await vi.waitFor(() => {
      const meta = inspector.contentEl.querySelector(".rdin-meta");
      expect(meta?.textContent).toContain("ko-20260921-0001");
      expect(meta?.textContent).toContain("hypothesis");
    });
    store.setSelectedObject("ko-20260921-0002");
    await vi.waitFor(() => {
      expect(inspector.contentEl.querySelector(".rdin-meta")?.textContent)
        .toContain("ko-20260921-0002");
    });
  });

  it("6. dock views create no KO state: read-only sources, UI store only", () => {
    for (const rel of ["src/views/archive-nav-view.ts", "src/views/inspector-view.ts"]) {
      const src = readFileSync(join(root, rel), "utf-8");
      for (const banned of [
        "vault.modify", "vault.create", "vault.delete", "adapter.write",
        "saveData", "loadData", "localStorage",
        "setInterval", "setTimeout", "registerInterval",
      ]) {
        expect(src, `${rel} must not contain ${banned}`).not.toContain(banned);
      }
    }
  });
});

/* ---------- 7–9: behavior parity ---------- */

describe("behavior parity with the V1 shell", () => {
  it("7. exact-id inspection is unchanged (input → Enter/Inspect → dossier)", async () => {
    const { store, controller, browser } = makeShell();
    const view = makeWorkspace(store, controller, browser);
    await view.onOpen();
    const input = view.contentEl.querySelector<HTMLInputElement>(".rdws-object-input")!;
    expect(input.getAttribute("aria-label")).toBe("Knowledge object id (exact match)");
    expect(input.placeholder).toBe("inspect exact object_id");
    input.value = "ko-20260921-0001";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
    });
    expect(store.getState().selectedObjectId).toBe("ko-20260921-0001");
    // the Inspect button path is identical
    input.value = "ko-20260921-0002";
    view.contentEl.querySelector<HTMLButtonElement>(".rdws-button")!.click();
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object B");
    });
  });

  it("8. collaboration is unchanged: one shared browser, toggle in the nav dock", async () => {
    const { store, controller, browser } = makeShell();
    const view = makeWorkspace(store, controller, browser);
    await view.onOpen();
    const nav = makeNav(store);
    const inspector = makeInspector(store, browser, controller);
    await nav.onOpen();
    await inspector.onOpen();
    // toggle the collaboration surface from the left dock
    const toggle = nav.contentEl.querySelector<HTMLButtonElement>(".rdan-collab-toggle")!;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    toggle.click();
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector(".rdws-collaboration-host")).not.toBeNull();
    });
    expect(nav.contentEl.querySelector<HTMLButtonElement>(".rdan-collab-toggle")!
      .getAttribute("aria-pressed")).toBe("true");
    // the shared browser feeds the inspector's review zone
    await vi.waitFor(() => {
      expect(inspector.contentEl.textContent).toContain("No proposal records found.");
    });
    // toggle back
    nav.contentEl.querySelector<HTMLButtonElement>(".rdan-collab-toggle")!.click();
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector(".rdws-collaboration-host")).toBeNull();
      expect(view.contentEl.textContent).toContain("An investigation desk");
    });
  });

  it("9. decorative marks stay aria-hidden and carry no meaning", async () => {
    const { store, controller, browser } = makeShell();
    const view = makeWorkspace(store, controller, browser);
    store.setSelectedObject("ko-20260921-0001");
    await view.onOpen();
    const mark = view.contentEl.querySelector(".rdws-dossier-mark");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.textContent).toBe("§");
    // nav index marks are pure CSS (::before), no decorative DOM
    const nav = makeNav(store);
    await nav.onOpen();
    for (const el of nav.contentEl.querySelectorAll("[aria-hidden]")) {
      expect(el.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

/* ---------- 10: docks closed / narrow — the case stays usable ---------- */

describe("degraded shell configurations", () => {
  it("10. without any dock or controller the workspace is fully usable; narrow typography pinned", async () => {
    // a bare workspace view: no shellController, no dock leaves
    const store = new RDWorkspaceStore();
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
      store,
      source: graphSource,
      sourceReader: missingReader,
      collaborationSource: missingCollab,
      openView: async () => {},
    });
    openViews.push(view);
    await view.onOpen();
    expect(document.body.classList.contains(RD_SHELL_BODY_CLASS)).toBe(false);
    const input = view.contentEl.querySelector<HTMLInputElement>(".rdws-object-input")!;
    input.value = "ko-20260921-0001";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
    });
    expect(view.contentEl.textContent).toContain("not a validity badge");
    // narrow dossier typography survives the plane removal
    const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");
    expect(css).toMatch(/rdws-narrow \.rdws-ko-title[\s\S]*?font-size: 26px;/);
    expect(css).toMatch(/rdws-narrow \.rdws-center[\s\S]*?padding: 14px 16px 24px 16px;/);
  });
});

/* ---------- 11–12: registry order + selector scope ---------- */

describe("registry and stylesheet guards", () => {
  it("11. registry order: the six originals byte-for-byte, then the two docks", () => {
    const registry = buildRDViewRegistry();
    const regs = registry.registrations_();
    expect(regs.map((r) => r.viewType)).toEqual([
      "rd-context", "rd-investigation-dashboard", "rd-loop-workspace",
      "rd-graph-intelligence", "rd-knowledge-panel", "rd-workspace",
      "rd-archive-nav", "rd-inspector",
    ]);
    expect(regs.map((r) => r.commandId)).toEqual([
      "open-rd-context", "open-rd-investigation", "open-rd-loop-workspace",
      "open-rd-graph-intelligence", "open-rd-knowledge-panel", "open-rd-workspace",
      "open-rd-archive-nav", "open-rd-inspector",
    ]);
    expect(regs[6].placement).toBe("left");
    expect(regs[7].placement).toBe("right");
    expect(regs[6].ribbonIcon).toBeUndefined(); // docks never auto-open
    expect(regs[7].ribbonIcon).toBeUndefined();
  });

  it("12. selector scope: new dock roots exist and every selector stays scoped", () => {
    const css = ["styles.css", "tokens-rational-archive.css"]
      .map((f) => readFileSync(join(root, "styles", f), "utf-8"))
      .join("\n");
    expect(css).toContain(".rd-archive-nav {");
    expect(css).toContain(".rd-inspector {");
    const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const prefixes = [
      ".rd-context", ".rd-investigation", ".rd-loop", ".rd-graph",
      ".rd-knowledge-panel", ".rd-workspace",
      ".rd-archive-nav", ".rd-inspector",
      "body.rd-rational-archive-shell", "[data-rd-theme",
    ];
    for (const chunk of cleaned.split("}")) {
      const idx = chunk.indexOf("{");
      if (idx === -1) continue;
      const selector = chunk.slice(0, idx).trim();
      if (selector === "" || selector.startsWith("@")) continue;
      if (selector === "from" || selector === "to" || /^\d+(\.\d+)?%$/.test(selector)) continue;
      for (const part of selector.split(",")) {
        const s = part.trim();
        if (s === "") continue;
        expect(prefixes.some((p) => s.startsWith(p)), `unscoped selector: ${s}`).toBe(true);
      }
    }
  });
});
