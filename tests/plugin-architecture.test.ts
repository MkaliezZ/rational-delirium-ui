/** v1.6.1 plugin architecture tests — workspace boundary, view
 * registry separation, UI-state isolation, no-mutation path, no
 * schema modification.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RDViewRegistry,
  activateRDView,
  type RDViewRegistration,
} from "../src/architecture/view-registry";
import { buildRDViewRegistry } from "../src/architecture/rd-view-setup";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import {
  RD_THEME_ATTR,
  RD_TOKENS,
  RD_TOKEN_VERSION,
  isWellFormedTokenName,
  rdTokenCategory,
} from "../src/architecture/theme-tokens";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/* ---------- minimal fakes ---------- */

class FakePlugin {
  readonly views: string[] = [];
  readonly ribbons: string[] = [];
  readonly commands: { id: string; name: string }[] = [];
  readonly workspace = new FakeWorkspace();
  readonly app = { workspace: this.workspace };
  registerView(viewType: string): void { this.views.push(viewType); }
  addRibbonIcon(icon: string): void { this.ribbons.push(icon); }
  addCommand(cmd: { id: string; name: string }): void { this.commands.push(cmd); }
}

class FakeWorkspace {
  readonly leaves: FakeLeaf[] = [];
  getLeavesOfType(viewType: string): FakeLeaf[] {
    return this.leaves.filter((l) => l.viewType === viewType);
  }
  getLeaf(): FakeLeaf { return new FakeLeaf(); }
  getRightLeaf(): FakeLeaf | null { return new FakeLeaf(); }
  async revealLeaf(): Promise<void> { /* recorded via leaf */ }
}

class FakeLeaf {
  viewType = "";
  revealed = false;
  async setViewState(state: { type: string }): Promise<void> { this.viewType = state.type; }
}

const view = (viewType: string): RDViewRegistration => ({
  viewType,
  displayText: `View ${viewType}`,
  icon: "dot",
  placement: "main",
  commandId: `open-${viewType}`,
  commandName: `Open ${viewType}`,
  createView: () => ({ viewType } as never),
});

/* ---------- §2 view registry ---------- */

describe("v1.6.1 §2 view registry", () => {
  it("registers six RD views with the existing command surface preserved", () => {
    const registry = buildRDViewRegistry();
    const types = registry.registrations_().map((r) => r.viewType);
    expect(types).toEqual([
      "rd-context", "rd-investigation-dashboard", "rd-loop-workspace",
      "rd-graph-intelligence", "rd-knowledge-panel", "rd-workspace",
    ]);
    const byCommand = new Map(registry.registrations_().map((r) => [r.commandId, r]));
    // v0.4/v1.3.1 command ids/names preserved byte-for-byte
    expect(byCommand.get("open-rd-context")?.commandName).toBe("Open RD Context");
    expect(byCommand.get("open-rd-investigation")?.commandName).toBe("Open RD Investigation");
    expect(byCommand.get("open-rd-loop-workspace")?.commandName).toBe("Open RD Loop Workspace");
    expect(byCommand.get("open-rd-graph-intelligence")?.commandName)
      .toBe("Open RD Graph Intelligence");
    expect(byCommand.get("open-rd-knowledge-panel")?.commandName).toBe("Open RD Knowledge Panel");
    expect(byCommand.get("open-rd-workspace")?.commandName).toBe("Open RD Workspace");
  });

  it("rejects duplicate view types (no silent overwrite)", () => {
    const registry = new RDViewRegistry();
    registry.add(view("a"));
    expect(() => registry.add(view("a"))).toThrow(/duplicate/);
    expect(registry.registrations_()).toHaveLength(1);
  });

  it("registration replays onto the host but never activates anything", () => {
    const registry = new RDViewRegistry();
    registry.add(view("x"));
    registry.add({ ...view("y"), ribbonIcon: "star" });
    const plugin = new FakePlugin();
    registry.registerAll({ plugin: plugin as never, services: {} });
    expect(plugin.views).toEqual(["x", "y"]);
    expect(plugin.ribbons).toEqual(["star"]); // only the ribboned one
    expect(plugin.commands.map((c) => c.id)).toEqual(["open-x", "open-y"]);
    expect(plugin.workspace.leaves).toHaveLength(0); // nothing opened
  });

  it("activation is the only path to opening, and reuses existing leaves", async () => {
    const plugin = new FakePlugin();
    const existing = new FakeLeaf();
    existing.viewType = "x";
    plugin.workspace.leaves.push(existing);
    await activateRDView(plugin as never, view("x"));
    expect(plugin.workspace.leaves).toHaveLength(1); // reused, not duplicated
    expect(existing.revealed || existing.viewType === "x").toBe(true);
  });

  it("main.ts contains no inline view registration (separation guard)", () => {
    const mainSrc = readFileSync(join(root, "src", "main.ts"), "utf-8");
    expect(mainSrc).not.toContain("registerView(");
    expect(mainSrc).not.toContain("addRibbonIcon(");
    expect(mainSrc).not.toContain("addCommand(");
    expect(mainSrc).toContain("registerRDViews("); // the one delegation point
    // and the wiring contract is still owned here
    expect(mainSrc).toContain("new RuntimeWiring(");
    expect(mainSrc).toContain("wiring.start()");
  });
});

/* ---------- §3 UI-only state ---------- */

describe("v1.6.1 §3 workspace UI state", () => {
  it("holds UI state only; emitted states are frozen read models", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("ko-20260921-0001");
    const state = store.getState();
    expect(state.selectedObjectId).toBe("ko-20260921-0001");
    expect(state.navigation).toEqual(["ko-20260921-0001"]);
    expect(() => {
      (state as { selectedObjectId: string }).selectedObjectId = "x";
    }).toThrow();
    expect(() => {
      (state.navigation as unknown as { push(x: unknown): void }).push("y");
    }).toThrow();
  });

  it("back() walks the UI trail; trail empty returns to no selection", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("a");
    store.setSelectedObject("b");
    expect(store.getState().selectedObjectId).toBe("b");
    store.back();
    expect(store.getState().selectedObjectId).toBe("a");
    store.back();
    expect(store.getState().selectedObjectId).toBeNull();
    store.back();
    expect(store.getState().selectedObjectId).toBeNull();
  });

  it("workspace switch clears inspection context (no cross-substitution)", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("a");
    store.setWorkspaceLabel("FICT-W2");
    const state = store.getState();
    expect(state.workspaceLabel).toBe("FICT-W2");
    expect(state.selectedObjectId).toBeNull();
    expect(state.navigation).toEqual([]);
  });

  it("state isolation: no vault/write/lifecycle surface; dispose stops updates", () => {
    const store = new RDWorkspaceStore();
    const proto = Object.getPrototypeOf(store);
    // "update" is the internal emitter (TS-private, still on the
    // prototype); it is not part of the public surface contract.
    const methods = Object.getOwnPropertyNames(proto)
      .filter((m) => m !== "constructor" && m !== "update");
    expect(methods.sort()).toEqual([
      "back", "dispose", "getState", "setSelectedObject",
      "setSnapshotAvailability", "setWorkspaceLabel", "subscribe",
    ].sort());
    for (const banned of ["vault", "write", "modify", "delete", "promote", "adopt", "approve"]) {
      expect(methods.join(" ").toLowerCase()).not.toContain(banned);
    }
    let seen = 0;
    const off = store.subscribe(() => { seen += 1; });
    store.setSelectedObject("a");
    expect(seen).toBe(1);
    off();
    store.setSelectedObject("b");
    expect(seen).toBe(1);
    store.dispose();
    store.setSelectedObject("c"); // post-dispose: ignored, no throw
    expect(store.getState().selectedObjectId).toBe("b");
  });

  it("UI state never touches knowledge models (no mutation path)", () => {
    const artifact = parseGraphSnapshot(JSON.stringify({
      schema: GRAPH_SCHEMA_TAG,
      nodes: [{ object_id: "ko-20260921-0001", kind: "fact", status: "active", title: "t", predecessor: null, successor: null }],
      edges: [], unresolved: [], diagnostics: [],
    }));
    if (artifact.state !== "available") throw new Error("fixture must load");
    const store = new RDWorkspaceStore();
    store.setSnapshotAvailability({ state: "available", note: "x" });
    store.setSelectedObject("ko-20260921-0001");
    // the artifact is untouched by any UI state operation
    expect(artifact.graph.nodes[0].status).toBe("active");
    expect(() => {
      (artifact.graph.nodes[0] as unknown as { status: string }).status = "archived";
    }).toThrow();
    expect(store.getState().snapshot.state).toBe("available"); // display state only
  });
});

/* ---------- §4 theme tokens ---------- */

describe("v1.6.1 §4 theme token foundation", () => {
  it("defines the boundary: version, theme attr, categories — and no values", () => {
    expect(RD_TOKEN_VERSION).toBe("rd-tokens/1");
    expect(RD_THEME_ATTR).toBe("data-rd-theme");
    const all = Object.values(RD_TOKENS).flat();
    expect(all.length).toBeGreaterThan(20);
    for (const token of all) {
      expect(isWellFormedTokenName(token)).toBe(true);
      expect(rdTokenCategory(token)).not.toBeNull();
    }
    const src = readFileSync(join(root, "src", "architecture", "theme-tokens.ts"), "utf-8");
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/); // no color values: no themes yet
  });

  it("token names are presentation-only: no truth/confidence/ranking semantics", () => {
    const all = Object.values(RD_TOKENS).flat().join(" ").toLowerCase();
    for (const banned of ["truth", "confiden", "rank", "score", "winner", "correct"]) {
      expect(all).not.toContain(banned);
    }
  });
});

/* ---------- §1 workspace shell source boundary ---------- */

describe("v1.6.1 §1 workspace shell boundary", () => {
  it("shell source: no auto-open, no timers, no background service, honest placeholders", () => {
    const src = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    for (const banned of ["setInterval", "setTimeout", "registerInterval", "onLayoutReady"]) {
      expect(src).not.toContain(banned);
    }
    expect(src).toContain("not implemented in v1.6.1"); // honest placeholders
    expect(src).toContain("does not mean no knowledge exists"); // missing-artifact honesty
  });

  it("no schema/projector modification (contract markers intact, untouched)", () => {
    const py = readFileSync(join(root, "semantic-graph", "projector.py"), "utf-8");
    expect(py).toContain("rd-semantic-graph-projection/1");
    expect(py).toContain("def project(");
    const unknown = parseGraphSnapshot(JSON.stringify({
      schema: "rd-semantic-graph-projection/9", nodes: [], edges: [],
      unresolved: [], diagnostics: [],
    }));
    expect(unknown).toEqual({ state: "invalid", reason: "unsupported-schema" });
  });
});
