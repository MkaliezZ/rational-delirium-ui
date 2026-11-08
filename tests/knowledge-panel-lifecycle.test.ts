import { afterEach, describe, expect, it, vi } from "vitest";
import type { Plugin, WorkspaceLeaf } from "obsidian";
import { RDKnowledgePanelView } from "../src/views/knowledge-panel-view";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { ObsidianKoSourceReaderImpl } from "../src/architecture/obsidian-graph-ports";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import type { KoDetailResult, KoSourceReader } from "../src/semantic-graph/ko-detail-reader";

const A = "ko-20261107-0001", B = "ko-20261107-0002";
const graph = (title = "A") => JSON.stringify({schema: "rd-semantic-graph-projection/1", nodes: [A, B].map(object_id => ({
  object_id, kind: "concept", status: "active", title: object_id === A ? title : "B", predecessor: null, successor: null,
})), edges: [], unresolved: [], diagnostics: []});
const detail = (object_id: string, evidence: string): KoDetailResult => ({state: "available", path: `${object_id}.md`,
  frontmatter: {object_id, title: object_id, kind: "concept", status: "active", provenance: {evidence}}});
const views: Array<{onClose(): Promise<void>}> = [];
afterEach(async () => {for (const view of views.splice(0)) await view.onClose(); document.body.replaceChildren();});
const inspect = (view: RDKnowledgePanelView, id: string) => {
  view.contentEl.querySelector<HTMLInputElement>("input")!.value = id;
  view.contentEl.querySelector<HTMLButtonElement>("button")!.click();
};
const drain = async () => {for (let i = 0; i < 30; i++) await Promise.resolve();};

describe("Knowledge Panel source lifecycle", () => {
  it("one Inspect with the real reader completes without rendering another disk read", async () => {
    const note = `---\nobject_id: ${A}\nkind: concept\nstatus: active\ntitle: A\nprovenance:\n  evidence: One saved source\n---\n`;
    const read = vi.fn(async () => note);
    const reader = new ObsidianKoSourceReaderImpl({app: {vault: {getMarkdownFiles: () => [{path: "Notes/a.md"}], adapter: {read}}}} as unknown as Plugin);
    const view = new RDKnowledgePanelView({} as WorkspaceLeaf, {workspace: "test", source: {read: async () => ({state: "available", text: graph()})}, sourceReader: reader});
    views.push(view); await view.onOpen(); inspect(view, A);
    await vi.waitFor(() => expect(view.contentEl.textContent).toContain("One saved source"));
    await drain(); expect(read).toHaveBeenCalledTimes(2); // one discovery + one current source
  });

  it("A completing after B never replaces B's provenance", async () => {
    const pending = new Map<string, (d: KoDetailResult) => void>();
    const reader = {resolve: (id: string) => new Promise<KoDetailResult>(r => pending.set(id, r))};
    const view = new RDKnowledgePanelView({} as WorkspaceLeaf, {workspace: "test", source: {read: async () => ({state: "available", text: graph()})}, sourceReader: reader});
    views.push(view); await view.onOpen(); inspect(view, A); inspect(view, B);
    pending.get(B)!(detail(B, "B EVIDENCE")); await drain(); pending.get(A)!(detail(A, "A EVIDENCE")); await drain();
    expect(view.contentEl.textContent).toContain("B EVIDENCE"); expect(view.contentEl.textContent).not.toContain("A EVIDENCE");
  });

  it("refresh re-reads the selected source and a close discards pending results", async () => {
    let evidence = "BEFORE";
    const resolve = vi.fn(async () => detail(A, evidence));
    const view = new RDKnowledgePanelView({} as WorkspaceLeaf, {workspace: "test", source: {read: async () => ({state: "available", text: graph()})}, sourceReader: {resolve}});
    views.push(view); await view.onOpen(); inspect(view, A); await drain();
    evidence = "AFTER"; view.contentEl.querySelectorAll<HTMLButtonElement>("button")[1].click();
    await vi.waitFor(() => expect(view.contentEl.textContent).toContain("AFTER"));
    expect(resolve).toHaveBeenCalledTimes(2);
    await view.onClose(); await view.onOpen(); await drain();
    expect(view.contentEl.textContent).toContain("AFTER");
    await view.onClose(); await drain(); expect(view.contentEl.childElementCount).toBe(0);
  });

  it("a reader failure is rendered once and does not cause an unhandled retry loop", async () => {
    const resolve = vi.fn(async (): Promise<KoDetailResult> => {throw new Error("Offline source");});
    const view = new RDKnowledgePanelView({} as WorkspaceLeaf, {workspace: "test", source: {read: async () => ({state: "available", text: graph()})}, sourceReader: {resolve}});
    views.push(view); await view.onOpen(); inspect(view, A); await drain();
    expect(resolve).toHaveBeenCalledOnce(); expect(view.contentEl.textContent).toContain("unavailable");
  });
});

describe("Workspace re-read lifecycle", () => {
  it("refreshing a stable selection refreshes provenance, and reopening re-reads artifacts", async () => {
    let title = "BEFORE TITLE", evidence = "BEFORE EVIDENCE";
    const read = vi.fn(async () => ({state: "available" as const, text: graph(title)}));
    const resolve = vi.fn(async () => detail(A, evidence));
    const invalidate = vi.fn();
    const reader: KoSourceReader = {resolve, invalidate};
    const store = new RDWorkspaceStore(); store.setSelectedObject(A);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {store, source: {read}, sourceReader: reader, openView: async () => {}});
    views.push(view); await view.onOpen(); await drain();
    title = "AFTER TITLE"; evidence = "AFTER EVIDENCE"; await view.refreshAvailability(); await drain();
    expect(view.contentEl.textContent).toContain("AFTER TITLE"); expect(view.contentEl.textContent).toContain("AFTER EVIDENCE");
    expect(view.contentEl.textContent).not.toContain("BEFORE EVIDENCE");
    title = "REOPENED TITLE"; await view.onClose(); await view.onOpen(); await drain();
    expect(view.contentEl.textContent).toContain("REOPENED TITLE");
    expect(read).toHaveBeenCalledTimes(3); expect(invalidate).toHaveBeenCalled();
  });

  it("a source request from a closed view cannot overwrite the reopened selection", async () => {
    let complete!: (value: KoDetailResult) => void;
    const resolve = vi.fn().mockImplementationOnce(() => new Promise<KoDetailResult>(r => {complete = r;}))
      .mockResolvedValue(detail(A, "CURRENT EVIDENCE"));
    const store = new RDWorkspaceStore(); store.setSelectedObject(A);
    const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {store, source: {read: async () => ({state: "available", text: graph()})}, sourceReader: {resolve}, openView: async () => {}});
    views.push(view); await view.onOpen(); await view.onClose(); await view.onOpen(); await drain();
    complete(detail(A, "STALE EVIDENCE")); await drain();
    expect(view.contentEl.textContent).toContain("CURRENT EVIDENCE"); expect(view.contentEl.textContent).not.toContain("STALE EVIDENCE");
  });
});
