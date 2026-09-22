import { describe, expect, it, vi } from "vitest";
import type { App, Plugin, WorkspaceLeaf } from "obsidian";
import { RDShellController } from "../src/architecture/rd-shell-controller";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { activateRDView, type RDViewRegistration } from "../src/architecture/view-registry";

function host() {
  const callbacks: Array<() => void> = [];
  const unloaders: Array<() => void> = [];
  const leaves: Array<{type: string; setViewState: ReturnType<typeof vi.fn>}> = [];
  const workspace = {
    layoutReady: false,
    onLayoutReady: (cb: () => void) => callbacks.push(cb),
    getLeavesOfType: (type: string) => leaves.filter(l => l.type === type),
    ensureSideLeaf: vi.fn(async (type: string) => { leaves.push({ type, setViewState: vi.fn() }); }),
    detachLeavesOfType: vi.fn(),
    getLeaf: vi.fn(() => { throw Error("must reuse restored leaf"); }),
    revealLeaf: vi.fn(),
  };
  return { workspace, leaves, unloaders, plugin: { app: { workspace }, register: (cb: () => void) => unloaders.push(cb) } as unknown as Plugin,
    ready() { workspace.layoutReady = true; for (const cb of callbacks.splice(0)) cb(); } };
}
const registration = { viewType: "rd-workspace", placement: "main" } as RDViewRegistration;
describe("Home layout restoration", () => {
  it("cold shell waits, then reuses restored docks without creating leaves", () => {
    const h = host(); const shell = new RDShellController({ workspace: h.workspace } as unknown as App, new RDWorkspaceStore());
    const view = {} as RDWorkspaceShellView;
    shell.attach(view); shell.attach(view);
    expect(h.workspace.ensureSideLeaf).not.toHaveBeenCalled();
    h.leaves.push(...["rd-archive-nav", "rd-inspector"].map(type => ({ type, setViewState: vi.fn() })));
    h.ready(); expect(h.workspace.ensureSideLeaf).not.toHaveBeenCalled();
    expect(document.body.classList.contains("rd-rational-archive-shell")).toBe(true);
    shell.dispose();
  });
  it("close/unload cancels delayed shell activation", () => {
    const h = host(); const shell = new RDShellController({ workspace: h.workspace } as unknown as App, new RDWorkspaceStore());
    shell.attach({} as RDWorkspaceShellView); shell.dispose(); h.ready();
    expect(h.workspace.ensureSideLeaf).not.toHaveBeenCalled();
    expect(document.body.classList.contains("rd-rational-archive-shell")).toBe(false);
  });
  it("explicit Home activation during restore waits for the restored main leaf", async () => {
    const h = host(); const pending = activateRDView(h.plugin, registration);
    expect(h.workspace.getLeaf).not.toHaveBeenCalled();
    const leaf = { type: "rd-workspace", setViewState: vi.fn(async () => {}) }; h.leaves.push(leaf);
    h.ready(); await pending;
    expect(leaf.setViewState).toHaveBeenCalledOnce(); expect(h.workspace.revealLeaf).toHaveBeenCalledWith(leaf);
    expect(h.workspace.getLeaf).not.toHaveBeenCalled();
  });
  it("unload cancels queued explicit activation", async () => {
    const h = host(); const pending = activateRDView(h.plugin, registration);
    h.unloaders.forEach(cb => cb()); h.ready(); await pending;
    expect(h.workspace.getLeaf).not.toHaveBeenCalled(); expect(h.workspace.revealLeaf).not.toHaveBeenCalled();
  });
  it("closed Home does not continue initialization after delayed snapshot readiness", async () => {
    let resolve!: (r: {state: "missing"}) => void;
    const readDir = vi.fn(async () => ({ state: "missing" as const }));
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, { store: new RDWorkspaceStore(),
      source: { read: () => new Promise(r => { resolve = r; }) }, collaborationSource: { readDir }, openView: async () => {} });
    const opening = view.onOpen(); await view.onClose(); resolve({state: "missing"}); await opening;
    expect(readDir).not.toHaveBeenCalled(); expect(view.contentEl.children).toHaveLength(0);
    view.contentEl.remove();
  });
});
