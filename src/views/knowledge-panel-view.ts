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
  /** Explicitly selected logical workspace label for this
   * prototype. Full workspace selection arrives with the provider
   * contract in a later phase; nothing is auto-selected. */
  readonly workspace: string;
}

export class RDKnowledgePanelView extends ItemView {
  private readonly deps: KnowledgePanelDeps;
  // Named graphLoad: View.load() is an Obsidian lifecycle method.
  private graphLoad: GraphLoadResult = { state: "unavailable", reason: "not loaded yet" };
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

  /** Refresh = re-read available data through the source port.
   * No Python spawn, no file mutation, no agent invocation. */
  private async refresh(): Promise<void> {
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    this.renderPanel();
  }

  private renderPanel(): void {
    const host = this.contentEl.querySelector(".rdkp-panel-host");
    if (!(host instanceof HTMLElement)) return;
    const model: KnowledgePanelModel = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.workspace,
      objectId: this.query === "" ? undefined : this.query,
    });
    renderKnowledgePanel(host, model);
  }
}
