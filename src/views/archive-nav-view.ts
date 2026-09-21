/** RD Archive Navigation — the left dock leaf of the Rational
 * Archive shell (V2 Phase A).
 *
 * The code here is the workspace view's former internal navigation
 * rail, re-homed into a real Obsidian dock leaf: same texts, same
 * grouping and ordering rules (declared kinds only, alphabetical;
 * neutral id order within each group), same aria contract. The
 * archive identity head (moved from the old masthead) presents the
 * workspace label from the shared store.
 *
 * Pure presentation: no writes, no new state authority, no
 * persistence. All state comes from the shared session store; the
 * only read is one explicit snapshot load, and only when no other
 * view has published one yet.
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import {
  loadGraphFromSource,
  type GraphSource,
} from "../semantic-graph/graph-loader";
import {
  publishGraphLoad,
  type RDWorkspaceStore,
} from "../architecture/workspace-state";
import { createChild, emptyEl } from "./dom-helpers";
import { RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "./knowledge-panel-view";
import { RD_GRAPH_VIEW_TYPE } from "./graph-intelligence-view";
import { RD_LOOP_VIEW_TYPE } from "./loop-view";
import { RD_INVESTIGATION_VIEW_TYPE } from "./investigation-view";

export const RD_ARCHIVE_NAV_VIEW_TYPE = "rd-archive-nav";

/** Surface destinations (v1.6.0 §5 navigation; explicit only). */
const SURFACES: readonly { key: string; viewType?: string; mode?: "collaboration" }[] = [
  { key: "Collaboration", mode: "collaboration" },
  { key: "Knowledge Panel", viewType: RD_KNOWLEDGE_PANEL_VIEW_TYPE },
  { key: "Graph Intelligence", viewType: RD_GRAPH_VIEW_TYPE },
  { key: "Loop Workspace", viewType: RD_LOOP_VIEW_TYPE },
  { key: "Investigation", viewType: RD_INVESTIGATION_VIEW_TYPE },
];

export interface RDArchiveNavDeps {
  readonly store: RDWorkspaceStore;
  /** Read port for the one-shot explicit snapshot read (only when
   * the shared store has no published snapshot yet). */
  readonly source: GraphSource;
  /** Explicit activation of another RD view (registry path). */
  readonly openView: (viewType: string) => Promise<void>;
}

export class RDArchiveNavView extends ItemView {
  private unsubscribe: (() => void) | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly deps: RDArchiveNavDeps) {
    super(leaf);
  }

  getViewType(): string { return RD_ARCHIVE_NAV_VIEW_TYPE; }
  getDisplayText(): string { return "RD Archive Navigation"; }
  getIcon(): string { return "archive"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    this.unsubscribe = this.deps.store.subscribe(() => this.render());
    // One explicit read, only when no view has published a snapshot
    // yet; afterwards this view renders purely from the store.
    if (this.deps.store.getState().graphSnapshot === null) {
      publishGraphLoad(this.deps.store, await loadGraphFromSource(this.deps.source));
    }
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }

  /** Navigation rail: archive identity head, current selection,
   * knowledge objects, surface destinations. */
  private render(): void {
    emptyEl(this.contentEl);
    const state = this.deps.store.getState();
    const selected = state.selectedObjectId;
    const snapshot = state.graphSnapshot;

    const rail = createChild(this.contentEl, "nav", { cls: "rd-archive-nav" });
    rail.setAttribute("aria-label", "RD workspace navigation");

    // Archive identity head — the brand moved here from the old
    // internal masthead; the label is the shared workspace label.
    const brand = createChild(rail, "div", { cls: "rdan-brand" });
    createChild(brand, "div", { cls: "rdan-brand-title", text: "Rational Delirium" });
    createChild(brand, "div", {
      cls: "rdan-brand-scope",
      text: `investigation archive · ${state.workspaceLabel}`,
    });

    const current = createChild(rail, "div", { cls: "rdan-group" });
    createChild(current, "div", { cls: "rdan-label", text: "Investigation" });
    if (selected !== null) {
      const sel = createChild(current, "div", { cls: "rdan-selection" });
      createChild(sel, "div", { cls: "rdan-selection-id", text: selected });
      const back = createChild(current, "button", {
        cls: "rdan-button rdan-back", text: "◀ Back",
      });
      back.setAttribute("aria-label", "Back along investigation trail");
      back.addEventListener("click", () => this.deps.store.back());
    } else {
      createChild(current, "div", {
        cls: "rdan-hint", text: "nothing selected — query an exact id or choose an object",
      });
    }

    const objects = createChild(rail, "div", { cls: "rdan-group rdan-objects" });
    createChild(objects, "div", { cls: "rdan-label", text: "Knowledge Objects" });
    if (snapshot === null || snapshot.state !== "available") {
      createChild(objects, "div", {
        cls: "rdan-empty",
        text:
          "snapshot unavailable — the vault still contains its knowledge; " +
          "regenerate the derived graph with the projector when needed",
      });
    } else {
      const nodes = [...snapshot.graph.nodes]
        .sort((a, b) => a.object_id.localeCompare(b.object_id));
      if (nodes.length === 0) {
        createChild(objects, "div", { cls: "rdan-empty", text: "no objects in this snapshot" });
      }
      // Archival index: group by DECLARED kind only — kinds that do
      // not exist in this snapshot never appear. Groups stay in
      // neutral alphabetical order; ids stay in neutral id order
      // within each group. Counts are snapshot counts, not weight.
      const byKind = new Map<string, typeof nodes>();
      for (const node of nodes) {
        const list = byKind.get(node.kind) ?? [];
        list.push(node);
        byKind.set(node.kind, list);
      }
      const kinds = [...byKind.keys()].sort((a, b) => a.localeCompare(b));
      for (const kind of kinds) {
        const group = byKind.get(kind) ?? [];
        const heading = createChild(objects, "div", { cls: "rdan-kind" });
        createChild(heading, "span", { cls: "rdan-kind-name", text: kind });
        createChild(heading, "span", {
          cls: "rdan-kind-count",
          text: `· ${group.length}`,
        });
        for (const node of group) {
          const row = createChild(objects, "button", { cls: "rdan-object-row" });
          row.setAttribute("aria-label", `inspect ${node.object_id}`);
          if (node.object_id === selected) row.setAttribute("aria-pressed", "true");
          createChild(row, "span", { cls: "rdan-object-row-id", text: node.object_id });
          createChild(row, "span", {
            cls: "rdan-object-row-meta",
            // kind lives in the group heading above — the row states
            // lifecycle only, no duplicated classification
            text: node.status,
          });
          createChild(row, "span", {
            cls: "rdan-object-row-title", text: node.title,
          });
          row.addEventListener("click", () => {
            this.deps.store.setWorkspaceMode("investigation");
            this.deps.store.setSelectedObject(node.object_id);
          });
        }
      }
    }

    const surfaces = createChild(rail, "div", { cls: "rdan-group" });
    createChild(surfaces, "div", { cls: "rdan-label", text: "Surfaces" });
    for (const surface of SURFACES) {
      const row = createChild(surfaces, "button", { cls: "rdan-surface-row" });
      row.textContent = surface.key;
      if (surface.mode === "collaboration") {
        // v1.7.4-A toggle, now a first-class destination.
        row.classList.add("rdan-collab-toggle");
        row.setAttribute("aria-pressed", String(state.workspaceMode === "collaboration"));
        row.addEventListener("click", () => {
          const mode = this.deps.store.getState().workspaceMode;
          this.deps.store.setWorkspaceMode(
            mode === "collaboration" ? "investigation" : "collaboration");
        });
      } else if (surface.viewType !== undefined) {
        const viewType = surface.viewType;
        row.addEventListener("click", () => { void this.deps.openView(viewType); });
      }
    }
  }
}
