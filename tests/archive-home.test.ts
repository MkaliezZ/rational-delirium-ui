import { describe, expect, it, vi } from "vitest";
import { renderArchiveHome } from "../src/views/archive-home";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import type { GraphLoadResult } from "../src/semantic-graph/graph-loader";

const loaded: GraphLoadResult = { state: "available", graph: {
  schema: "rd-semantic-graph-projection/1",
  nodes: [{ object_id: "KO-A", kind: "hypothesis", status: "candidate", title: "Declared title", predecessor: null, successor: null }],
  edges: [], unresolved: [{ source: "KO-A", target: "MISSING", relation: "supports" }],
  diagnostics: [{ type: "duplicate_object_id", object_id: "KO-B", paths: ["one.md", "two.md"] }],
} };
function render(snapshot: GraphLoadResult | null) {
  const host = document.createElement("div");
  const inspect = vi.fn();
  const collaboration = vi.fn();
  renderArchiveHome(host, snapshot, null, inspect, collaboration);
  return { host, inspect, collaboration };
}
describe("Archive Home", () => {
  it("cold state does not invent zero knowledge or zero contributions", () => {
    const { host } = render(null);
    expect(host.textContent).toContain("not_loaded");
    expect(host.textContent).not.toContain("No proposal records found");
    expect(host.querySelectorAll(".rdah-object")).toHaveLength(0);
  });
  it("empty snapshot is scoped to snapshot rather than Vault", () => {
    if (loaded.state !== "available") throw Error();
    const { host } = render({ state: "available", graph: { ...loaded.graph, nodes: [] } });
    expect(host.textContent).toContain("No objects in this snapshot. This is not a Vault inventory.");
  });
  it.each([ { state: "missing" }, { state: "unavailable", reason: "read failed" }, { state: "invalid", reason: "malformed-json" } ] as const)("honest $state snapshot keeps collaboration navigation", (snapshot) => {
    const { host, collaboration } = render(snapshot);
    expect(host.textContent).toContain(`Semantic snapshot: ${snapshot.state}`);
    (host.querySelector("button") as HTMLButtonElement).click();
    expect(collaboration).toHaveBeenCalledOnce();
  });
  it("preserves declared identity, lifecycle, unresolved targets and diagnostic paths", () => {
    const { host, inspect } = render(loaded);
    expect(host.textContent).toContain("KO-A · hypothesis · candidate");
    expect(host.textContent).toContain("KO-A → MISSING");
    expect(host.textContent).toContain("one.md\ntwo.md");
    expect(host.querySelectorAll(".rdah-object")).toHaveLength(1);
    (host.querySelector(".rdah-object") as HTMLButtonElement).click();
    expect(inspect).toHaveBeenCalledWith("KO-A");
  });
  it("returning Home preserves selection history and permits subsequent selection", () => {
    const store = new RDWorkspaceStore();
    store.setSelectedObject("KO-A");
    store.setSelectedObject(null);
    expect(store.getState().selectedObjectId).toBeNull();
    expect(store.getState().navigation).toEqual(["KO-A"]);
    store.setSelectedObject("KO-B");
    expect(store.getState().navigation).toEqual(["KO-A", "KO-B"]);
    store.back();
    expect(store.getState().selectedObjectId).toBe("KO-A");
  });
});

import type { WorkspaceLeaf } from "obsidian";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";
import { GraphSnapshotCoordinator } from "../src/architecture/graph-snapshot-coordinator";
import { readFileSync } from "node:fs";

describe("Home Workspace integration", () => {
  it("cold open, selection and Home reuse one published snapshot and preserve history", async () => {
    if (loaded.state !== "available") throw Error();
    const store = new RDWorkspaceStore();
    const read = vi.fn(async () => ({ state: "available" as const, text: JSON.stringify(loaded.graph) }));
    const source = { read };
    const coordinator = new GraphSnapshotCoordinator(store, source);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, { store, source, coordinator, openView: async () => {} });
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, { store, source, coordinator, openView: async () => {} });
    try {
      await view.onOpen(); await nav.onOpen();
      expect(view.contentEl.querySelector(".rd-archive-home")).not.toBeNull();
      (view.contentEl.querySelector(".rdah-object") as HTMLButtonElement).click();
      expect(view.contentEl.querySelector(".rd-archive-home")).toBeNull();
      expect(view.contentEl.textContent).toContain("Declared title");
      const home = [...nav.contentEl.querySelectorAll("button")].find(b => b.textContent === "Archive Home")!;
      home.click();
      expect(store.getState().navigation).toEqual(["KO-A"]);
      expect(view.contentEl.querySelector(".rd-archive-home")).not.toBeNull();
      expect(read).toHaveBeenCalledOnce();
      store.setSelectedObject("KO-A");
      store.setGraphSnapshot({ state: "missing" });
      expect(view.contentEl.querySelector(".rd-archive-home")).toBeNull();
      expect(view.contentEl.textContent).toContain("KO-A");
    } finally {
      await view.onClose(); await nav.onClose();
      view.contentEl.remove(); nav.contentEl.remove();
    }
  });
  it("every Home CSS selector requires Workspace and Home roots", () => {
    const css = readFileSync("styles/styles.css", "utf8").split("/* Archive Home:")[1].split("/* KO Surface:")[0];
    const sheet = new CSSStyleSheet(); sheet.replaceSync(css.slice(css.indexOf("*/") + 2));
    for (const rule of [...sheet.cssRules]) {
      for (const selector of (rule as CSSStyleRule).selectorText.split(",")) {
        expect(selector.trim()).toMatch(/^\.rd-workspace-shell \.rd-archive-home(?:\s|$)/);
      }
    }
  });
});
