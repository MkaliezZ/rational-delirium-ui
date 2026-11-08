import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingPathScheduler } from "../src/index/update-scheduler";
import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";
import type { CollaborationArtifactSource, DirReadResult } from "../src/collaboration/artifact-reader";
import { RuntimeWiring } from "../src/runtime/runtime-wiring";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import { FakeWorkspace, FakeVault } from "./support/fake-obsidian-host";

afterEach(() => vi.useRealTimers());
describe("saved-note debounce", () => {
  it("publishes a single edit after the quiet interval rather than waiting for the maximum", () => {
    vi.useFakeTimers(); const task = vi.fn(); const scheduler = new PendingPathScheduler(task);
    scheduler.schedule("Notes/a.md"); vi.advanceTimersByTime(249); expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(task).toHaveBeenCalledExactlyOnceWith("Notes/a.md"); scheduler.dispose();
  });
  it("bounds continuous edits by the maximum wait", () => {
    vi.useFakeTimers(); const task = vi.fn(); const scheduler = new PendingPathScheduler(task);
    scheduler.schedule("Notes/a.md");
    for (let i = 0; i < 9; i++) {vi.advanceTimersByTime(100); scheduler.schedule("Notes/a.md");}
    expect(task).not.toHaveBeenCalled(); vi.advanceTimersByTime(100);
    expect(task).toHaveBeenCalledExactlyOnceWith("Notes/a.md"); scheduler.dispose();
  });
  it("editing a different note cannot postpone an earlier note indefinitely", () => {
    vi.useFakeTimers(); const task = vi.fn(); const scheduler = new PendingPathScheduler(task);
    scheduler.schedule("Notes/a.md"); vi.advanceTimersByTime(200); scheduler.schedule("Notes/b.md");
    vi.advanceTimersByTime(50); expect(task).toHaveBeenCalledWith("Notes/a.md");
    expect(task).not.toHaveBeenCalledWith("Notes/b.md");
    vi.advanceTimersByTime(200); expect(task).toHaveBeenCalledWith("Notes/b.md"); scheduler.dispose();
  });
});

describe("collaboration refresh lifecycle", () => {
  it("an automatic refresh preserves the user's selected record and trail", async () => {
    const browser = new CollaborationBrowser();
    const source = {readDir: async (): Promise<DirReadResult> => ({state: "missing"})};
    browser.select("proposal", ".proposals/p.md"); const before = browser.getState();
    await browser.refresh(source, true);
    expect(browser.getState().selectedArtifact).toEqual(before.selectedArtifact);
    expect(browser.getState().trail).toEqual(before.trail); browser.dispose();
  });
  it("a late refresh cannot replace newer records or publish after disposal", async () => {
    const browser = new CollaborationBrowser(); const finish: Array<() => void> = [];
    const delayed: CollaborationArtifactSource = {readDir: () => new Promise(resolve => finish.push(() => resolve({state: "missing"})))};
    const pending = browser.refresh(delayed);
    await browser.refresh({readDir: async () => ({state: "unavailable", reason: "NEWER STATE"})});
    for (const settle of finish) settle(); await pending;
    expect(browser.getState().model?.dirs.proposal).toBe("unavailable");
    const listener = vi.fn(); browser.subscribe(listener); browser.dispose();
    await browser.refresh({readDir: async () => ({state: "missing"})}); expect(listener).not.toHaveBeenCalled();
  });
});

describe("full refresh recovery", () => {
  it("a failed full scan exposes ERROR and a subsequent refresh restores live updates", async () => {
    const adapter = new FakeAdapter(); adapter.set("CASES/c.md", fixtureNote({path: "CASES/c.md", id: "C-1", type: "case"}));
    const wiring = new RuntimeWiring(adapter, new FakeWorkspace(), new FakeVault(), {open: async () => {}, activeSurface: () => "editor"});
    await wiring.start(); vi.spyOn(adapter, "list").mockImplementationOnce(() => {throw new Error("Temporary failure");});
    await expect(wiring.refresh()).rejects.toThrow("Temporary failure"); expect(wiring.index.state).toBe("ERROR");
    await wiring.refresh(); expect(wiring.index.state).toBe("READY"); expect(wiring.buildPhase).toBe("LIVE"); wiring.dispose();
  });
});
