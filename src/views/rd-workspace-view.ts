/** v1.6.1 §1 / v1.6.3 — RD workspace: the investigation surface.
 *
 * v1.6.3 turns the v1.6.1 shell into the usable core journey
 * (v1.6.0 §3): open workspace → select an object (exact id or the
 * neutral snapshot list) → inspect identity/provenance/relations/
 * lineage via the RE-HOMED v1.3.1 Knowledge Panel projection —
 * not a rewrite — with object-to-object navigation (lineage,
 * relation endpoints, unresolved targets). Collaboration and Agent
 * Contribution areas stay honest placeholders until their records
 * exist; no fake functionality.
 *
 * Boundaries: read-only; explicit opens/reads only (one read on
 * open, re-reads on user action); selection is a UI pointer, never
 * a lifecycle state; no ranking or recommendation anywhere — the
 * object list is a neutral stable order.
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { loadGraphFromSource, type GraphLoadResult } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../semantic-graph/knowledge-panel";
import type { RDWorkspaceStore } from "../architecture/workspace-state";
import { RD_THEME_ATTR, RD_TOKEN_VERSION } from "../architecture/theme-tokens";
import { applyRDTheme, type RDThemeController } from "../themes/theme-runtime";
import type {
  ArtifactDetail,
  ArtifactKind,
  CollaborationArtifactSource,
} from "../collaboration/artifact-reader";
import type { ProposalDecision, ProposalDecisionPort } from "../collaboration/proposal-decision";
import {
  CollaborationBrowser,
  renderCollaboration,
  resolveDetail,
} from "../collaboration/collaboration-surface";
import { createChild, emptyEl } from "./dom-helpers";
import { RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "./knowledge-panel-view";

export const RD_WORKSPACE_VIEW_TYPE = "rd-workspace";

export interface RDWorkspaceShellDeps {
  readonly store: RDWorkspaceStore;
  readonly source: GraphSource;
  /** v1.6.3: exact-id source reader for the inspection panel. */
  readonly sourceReader?: KoSourceReader;
  /** Explicit activation of another RD view (registry path). */
  readonly openView: (viewType: string) => Promise<void>;
  /** v1.6.2: explicit, session-only theme selection. */
  readonly themeController?: RDThemeController;
  /** v1.7.4-A: read-only collaboration artifact source. */
  readonly collaborationSource?: CollaborationArtifactSource;
  /** v1.8: the one controlled write path (proposal decisions). */
  readonly decisionPort?: ProposalDecisionPort;
}

/** The six information-architecture areas (v1.6.0 §4). The four
 * intelligence areas are live via the re-homed panel; collaboration
 * and agent contribution wait for their records — honestly. */
const AREAS: readonly { key: string; question: string; state: string }[] = [
  { key: "Knowledge Panel", question: "What is this object?", state: "live in workspace" },
  { key: "Provenance Explorer", question: "Why do we believe this?", state: "live in workspace" },
  { key: "Lineage Explorer", question: "How did this change?", state: "live in workspace" },
  { key: "Relation Explorer", question: "What is it connected to?", state: "live in workspace" },
  {
    key: "Collaboration View",
    question: "Who worked on this and what happened?",
    state: "live in workspace",
  },
  {
    key: "Agent Contribution View",
    question: "What did Agents do here?",
    state: "live in workspace",
  },
];

export class RDWorkspaceShellView extends ItemView {
  private readonly deps: RDWorkspaceShellDeps;
  private unsubscribe: (() => void) | null = null;
  private graphLoad: GraphLoadResult = { state: "unavailable", reason: "not loaded yet" };
  private sourceDetail: KoDetailResult | undefined = undefined;
  private observer: ResizeObserver | null = null;
  private mode: "investigation" | "collaboration" = "investigation";
  private readonly browser = new CollaborationBrowser();
  private collabDetail: ArtifactDetail | null = null;

  constructor(leaf: WorkspaceLeaf, deps: RDWorkspaceShellDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string { return RD_WORKSPACE_VIEW_TYPE; }
  getDisplayText(): string { return "RD Workspace"; }
  getIcon(): string { return "library"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    const shell = createChild(this.contentEl, "div", { cls: "rd-workspace-shell" });
    shell.setAttribute(RD_THEME_ATTR, "");
    shell.setAttribute("data-rd-tokens", RD_TOKEN_VERSION);
    this.buildToolbar(createChild(shell, "div", { cls: "rdws-toolbar" }), shell);
    createChild(shell, "div", { cls: "rdws-body" });
    if (this.deps.themeController !== undefined) {
      applyRDTheme(shell, this.deps.themeController.getCurrent());
    }
    this.unsubscribe = this.deps.store.subscribe(() => this.renderBody());
    // Pane-width layout state (v1.3.5 §5: breakpoints follow the
    // allocated pane, not the window). Class toggling only.
    this.observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      shell.classList.toggle("rdws-narrow", width > 0 && width < 700);
    });
    this.observer.observe(shell);
    await this.refreshAvailability();
    this.renderBody();
  }

  async onClose(): Promise<void> {
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.browser.dispose();
    emptyEl(this.contentEl);
  }

  /** v1.6.2 §5: explicit, session-only theme selection. */
  private buildToolbar(bar: HTMLElement, shell: HTMLElement): void {
    const controller = this.deps.themeController;
    if (controller !== undefined) {
      createChild(bar, "span", { cls: "rdws-theme-label", text: "Theme:" });
      const select = createChild(bar, "select", { cls: "rdws-theme-select" }) as HTMLSelectElement;
      select.setAttribute("aria-label", "RD theme (presentation only)");
      for (const theme of controller.list()) {
        const option = createChild(select, "option", { text: theme.label });
        (option as HTMLOptionElement).value = theme.id;
        if (theme.id === controller.getCurrent().id) {
          (option as HTMLOptionElement).selected = true;
        }
      }
      select.addEventListener("change", () => {
        try {
          const theme = controller.setTheme(select.value);
          applyRDTheme(shell, theme);
        } catch {
          // unknown id: keep current theme; selection is explicit-only
        }
      });
    }
    // v1.6.3: exact-id query (the selection discipline: exact
    // object_id only — never fuzzy).
    const input = createChild(bar, "input", { cls: "rdws-object-input" }) as HTMLInputElement;
    input.type = "text";
    input.placeholder = "inspect exact object_id (e.g. ko-20260921-0001)";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const go = () => {
      const id = input.value.trim();
      if (id !== "") this.deps.store.setSelectedObject(id);
    };
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") go();
    });
    createChild(bar, "button", { cls: "rdws-button", text: "Inspect" })
      .addEventListener("click", go);
    // v1.6.3: back along the UI investigation trail.
    const back = createChild(bar, "button", { cls: "rdws-button", text: "◀ Back" });
    back.setAttribute("aria-label", "Back along investigation trail");
    back.addEventListener("click", () => this.deps.store.back());
    // v1.7.4-A: explicit collaboration section toggle (session-only).
    if (this.deps.collaborationSource !== undefined) {
      const collab = createChild(bar, "button", {
        cls: "rdws-button rdws-collab-toggle",
        text: "Collaboration",
      });
      collab.setAttribute("aria-pressed", "false");
      collab.addEventListener("click", () => {
        this.mode = this.mode === "collaboration" ? "investigation" : "collaboration";
        collab.setAttribute("aria-pressed", String(this.mode === "collaboration"));
        if (this.mode === "collaboration") {
          void this.browser.refresh(this.deps.collaborationSource as CollaborationArtifactSource);
        }
        this.renderBody();
      });
    }
  }

  /** v1.8: explicit Human decision recording — the only write.
   * Records the decision, then re-reads artifacts and re-opens the
   * same proposal so the Human sees the recorded state. */
  private async recordProposalDecision(
    decision: ProposalDecision,
    path: string,
  ): Promise<void> {
    const port = this.deps.decisionPort;
    const source = this.deps.collaborationSource;
    if (port === undefined || source === undefined) return;
    const result = await port.recordDecision(path, decision);
    if (result.state === "written") {
      await this.browser.refresh(source);
      this.browser.select("proposal", path);
      await this.refreshCollabDetail();
    }
    // invalid/missing/unavailable: no write happened; the view
    // keeps showing current state. (Minimal MVP: no toast.)
  }

  /** v1.7.4-A: load the detail for the current collaboration
   * selection (exact path), then re-render. Read-only. */
  private async refreshCollabDetail(): Promise<void> {
    if (this.deps.collaborationSource === undefined) return;
    this.collabDetail = await resolveDetail(
      this.deps.collaborationSource, this.browser.getState());
    this.renderBody();
  }

  /** Explicit re-read of derived-state availability and snapshot.
   * No rebuild, no sync, no spawn — reads available data only. */
  private async refreshAvailability(): Promise<void> {
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    const load = this.graphLoad;
    if (load.state === "available") {
      this.deps.store.setSnapshotAvailability({
        state: "available",
        note:
          `${load.graph.nodes.length} objects, ${load.graph.edges.length} declared relations ` +
          "(freshness unverified)",
      });
    } else if (load.state === "missing") {
      this.deps.store.setSnapshotAvailability({
        state: "missing",
        note: "Graph artifact missing — this does not mean no knowledge exists.",
      });
    } else if (load.state === "invalid") {
      this.deps.store.setSnapshotAvailability({
        state: "invalid",
        note: `Graph artifact invalid (${load.reason}).`,
      });
    } else {
      this.deps.store.setSnapshotAvailability({
        state: "unavailable",
        note: `Graph artifact unavailable (${load.reason}).`,
      });
    }
  }

  private async resolveSourceAndRender(objectId: string): Promise<void> {
    if (this.deps.sourceReader === undefined) return;
    const detail = await this.deps.sourceReader.resolve(objectId);
    this.sourceDetail = detail;
    this.renderBody();
  }

  private renderBody(): void {
    const body = this.contentEl.querySelector(".rdws-body");
    if (!(body instanceof HTMLElement)) return;
    emptyEl(body);
    const state = this.deps.store.getState();

    const head = createChild(body, "div", { cls: "rdws-head" });
    createChild(head, "div", {
      cls: "rdws-title",
      text: `Rational Delirium Workspace — ${state.workspaceLabel}`,
    });
    const snap = createChild(head, "div", { cls: "rdws-snapshot" });
    snap.setAttribute("data-state", state.snapshot.state);
    snap.textContent = `snapshot: ${state.snapshot.state} — ${state.snapshot.note}`;

    const selected = state.selectedObjectId;
    if (selected !== null) {
      createChild(head, "div", {
        cls: "rdws-selected",
        text: `inspecting: ${selected} (UI pointer; not a lifecycle state) · trail ${state.navigation.length}`,
      });
    }

    const layout = createChild(body, "div", { cls: "rdws-layout" });

    if (this.mode === "collaboration") {
      const host = createChild(layout, "div", { cls: "rdws-collaboration-host" });
      renderCollaboration(host, this.browser.getState(), this.collabDetail, {
        onSelect: (kind: ArtifactKind, path: string) => {
          this.browser.select(kind, path);
          void this.refreshCollabDetail();
        },
        onBack: () => {
          this.browser.back();
          void this.refreshCollabDetail();
        },
        onDecide: (decision: ProposalDecision, path: string) => {
          void this.recordProposalDecision(decision, path);
        },
      });
      return;
    }

    if (this.graphLoad.state === "available" && selected !== null) {
      this.renderInspection(layout, selected);
      this.renderObjectRail(layout, selected);
      void this.resolveSourceAndRender(selected);
      return;
    }
    this.renderOverview(layout, selected);
    if (this.graphLoad.state === "available") {
      this.renderObjectRail(layout, selected);
    }
  }

  /** Primary reading panel: the re-homed v1.3.1 Knowledge Panel
   * projection with object navigation enabled. */
  private renderInspection(layout: HTMLElement, selected: string): void {
    if (this.graphLoad.state !== "available") return;
    const model = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.store.getState().workspaceLabel,
      objectId: selected,
      sourceDetail: this.sourceDetail,
    });
    const host = createChild(layout, "div", { cls: "rdws-reading" });
    const reading = createChild(host, "div", { cls: "rdws-reading-inner" });
    renderKnowledgePanel(reading, model, {
      onSelectObject: (objectId) => {
        this.deps.store.setSelectedObject(objectId);
      },
    });
    createChild(host, "div", {
      cls: "rdws-reading-note",
      text:
        "declared data only — projection eligibility is not Knowledge Object validity; " +
        "no ranking, no recommendation",
    });
  }

  /** Neutral navigation rail: what exists in this snapshot, stable
   * object-id order, no importance ordering. Click selects. */
  private renderObjectRail(layout: HTMLElement, selected: string | null): void {
    if (this.graphLoad.state !== "available") return;
    const rail = createChild(layout, "div", { cls: "rdws-rail" });
    createChild(rail, "div", {
      cls: "rdws-rail-title",
      text: `Objects in snapshot (neutral id order — ${this.graphLoad.graph.nodes.length})`,
    });
    const nodes = [...this.graphLoad.graph.nodes]
      .sort((a, b) => a.object_id.localeCompare(b.object_id));
    if (nodes.length === 0) {
      createChild(rail, "div", { cls: "rdws-empty", text: "no objects in this snapshot" });
      return;
    }
    for (const node of nodes) {
      const row = createChild(rail, "button", { cls: "rdws-object-row" });
      row.setAttribute("aria-label", `inspect ${node.object_id}`);
      if (node.object_id === selected) row.setAttribute("aria-pressed", "true");
      row.textContent =
        `${node.object_id} · ${node.kind} · ${node.status} — ${node.title}`;
      row.addEventListener("click", () => {
        this.deps.store.setSelectedObject(node.object_id);
      });
    }
  }

  /** Overview: area map with honest live/placeholder states; shown
   * when nothing is selected. */
  private renderOverview(layout: HTMLElement, _selected: string | null): void {
    const overview = createChild(layout, "div", { cls: "rdws-overview" });
    if (this.graphLoad.state !== "available") {
      createChild(overview, "div", {
        cls: "rdws-unavailable",
        text: this.deps.store.getState().snapshot.note,
      });
    }
    const list = createChild(overview, "div", { cls: "rdws-areas" });
    createChild(list, "div", { cls: "rdws-areas-title", text: "Inspection areas (v1.6.0 §4)" });
    for (const area of AREAS) {
      const row = createChild(list, "div", { cls: "rdws-area" });
      row.setAttribute("data-live", String(area.state === "live in workspace"));
      createChild(row, "div", { cls: "rdws-area-name", text: area.key });
      createChild(row, "div", { cls: "rdws-area-question", text: area.question });
      if (area.state === "live in workspace") {
        createChild(row, "div", {
          cls: "rdws-area-hint",
          text: "select an object above to inspect",
        });
      } else {
        createChild(row, "div", { cls: "rdws-area-pending", text: area.state });
      }
    }
    const openPanel = createChild(overview, "button", {
      cls: "rdws-button",
      text: "Open standalone Knowledge Panel",
    });
    openPanel.addEventListener("click", () => {
      void this.deps.openView(RD_KNOWLEDGE_PANEL_VIEW_TYPE);
    });
  }
}
