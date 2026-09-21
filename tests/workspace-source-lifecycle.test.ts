/** Review-fix regression tests — source-read lifecycle in the RD
 * Workspace (findings 1–5 of the independent GitHub review).
 *
 * A. selecting B after A loaded must not render A's source data on B
 * B. a late async completion for A must never apply after B is read
 * G. (phase2.1) A resolved → B pending → back to A → B late: B is
 *    discarded, A cache intact, A read count stays 1
 * H. (phase2.1) A pending → B → back to A: no duplicate A read,
 *    A applies when current, late B cannot overwrite
 * C. B eventually shows only B's own source/provenance
 * D. a stable selection is read once; rerenders never reread
 * E. identity-strip snapshot label says "derived projection", not
 *    "declared" (Projection ≠ Authority)
 * F. the missing-state statusline CSS selector targets the element
 *    itself (the broken descendant form is gone)
 */

import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkspaceLeaf } from "obsidian";
import { GRAPH_SCHEMA_TAG } from "../src/semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../src/semantic-graph/ko-detail-reader";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

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

/** Deterministic deferred reader: records every resolve call and
 * settles per-object results only when the test chooses to. */
class DeferredReader implements KoSourceReader {
  readonly calls: string[] = [];
  private readonly waiters = new Map<string, Array<(d: KoDetailResult) => void>>();
  settle(objectId: string, detail: KoDetailResult): void {
    const list = this.waiters.get(objectId) ?? [];
    this.waiters.delete(objectId);
    for (const resolve of list) resolve(detail);
  }
  resolve(objectId: string): Promise<KoDetailResult> {
    this.calls.push(objectId);
    return new Promise<KoDetailResult>((resolve) => {
      const list = this.waiters.get(objectId) ?? [];
      list.push(resolve);
      this.waiters.set(objectId, list);
    });
  }
}

const detailFor = (objectId: string, path: string, text: string): KoDetailResult => ({
  state: "available",
  path,
  frontmatter: {
    object_id: objectId,
    kind: objectId.endsWith("0002") ? "reference" : "hypothesis",
    status: "active",
    title: objectId.endsWith("0002") ? "Object B" : "Object A",
    provenance: {
      observation: text,
      evidence: text,
      inference: text,
      conclusion: text,
    },
  },
});

const views: RDWorkspaceShellView[] = [];
const readers: DeferredReader[] = [];
afterEach(async () => {
  for (const view of views.splice(0)) await view.onClose();
  readers.splice(0);
  document.body.replaceChildren();
});

async function openWorkspace(selected: string): Promise<{
  view: RDWorkspaceShellView;
  reader: DeferredReader;
  store: RDWorkspaceStore;
  select: (id: string) => void;
}> {
  const store = new RDWorkspaceStore();
  store.setSelectedObject(selected);
  const reader = new DeferredReader();
  readers.push(reader);
  const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
    store,
    source: { read: async () => ({ state: "available" as const, text: GRAPH_JSON }) },
    sourceReader: reader,
    collaborationSource: { readDir: async () => ({ state: "missing" as const }) },
    openView: async () => {},
  });
  views.push(view);
  await view.onOpen();
  const select = (id: string) => {
    view.contentEl
      .querySelector<HTMLButtonElement>(`.rdws-object-row[aria-label="inspect ${id}"]`)!
      .click();
  };
  return { view, reader, store, select };
}

const stripItem = (view: RDWorkspaceShellView, label: string) =>
  [...view.contentEl.querySelectorAll(".rdws-strip-item")]
    .find((el) => el.querySelector("dt")?.textContent === label);

const renderedText = (view: RDWorkspaceShellView) => view.contentEl.textContent ?? "";

describe("review fix — source-read lifecycle", () => {
  it("A. A-loaded → select B: B never renders A's source data before B resolves", async () => {
    const { view, reader, select } = await openWorkspace("ko-20260921-0001");
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => {
      expect(renderedText(view)).toContain("PROVENANCE-A");
    });
    select("ko-20260921-0002");
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object B");
    });
    // B's dossier before B resolves: honest not-read state, zero A leakage
    const sourceItem = stripItem(view, "source");
    expect(sourceItem?.getAttribute("data-state")).toBe("not_loaded");
    expect(sourceItem?.textContent).toContain("not read in this session");
    const provenanceItem = stripItem(view, "provenance");
    expect(provenanceItem).toBeUndefined(); // no count derived from A's layers
    expect(renderedText(view)).not.toContain("PROVENANCE-A");
    expect(renderedText(view)).not.toContain("NOTES/a.md");
  });

  it("B. async race: A resolves late after B was selected — A result ignored", async () => {
    const { view, reader, select } = await openWorkspace("ko-20260921-0001");
    await vi.waitFor(() => expect(reader.calls).toContain("ko-20260921-0001"));
    select("ko-20260921-0002"); // A still pending
    await vi.waitFor(() => expect(reader.calls.filter((c) => c === "ko-20260921-0002").length).toBe(1));
    // A completes late — must not apply, must not trigger a render of A data
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a-late.md", "STALE-A"));
    await new Promise((r) => setTimeout(r, 20));
    expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object B");
    expect(renderedText(view)).not.toContain("STALE-A");
    expect(renderedText(view)).not.toContain("NOTES/a-late.md");
  });

  it("C. after B resolves, B shows only B's own source and provenance", async () => {
    const { view, reader, select } = await openWorkspace("ko-20260921-0001");
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => expect(renderedText(view)).toContain("PROVENANCE-A"));
    select("ko-20260921-0002");
    reader.settle("ko-20260921-0002", detailFor("ko-20260921-0002", "NOTES/b.md", "PROVENANCE-B"));
    await vi.waitFor(() => {
      expect(renderedText(view)).toContain("PROVENANCE-B");
    });
    expect(stripItem(view, "source")?.textContent).toContain("resolved · current-source read");
    expect(stripItem(view, "provenance")?.textContent).toContain("4 of 4 layers carry text");
    // A's data left with A
    expect(renderedText(view)).not.toContain("PROVENANCE-A");
    expect(renderedText(view)).not.toContain("NOTES/a.md");
  });

  it("D. stable selection reads exactly once; rerenders never reread", async () => {
    const { view, reader } = await openWorkspace("ko-20260921-0001");
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => expect(renderedText(view)).toContain("PROVENANCE-A"));
    // force several plain rerender cycles (re-select same object, toggle
    // collaboration surface and back) — none may reread the source
    view.contentEl
      .querySelector<HTMLButtonElement>('.rdws-object-row[aria-label="inspect ko-20260921-0001"]')!
      .click();
    view.contentEl.querySelector<HTMLButtonElement>(".rdws-collab-toggle")!.click();
    view.contentEl.querySelector<HTMLButtonElement>(".rdws-collab-toggle")!.click();
    await new Promise((r) => setTimeout(r, 30));
    expect(reader.calls.filter((c) => c === "ko-20260921-0001")).toHaveLength(1);
    expect(renderedText(view)).toContain("PROVENANCE-A");
  });

  it("G. A resolved → B pending → back to A → B resolves late: B discarded", async () => {
    const { view, reader, select } = await openWorkspace("ko-20260921-0001");
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => expect(renderedText(view)).toContain("PROVENANCE-A"));
    select("ko-20260921-0002"); // B read starts, stays pending
    await vi.waitFor(() => expect(reader.calls).toContain("ko-20260921-0002"));
    select("ko-20260921-0001"); // back to A — A is cached, no new read
    await vi.waitFor(() => {
      expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
    });
    // B completes late: current selection is A → discard entirely
    reader.settle("ko-20260921-0002", detailFor("ko-20260921-0002", "NOTES/b-late.md", "STALE-B"));
    await new Promise((r) => setTimeout(r, 20));
    expect(view.contentEl.querySelector("h2.rdws-ko-title")?.textContent).toBe("Object A");
    expect(renderedText(view)).toContain("PROVENANCE-A"); // A cache not displaced
    expect(renderedText(view)).not.toContain("STALE-B");
    expect(renderedText(view)).not.toContain("NOTES/b-late.md");
    expect(reader.calls.filter((c) => c === "ko-20260921-0001")).toHaveLength(1);
  });

  it("H. A pending → B → back to A: no duplicate A read; A applies; late B ignored", async () => {
    const { view, reader, select } = await openWorkspace("ko-20260921-0001");
    await vi.waitFor(() => expect(reader.calls.filter((c) => c === "ko-20260921-0001").length).toBe(1));
    select("ko-20260921-0002"); // B read starts too
    await vi.waitFor(() => expect(reader.calls.filter((c) => c === "ko-20260921-0002").length).toBe(1));
    select("ko-20260921-0001"); // A still pending — must NOT start a second A read
    // original A resolves while A is current — applies
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => expect(renderedText(view)).toContain("PROVENANCE-A"));
    // late B completion cannot displace A
    reader.settle("ko-20260921-0002", detailFor("ko-20260921-0002", "NOTES/b-late.md", "STALE-B"));
    await new Promise((r) => setTimeout(r, 20));
    expect(renderedText(view)).toContain("PROVENANCE-A");
    expect(renderedText(view)).not.toContain("STALE-B");
    expect(reader.calls.filter((c) => c === "ko-20260921-0001")).toHaveLength(1);
    expect(reader.calls.filter((c) => c === "ko-20260921-0002")).toHaveLength(1);
  });

  it("E. identity strip calls the snapshot a derived projection, never declared", async () => {
    const { view, reader } = await openWorkspace("ko-20260921-0001");
    reader.settle("ko-20260921-0001", detailFor("ko-20260921-0001", "NOTES/a.md", "PROVENANCE-A"));
    await vi.waitFor(() => expect(renderedText(view)).toContain("PROVENANCE-A"));
    const snapshotItem = stripItem(view, "snapshot");
    expect(snapshotItem?.textContent).toContain("derived projection");
    expect(snapshotItem?.textContent).toContain("freshness unverified");
    expect(snapshotItem?.textContent).not.toContain("declared");
  });

  it("F. statusline missing-state selector targets the element itself", () => {
    expect(css).toContain('.rd-workspace-shell .rdws-statusline[data-state="missing"],');
    // the broken descendant form must not survive anywhere
    expect(css).not.toContain('.rdws-statusline[data-state="missing"] .rdws-statusline');
  });
});
