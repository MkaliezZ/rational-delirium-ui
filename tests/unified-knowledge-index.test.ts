import { CollaborationBrowser } from "../src/collaboration/collaboration-surface";
import { RDShellController } from "../src/architecture/rd-shell-controller";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { App, Plugin, WorkspaceLeaf } from "obsidian";
import { RDIndex } from "../src/index/rd-index";
import { RuntimeWiring } from "../src/runtime/runtime-wiring";
import { IndexedGraphSource } from "../src/semantic-graph/index-graph-source";
import { ObsidianKoSourceReaderImpl } from "../src/architecture/obsidian-graph-ports";
import { GraphSnapshotCoordinator } from "../src/architecture/graph-snapshot-coordinator";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";
import { RDInspectorView } from "../src/views/inspector-view";
import { buildGraphProjection } from "../src/graph/graph-projection";
import { parseObject } from "../src/parsers/object-parser";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import { FakeVault, FakeWorkspace } from "./support/fake-obsidian-host";

const ID = "ko-20261107-0001";
const KO_PATH = "Knowledge/idea.md";
const ko = (title = "Idea", evidence = "Saved source", extra = "") =>
  `---\nobject_id: ${ID}\nkind: hypothesis\nstatus: active\ntitle: ${JSON.stringify(title)}\nprovenance:\n  evidence: |\n    ${evidence}\n${extra}\n---\n# Body\n`;
const legacy = () => fixtureNote({path: "EVIDENCE/e.md", type: "evidence", id: "E-1", status: "verified",
  frontmatterExtra: ['supports: "[[Knowledge/idea]]"']});
const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); document.body.replaceChildren(); });

describe("one saved-note index for both schemas", () => {
  it("preserves old ids/types/statuses and joins ID and wikilink relations across schemas", async () => {
    const adapter = new FakeAdapter();
    adapter.set("EVIDENCE/e.md", legacy());
    adapter.set(KO_PATH, ko('A "quoted" idea', "line one\n    line two", "depends_on: [E-1]"));
    const index = new RDIndex(adapter); await index.build();
    const graph = index.semanticSnapshot();
    expect(graph.nodes.map(n => [n.object_id, n.kind, n.status])).toEqual([
      ["E-1", "evidence", "verified"], [ID, "hypothesis", "active"],
    ]);
    expect(graph.edges).toEqual(expect.arrayContaining([
      {source: "E-1", target: ID, relation: "supports"}, {source: ID, target: "E-1", relation: "depends_on"},
    ]));
    expect(graph.unresolved).toHaveLength(0);
    const detail = index.detailById(ID);
    expect(detail.state === "available" && detail.frontmatter.provenance?.evidence).toBe("line one\nline two\n");
    expect(detail.state === "available" && detail.frontmatter.title).toBe('A "quoted" idea');
    expect(buildGraphProjection(index, KO_PATH).firstHop).toHaveLength(2);
    expect(buildGraphProjection(index, KO_PATH).selectableObjects.map(o => o.id)).toContain(ID);
    expect(adapter.reads).toBe(2);
  });

  it("resolves an explicit id without filename fallback", async () => {
    const adapter = new FakeAdapter();
    adapter.set("EVIDENCE/e.md", legacy());
    adapter.set(KO_PATH, ko("Idea", "source", "supports: [E-1]"));
    adapter.set("Knowledge/E-1.md", ko("Different object").replace(ID, "ko-20261107-0002"));
    const index = new RDIndex(adapter); await index.build();
    const relation = index.relations.find(r => r.source.objectId === ID)!;
    expect(relation.target.path).toBe("EVIDENCE/e.md");
  });

  it("keeps invalid declarations diagnostic and refuses conflicting or ambiguous identities", async () => {
    const adapter = new FakeAdapter();
    adapter.set(KO_PATH, ko());
    adapter.set("Knowledge/copy.md", ko().replace("kind: hypothesis", "kind: unknown"));
    adapter.set("Knowledge/conflict.md", ko().replace(ID, "ko-20261107-0003").replace("kind:", "id: OTHER\nkind:"));
    const index = new RDIndex(adapter); await index.build();
    expect(index.detailById(ID)).toEqual({state: "ambiguous", paths: ["Knowledge/copy.md", KO_PATH]});
    expect(index.semanticSnapshot().nodes).toHaveLength(0);
    expect(index.semanticSnapshot().diagnostics.map(d => d.type)).toEqual(expect.arrayContaining([
      "duplicate_identity", "invalid-ko-kind", "conflicting-identity",
    ]));
  });

  it("excludes template, attachment, hidden and traversal sources while ordinary notes stay ordinary", async () => {
    const adapter = new FakeAdapter();
    for (const path of ["Templates/k.md", "templates/k.md", "Attachments/k.md", ".obsidian/k.md", ".proposals/p.md", "CASES/../escape.md"]) adapter.set(path, ko());
    adapter.set("Notes/ordinary.md", "# Ordinary note");
    const index = new RDIndex(adapter); await index.build();
    expect(index.snapshot().objects).toHaveLength(0);
    expect(adapter.reads).toBe(1);
  });

  it("reports malformed YAML and invalid KO lifecycle rather than silently dropping them", async () => {
    const adapter = new FakeAdapter();
    adapter.set(KO_PATH, ko().replace("status: active", "status: unsupported"));
    adapter.set("Notes/broken.md", "---\nobject_id: [unterminated\n---\n");
    const index = new RDIndex(adapter); await index.build();
    expect(index.semanticSnapshot().diagnostics.map(d => d.type)).toEqual(expect.arrayContaining([
      "frontmatter-invalid-yaml", "invalid-ko-status",
    ]));
    expect(parseObject(KO_PATH, ko("no", "source", "supports: [null, 42]"), 1, 1).diagnostics.map(d => d.code)).toContain("frontmatter-relation-type");
  });
});

describe("production event stream through every knowledge surface", () => {
  it("filters titles/ids and keeps the filter active across live updates", async () => {
    const adapter = new FakeAdapter(); adapter.set(KO_PATH, ko()); adapter.set("EVIDENCE/e.md", legacy());
    const index = new RDIndex(adapter); await index.build();
    const source = new IndexedGraphSource(index), store = new RDWorkspaceStore(), coordinator = new GraphSnapshotCoordinator(store, source);
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {store, source, coordinator, openView: async () => {}});
    cleanup.push(() => coordinator.dispose(), () => nav.onClose()); await nav.onOpen();
    const filter = nav.contentEl.querySelector<HTMLInputElement>(".rdan-filter")!;
    filter.value = "edited"; filter.dispatchEvent(new Event("input"));
    expect(nav.contentEl.querySelectorAll(".rdan-object-row:not([hidden])")).toHaveLength(0);
    adapter.set(KO_PATH, ko("Edited idea")); await index.applyChange(KO_PATH, "modify");
    await vi.waitFor(() => expect(nav.contentEl.querySelectorAll(".rdan-object-row:not([hidden])")).toHaveLength(1));
    expect(nav.contentEl.querySelector<HTMLInputElement>(".rdan-filter")!.value).toBe("edited");
    expect(nav.contentEl.querySelector(".rdan-object-row:not([hidden])")!.textContent).toContain(ID);
  });

  it("matches an exact legacy id in the same navigation as modern KOs", async () => {
    const adapter = new FakeAdapter(); adapter.set(KO_PATH, ko()); adapter.set("EVIDENCE/e.md", legacy());
    const index = new RDIndex(adapter); await index.build();
    const source = new IndexedGraphSource(index), store = new RDWorkspaceStore();
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {store, source, openView: async () => {}});
    cleanup.push(() => nav.onClose()); await nav.onOpen();
    const filter = nav.contentEl.querySelector<HTMLInputElement>(".rdan-filter")!;
    filter.value = "e-1"; filter.dispatchEvent(new Event("input"));
    const visible = nav.contentEl.querySelectorAll<HTMLButtonElement>(".rdan-object-row:not([hidden])");
    expect(visible).toHaveLength(1); visible[0].click(); expect(store.getState().selectedObjectId).toBe("E-1");
  });

  it("updates Home, navigation, Inspector, graph and provenance on save/rename/delete without reload", async () => {
    const adapter = new FakeAdapter(); adapter.set(KO_PATH, ko()); adapter.set("EVIDENCE/e.md", legacy());
    const vault = new FakeVault(), workspace = new FakeWorkspace();
    const wiring = new RuntimeWiring(adapter, workspace, vault, {open: async () => {}, activeSurface: () => "editor"});
    const source = new IndexedGraphSource(wiring.index), store = new RDWorkspaceStore();
    const coordinator = new GraphSnapshotCoordinator(store, source);
    const reader = new ObsidianKoSourceReaderImpl({} as Plugin, wiring.index);
    const shell = new RDWorkspaceShellView({} as WorkspaceLeaf, {store, source, coordinator, sourceReader: reader,
      refreshIndex: () => wiring.refresh(), openView: async () => {}});
    const nav = new RDArchiveNavView({} as WorkspaceLeaf, {store, source, coordinator, openView: async () => {}});
    const browser = new CollaborationBrowser();
    const inspector = new RDInspectorView({} as WorkspaceLeaf, {store, source, coordinator, browser, shellController: new RDShellController({} as App, store)});
    cleanup.push(() => browser.dispose());
    cleanup.push(() => wiring.dispose(), () => coordinator.dispose(), () => shell.onClose(), () => nav.onClose(), () => inspector.onClose());
    await wiring.start(); await Promise.all([shell.onOpen(), nav.onOpen(), inspector.onOpen()]);
    expect(shell.contentEl.textContent).toContain("Idea");
    store.setSelectedObject(ID);
    await vi.waitFor(() => expect(shell.contentEl.textContent).toContain("Saved source"));
    const beforeReads = adapter.reads;
    adapter.set(KO_PATH, ko("Edited title", "EDITED EVIDENCE")); vault.fireModify(KO_PATH); wiring.scheduler!.flush();
    await vi.waitFor(() => {
      expect(shell.contentEl.textContent).toContain("EDITED EVIDENCE");
      expect(shell.contentEl.textContent).not.toContain("Saved source");
      expect(nav.contentEl.textContent).toContain("Edited title");
      expect(inspector.contentEl.textContent).toContain("Edited title");
    });
    expect(adapter.reads - beforeReads).toBe(1);
    adapter.moveFile(KO_PATH, "Notes/renamed.md"); vault.fireRename(KO_PATH, "Notes/renamed.md");
    await vi.waitFor(() => {
      expect(wiring.index.detailById(ID)).toMatchObject({state: "available", path: "Notes/renamed.md"});
      expect(wiring.index.semanticSnapshot().unresolved).toContainEqual({source: "E-1", target: "Knowledge/idea", relation: "supports"});
    });
    adapter.dropFile("Notes/renamed.md"); vault.fireDelete("Notes/renamed.md");
    await vi.waitFor(() => {
      expect(nav.contentEl.textContent).not.toContain("Edited title");
      expect(wiring.index.detailById(ID)).toEqual({state: "missing"});
      expect(shell.contentEl.textContent).not.toContain("EDITED EVIDENCE");
    });
  });

  it("full refresh reconciles missed creates/deletes and can restore a deleted path", async () => {
    const adapter = new FakeAdapter(); adapter.set(KO_PATH, ko());
    const wiring = new RuntimeWiring(adapter, new FakeWorkspace(), new FakeVault(), {open: async () => {}, activeSurface: () => "editor"});
    cleanup.push(() => wiring.dispose()); await wiring.start();
    adapter.dropFile(KO_PATH); await wiring.refresh(); expect(wiring.index.detailById(ID)).toEqual({state: "missing"});
    adapter.set(KO_PATH, ko("Restored"));
    const a = wiring.refresh(), b = wiring.refresh(); expect(a).toBe(b); await a;
    expect(wiring.index.detailById(ID)).toMatchObject({state: "available", frontmatter: {title: "Restored"}});
  });

  it("a disposed coordinator cannot publish late work or remain subscribed", async () => {
    const store = new RDWorkspaceStore(); let notify!: () => void;
    const unsubscribe = vi.fn(); let complete!: (value: {state: "missing"}) => void;
    const source = {subscribe: (cb: () => void) => {notify = cb; return unsubscribe;}, read: vi.fn(() => new Promise<{state: "missing"}>(resolve => {complete = resolve;}))};
    const coordinator = new GraphSnapshotCoordinator(store, source);
    const pending = coordinator.ensureLoaded(); coordinator.dispose(); complete({state: "missing"}); await pending;
    expect(store.getState().graphSnapshot).toBeNull(); expect(unsubscribe).toHaveBeenCalledOnce();
    notify(); expect(source.read).toHaveBeenCalledOnce();
  });
});
