/** Knowledge Panel shares the saved-note projection and reads a selection once.
 * Rendering never initiates I/O; generations reject late reads after a query,
 * refresh, close or reopen. No source-object reference equality is required. */
import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource, GraphLoadResult } from "../semantic-graph/graph-loader";
import { loadGraphFromSource } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import { buildKnowledgePanelModel, renderKnowledgePanel } from "../semantic-graph/knowledge-panel";
import type { RDWorkspaceStore } from "../architecture/workspace-state";
import type { GraphSnapshotCoordinator } from "../architecture/graph-snapshot-coordinator";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_KNOWLEDGE_PANEL_VIEW_TYPE = "rd-knowledge-panel";
export interface KnowledgePanelDeps {
  readonly source: GraphSource;
  readonly sourceReader?: KoSourceReader;
  readonly workspace: string;
  readonly store?: RDWorkspaceStore;
  readonly coordinator?: GraphSnapshotCoordinator;
}

export class RDKnowledgePanelView extends ItemView {
  private graphLoad: GraphLoadResult = {state: "unavailable", reason: "not loaded yet"};
  private sourceDetail: KoDetailResult | undefined;
  private query = "";
  private active = false;
  private readGeneration = 0;
  private refreshGeneration = 0;
  private unsubscribe: (() => void) | undefined;
  constructor(leaf: WorkspaceLeaf, private readonly deps: KnowledgePanelDeps) { super(leaf); }
  getViewType(): string { return RD_KNOWLEDGE_PANEL_VIEW_TYPE; }
  getDisplayText(): string { return "RD Knowledge Panel"; }
  getIcon(): string { return "book-open"; }

  async onOpen(): Promise<void> {
    this.active = true;
    emptyEl(this.contentEl);
    const shell = createChild(this.contentEl, "div", {cls: "rd-knowledge-panel-shell"});
    const bar = createChild(shell, "div", {cls: "rdkp-toolbar"});
    const input = createChild(bar, "input", {cls: "rdkp-input"}) as HTMLInputElement;
    input.type = "text";
    input.value = this.query;
    input.placeholder = "exact object_id or legacy id";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const inspect = () => { this.query = input.value.trim(); void this.readSelection(); };
    createChild(bar, "button", {cls: "rdkp-button", text: "Inspect"}).addEventListener("click", inspect);
    input.addEventListener("keydown", (event: KeyboardEvent) => { if (event.key === "Enter") inspect(); });
    createChild(bar, "button", {cls: "rdkp-button", text: "Re-read snapshot"})
      .addEventListener("click", () => { void this.refresh(true); });
    createChild(shell, "div", {cls: "rdkp-panel-host"});
    this.unsubscribe?.();
    if (this.deps.store !== undefined) {
      this.unsubscribe = this.deps.store.subscribe((state) => {
        if (state.graphSnapshot !== null) this.acceptSnapshot(state.graphSnapshot);
      });
    } else {
      this.unsubscribe = this.deps.source.subscribe?.(() => { void this.refresh(false); });
    }
    await this.refresh(false);
  }

  async onClose(): Promise<void> {
    this.active = false;
    this.readGeneration++;
    this.refreshGeneration++;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    emptyEl(this.contentEl);
  }

  private async refresh(explicit: boolean): Promise<void> {
    const generation = ++this.refreshGeneration;
    let load: GraphLoadResult;
    try {
      load = this.deps.coordinator !== undefined
        ? await (explicit ? this.deps.coordinator.refresh() : this.deps.coordinator.ensureLoaded())
        : await loadGraphFromSource(this.deps.source);
    } catch (err) { load = {state: "unavailable", reason: String(err)}; }
    if (!this.active || generation !== this.refreshGeneration) return;
    this.acceptSnapshot(load);
  }

  private acceptSnapshot(load: GraphLoadResult): void {
    if (!this.active || this.graphLoad === load) return;
    this.graphLoad = load;
    this.deps.sourceReader?.invalidate?.();
    void this.readSelection();
  }

  private async readSelection(): Promise<void> {
    const generation = ++this.readGeneration;
    const query = this.query;
    this.sourceDetail = undefined;
    this.renderPanel();
    if (query === "" || this.deps.sourceReader === undefined) return;
    let detail: KoDetailResult;
    try { detail = await this.deps.sourceReader.resolve(query); }
    catch (err) { detail = {state: "unavailable", reason: String(err)}; }
    if (!this.active || generation !== this.readGeneration || this.query !== query) return;
    this.sourceDetail = detail;
    this.renderPanel();
  }

  private renderPanel(): void {
    if (!this.active) return;
    const host = this.contentEl.querySelector(".rdkp-panel-host");
    if (!(host instanceof HTMLElement)) return;
    renderKnowledgePanel(host, buildKnowledgePanelModel({load: this.graphLoad,
      workspace: this.deps.workspace, objectId: this.query || undefined, sourceDetail: this.sourceDetail}));
  }
}
