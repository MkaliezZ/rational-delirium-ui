/** v1.3.1 §3 — Knowledge Panel view (read-only prototype).
 *
 * Renders the pure knowledge-panel projection (semantic-graph/
 * knowledge-panel.ts) from a snapshot loaded through the injected
 * GraphSource. Session-only query state (memory); reload means
 * RE-READ of available data — no projection spawn, no mutation.
 * This view is not wired into the RDIndex layer: the KO semantic
 * graph is a separate layer from the v0.4.4 file-assertion graph
 * and they are never merged (v1.3.0 §7).
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { loadGraphFromSource, type GraphLoadResult } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
  type KnowledgePanelModel,
} from "../semantic-graph/knowledge-panel";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_KNOWLEDGE_PANEL_VIEW_TYPE = "rd-knowledge-panel";

export interface KnowledgePanelDeps {
  /** Read-only artifact source (vault file reader). */
  readonly source: GraphSource;
  /** Phase 2: read-only KO source reader (frontmatter-only,
   * exact object_id resolution). Optional until wired. */
  readonly sourceReader?: KoSourceReader;
  /** Explicitly selected logical workspace label for this
   * prototype. Full workspace selection arrives with the provider
   * contract in a later phase; nothing is auto-selected. */
  readonly workspace: string;
}

export class RDKnowledgePanelView extends ItemView {
  private readonly deps: KnowledgePanelDeps;
  // Named graphLoad: View.load() is an Obsidian lifecycle method.
  private graphLoad: GraphLoadResult = { state: "unavailable", reason: "not loaded yet" };
  private sourceDetail: KoDetailResult | undefined = undefined;
  private query = "";

  constructor(leaf: WorkspaceLeaf, deps: KnowledgePanelDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string { return RD_KNOWLEDGE_PANEL_VIEW_TYPE; }
  getDisplayText(): string { return "RD Knowledge Panel"; }
  getIcon(): string { return "book-open"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    const shell = createChild(this.contentEl, "div", { cls: "rd-knowledge-panel-shell" });
    const bar = createChild(shell, "div", { cls: "rdkp-toolbar" });
    const input = createChild(bar, "input", { cls: "rdkp-input" }) as HTMLInputElement;
    input.type = "text";
    input.placeholder = "exact object_id (e.g. ko-20260919-0001)";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const apply = createChild(bar, "button", { cls: "rdkp-button", text: "Inspect" });
    apply.addEventListener("click", () => {
      this.query = input.value.trim();
      this.renderPanel();
    });
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        this.query = input.value.trim();
        this.renderPanel();
      }
    });
    const reload = createChild(bar, "button", { cls: "rdkp-button", text: "Re-read snapshot" });
    reload.addEventListener("click", () => { void this.refresh(); });
    createChild(shell, "div", { cls: "rdkp-panel-host" });
    await this.refresh();
  }

  async onClose(): Promise<void> {
    emptyEl(this.contentEl);
  }

  /** Refresh = re-read available data through the source ports.
   * No Python spawn, no file mutation, no agent invocation. */
  private async refresh(): Promise<void> {
    this.deps.sourceReader?.invalidate?.();
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    this.sourceDetail = undefined;
    if (this.deps.sourceReader !== undefined && this.query !== "") {
      this.sourceDetail = await this.deps.sourceReader.resolve(this.query);
    }
    this.renderPanel();
  }

  private renderPanel(): void {
    const host = this.contentEl.querySelector(".rdkp-panel-host");
    if (!(host instanceof HTMLElement)) return;
    void this.resolveSourceAndRender();
    const model: KnowledgePanelModel = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.workspace,
      objectId: this.query === "" ? undefined : this.query,
      sourceDetail: this.sourceDetail,
    });
    renderKnowledgePanel(host, model);
  }

  /** Query changes trigger an exact source resolution (async),
   * then a re-render. Snapshot data renders immediately. */
  private async resolveSourceAndRender(): Promise<void> {
    if (this.deps.sourceReader === undefined || this.query === "") return;
    const detail = await this.deps.sourceReader.resolve(this.query);
    if (detail === this.sourceDetail) return;
    this.sourceDetail = detail;
    this.renderPanel();
  }
}
