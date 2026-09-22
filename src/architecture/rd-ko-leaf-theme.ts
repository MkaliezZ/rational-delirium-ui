/** V2-05 — RD Knowledge Object leaf presentation marker and native companion.
 *
 * The Rational Archive shell restyles the app frame, but a REAL RD
 * Knowledge Object opened in an ordinary markdown leaf must also
 * wear the archival material — while every OTHER markdown note and
 * every third-party view stays in the host theme (V2-03 isolation
 * preserved). This controller is the single presentation authority
 * for that boundary: it detects which open markdown leaves display
 * a real Knowledge Object and marks exactly those leaves' view
 * containers with the `rd-ko-leaf` class. The stylesheet then
 * remaps ONLY Obsidian's native editor/property CSS variables
 * under `body.rd-rational-archive-shell .rd-ko-leaf` — reading
 * view, source/live preview and the Properties panel pick the
 * material up natively.
 *
 * Detection boundary: a file is a Knowledge Object iff its
 * frontmatter block declares `object_id` — resolved through the
 * EXISTING ko-detail-reader primitives (`extractFrontmatterBlock`
 * + `parseKoFrontmatter`). No filename/folder/title/tab/path
 * heuristics, no second parser.
 *
 * Lifecycle: created once in registerRDViews; listeners go through
 * plugin.registerEvent (file-open, active-leaf-change,
 * layout-change, vault modify) so plugin unload removes them; the
 * dispose path (plugin.register) strips every marker. Event-driven
 * only — no timers, no polling, no layout resets, no leaf
 * recreation. The companion reuses the same cachedRead and parsed fields;
 * snapshot changes only rerender the presentation, without another read.
 * Async cachedRead completions are guarded by a
 * per-leaf generation token (the V2-02 dock guard pattern) so a
 * late read can never mis-mark a leaf whose file changed
 * meanwhile.
 */

import type { MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import {
  extractFrontmatterBlock,
  parseKoFrontmatter,
  type KoFrontmatter,
} from "../semantic-graph/ko-detail-reader";

import type { RDWorkspaceStore } from "./workspace-state";
import { renderKoSurface } from "../views/ko-surface";

/** Presentation marker applied to a KO markdown leaf's view
 * container (`leaf.view.containerEl`). Styling gates on
 * `body.rd-rational-archive-shell .rd-ko-leaf`; the marker itself
 * may exist regardless of shell state. */
export const RD_KO_LEAF_CLASS = "rd-ko-leaf";

const MARKDOWN_VIEW_TYPE = "markdown";

/** KO identification through the EXISTING ko-detail-reader
 * primitives — a note is an RD Knowledge Object iff its frontmatter
 * declares `object_id` (parseKoFrontmatter returns non-null). */
export function isKoMarkdownText(text: string): boolean {
  const block = extractFrontmatterBlock(text);
  if (block === null) return false;
  return parseKoFrontmatter(block) !== null;
}

export class RDKoLeafThemeController {
  /** Per-leaf generation counter: every (re)evaluation of a leaf
   * bumps it; an awaited read whose generation is no longer current
   * belongs to a dead evaluation and is dropped silently. */
  private readonly generations = new Map<WorkspaceLeaf, number>();
  private readonly marked = new Set<WorkspaceLeaf>();

  private nextGeneration = 0;
  private disposed = false;
  private started = false;
  private unsubscribe: (() => void) | null = null;
  private readonly surfaces = new Map<WorkspaceLeaf, {
    path: string; text: string; frontmatter: KoFrontmatter; element: HTMLElement;
  }>();

  constructor(private readonly plugin: Plugin, private readonly presentation?: {
    readonly store: RDWorkspaceStore;
    readonly inspect: (objectId: string) => void;
  }) {}

  /** Register the event listeners (plugin-scoped, removed on
   * unload) and run the initial sweep over already-open leaves. */
  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    if (this.presentation !== undefined) {
      let previous = this.presentation.store.getState().graphSnapshot;
      this.unsubscribe = this.presentation.store.subscribe(state => {
        if (previous === state.graphSnapshot) return;
        previous = state.graphSnapshot;
        for (const record of this.surfaces.values()) this.renderSurface(record);
      });
    }
    const { workspace, vault } = this.plugin.app;
    this.plugin.registerEvent(workspace.on("file-open", () => { void this.refresh(); }));
    this.plugin.registerEvent(workspace.on("active-leaf-change", () => { void this.refresh(); }));
    this.plugin.registerEvent(workspace.on("layout-change", () => { void this.refresh(); }));
    this.plugin.registerEvent(vault.on("modify", () => { void this.refresh(); }));
    // Initial sweep once the layout (and its restored leaves) exists —
    // at plugin onload the workspace leaf list is still empty.
    this.plugin.app.workspace.onLayoutReady(() => { void this.refresh(); });
  }

  /** Plugin unload path: strip every marker and drop all pending
   * generations. Listener removal is handled by registerEvent. */
  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const leaf of [...this.marked]) this.unmark(leaf);
    this.generations.clear();
  }

  /** Re-evaluate every open markdown leaf. Cheap and event-driven:
   * KO opened ⇒ marker on; KO→ordinary ⇒ off; ordinary→KO ⇒ on;
   * leaf closed ⇒ marker stripped from the (gone) element and the
   * tracking sets. */
  async refresh(): Promise<void> {
    if (this.disposed) return;
    const open = new Set<WorkspaceLeaf>(
      this.plugin.app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE));
    for (const leaf of [...this.marked]) {
      if (!open.has(leaf)) this.unmark(leaf);
    }
    for (const leaf of [...this.generations.keys()]) {
      if (!open.has(leaf)) this.generations.delete(leaf);
    }
    await Promise.all([...open].map((leaf) => this.evaluate(leaf)));
  }

  private async evaluate(leaf: WorkspaceLeaf): Promise<void> {
    const generation = this.bumpGeneration(leaf);
    const view = leaf.view as MarkdownView;
    const file = view.file as TFile | null | undefined;
    // Restored Markdown leaves can still be deferred views without a file.
    if (file == null) {
      this.unmark(leaf);
      return;
    }
    if (this.surfaces.get(leaf)?.path !== file.path) this.unmark(leaf);
    let text: string;
    try { text = await this.plugin.app.vault.cachedRead(file); }
    catch {
      if (this.generations.get(leaf) === generation) this.unmark(leaf);
      return;
    }
    // Dead-evaluation guards: a newer evaluation started meanwhile
    // (file-open/modify/layout sweep bumped the generation), or the
    // leaf now shows a different file than the one read.
    if (this.disposed || this.generations.get(leaf) !== generation) return;
    if (!this.plugin.app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE).includes(leaf)) return;
    const current = (leaf.view as MarkdownView).file as TFile | null;
    if (leaf.view !== view || current == null || current.path !== file.path) return;
    const block = extractFrontmatterBlock(text);
    const frontmatter = block === null ? null : parseKoFrontmatter(block);
    if (frontmatter === null) { this.unmark(leaf); return; }
    this.mark(leaf);
    const previous = this.surfaces.get(leaf);
    if (previous?.text === text && previous.element.parentElement === view.containerEl) return;
    const element = previous?.element ?? document.createElement("section");
    element.className = "rd-ko-surface";
    // Sibling of native content, never injected into CodeMirror, Properties or
    // Markdown rendering DOM. Obsidian retains its editor and save lifecycle.
    view.containerEl.insertBefore(element, view.contentEl ?? null);
    const record = { path: file.path, text, frontmatter, element };
    this.surfaces.set(leaf, record);
    this.renderSurface(record);
  }

  private renderSurface(record: { path: string; frontmatter: KoFrontmatter; element: HTMLElement }): void {
    renderKoSurface(record.element, {
      path: record.path, frontmatter: record.frontmatter,
      snapshot: this.presentation?.store.getState().graphSnapshot ?? null,
      inspect: this.presentation?.inspect,
    });
  }

  private bumpGeneration(leaf: WorkspaceLeaf): number {
    const generation = ++this.nextGeneration;
    this.generations.set(leaf, generation);
    return generation;
  }

  private mark(leaf: WorkspaceLeaf): void {
    this.marked.add(leaf);
    leaf.view.containerEl.classList.add(RD_KO_LEAF_CLASS);
  }

  private unmark(leaf: WorkspaceLeaf): void {
    this.marked.delete(leaf);
    this.surfaces.get(leaf)?.element.remove();
    this.surfaces.delete(leaf);
    leaf.view.containerEl.classList.remove(RD_KO_LEAF_CLASS);
  }
}
