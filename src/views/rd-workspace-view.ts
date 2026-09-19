/** v1.6.1 §1 — RD workspace shell (explicit entry point).
 *
 * The shell is the architectural boundary of the future RD product
 * experience (v1.6.0 §5): one explicitly opened surface that will
 * host the six inspection areas. In this phase it renders the area
 * map with honest "not implemented" placeholders, the REAL
 * availability of the derived snapshot (explicit read only), and a
 * navigation entry to the already-implemented Knowledge Panel.
 *
 * Boundaries: no auto-open, no background service, no refresh
 * timer; availability re-reads happen only on explicit user
 * action. No fake data: placeholders say they are placeholders.
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { loadGraphFromSource } from "../semantic-graph/graph-loader";
import type { RDWorkspaceStore } from "../architecture/workspace-state";
import { RD_THEME_ATTR, RD_TOKEN_VERSION } from "../architecture/theme-tokens";
import { createChild, emptyEl } from "./dom-helpers";
import { RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "./knowledge-panel-view";

export const RD_WORKSPACE_VIEW_TYPE = "rd-workspace";

export interface RDWorkspaceShellDeps {
  readonly store: RDWorkspaceStore;
  readonly source: GraphSource;
  /** Explicit activation of another RD view (registry path). */
  readonly openView: (viewType: string) => Promise<void>;
}

/** The six information-architecture areas (v1.6.0 §4) with their
 * user questions. Implemented-in-phase flags are honest: only the
 * Knowledge Panel exists today (v1.3.1). */
const AREAS: readonly { key: string; question: string; implemented: boolean }[] = [
  { key: "Knowledge Panel", question: "What is this object?", implemented: true },
  { key: "Provenance Explorer", question: "Why do we believe this?", implemented: false },
  { key: "Lineage Explorer", question: "How did this change?", implemented: false },
  { key: "Relation Explorer", question: "What is it connected to?", implemented: false },
  { key: "Collaboration View", question: "Who worked on this and what happened?", implemented: false },
  { key: "Agent Contribution View", question: "What did Agents do here?", implemented: false },
];

export class RDWorkspaceShellView extends ItemView {
  private readonly deps: RDWorkspaceShellDeps;
  private unsubscribe: (() => void) | null = null;

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
    createChild(shell, "div", { cls: "rdws-toolbar" });
    createChild(shell, "div", { cls: "rdws-body" });
    this.unsubscribe = this.deps.store.subscribe(() => this.renderBody());
    // One explicit availability read on open; after that, only the
    // user's "Re-read availability" action triggers reads.
    await this.refreshAvailability();
    this.renderBody();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }

  /** Explicit re-read of derived-state availability. No rebuild, no
   * sync, no spawn — reads available data only (v1.3.0 §7). */
  private async refreshAvailability(): Promise<void> {
    const load = await loadGraphFromSource(this.deps.source);
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

    if (state.selectedObjectId !== null) {
      createChild(head, "div", {
        cls: "rdws-selected",
        text: `inspecting: ${state.selectedObjectId} (UI pointer; not a lifecycle state)`,
      });
    }

    const list = createChild(body, "div", { cls: "rdws-areas" });
    createChild(list, "div", {
      cls: "rdws-areas-title",
      text: "Inspection areas (v1.6.0 §4)",
    });
    for (const area of AREAS) {
      const row = createChild(list, "div", { cls: "rdws-area" });
      row.setAttribute("data-implemented", String(area.implemented));
      const label = createChild(row, "div", { cls: "rdws-area-name", text: area.key });
      void label;
      const q = createChild(row, "div", { cls: "rdws-area-question", text: area.question });
      void q;
      if (area.implemented) {
        const open = createChild(row, "button", {
          cls: "rdws-area-open",
          text: "Open Knowledge Panel",
        });
        open.addEventListener("click", () => {
          void this.deps.openView(RD_KNOWLEDGE_PANEL_VIEW_TYPE);
        });
      } else {
        createChild(row, "div", {
          cls: "rdws-area-pending",
          text: "planned surface — not implemented in v1.6.1",
        });
      }
    }
  }
}
