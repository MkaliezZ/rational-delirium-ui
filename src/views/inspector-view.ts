/** RD Inspector — the right dock leaf of the Rational Archive
 * shell (V2 Phase A).
 *
 * The code here is the workspace view's former internal inspection
 * plane, re-homed into a real Obsidian dock leaf: same texts, same
 * zone hierarchy (the selected object's declared context first, the
 * workspace zone — recorded Human decisions and Agent work —
 * subordinate), same aria contract, same honesty strings.
 *
 * Pure presentation: no writes, no new state authority, no
 * persistence. Knowledge-object data comes from the shared store's
 * published snapshot (the read is owned by the shared graph
 * snapshot coordinator, V2-01); collaboration summaries come from
 * the shared CollaborationBrowser — this view subscribes, it never
 * drives a refresh.
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { GraphSnapshotCoordinator } from "../architecture/graph-snapshot-coordinator";
import { type RDWorkspaceStore } from "../architecture/workspace-state";
import type { CollaborationBrowser } from "../collaboration/collaboration-surface";
import type { RDShellController } from "../architecture/rd-shell-controller";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_INSPECTOR_VIEW_TYPE = "rd-inspector";

const REVIEW_LIMIT = 5;
const CONTRIBUTION_LIMIT = 3;

export interface RDInspectorDeps {
  readonly store: RDWorkspaceStore;
  /** Read port for the snapshot read. Used only to build a private
   * fallback coordinator when no shared one is injected (direct
   * construction in tests). */
  readonly source: GraphSource;
  /** V2-01: the shared graph snapshot coordinator (created once in
   * rd-view-setup). This view never reads or publishes on its own. */
  readonly coordinator?: GraphSnapshotCoordinator;
  /** Shared collaboration browser (created once in rd-view-setup).
   * This view only subscribes to its presentation state. */
  readonly browser: CollaborationBrowser;
  /** Shell controller: proposal/contribution rows jump into the
   * workspace's collaboration surface through it. */
  readonly shellController: RDShellController;
}

export class RDInspectorView extends ItemView {
  private unsubscribeStore: (() => void) | null = null;
  private unsubscribeBrowser: (() => void) | null = null;
  /** V2-01: the one snapshot authority (shared in production). */
  private readonly coordinator: GraphSnapshotCoordinator;
  /** V2-02: async lifecycle — the view is renderable only between
   * onOpen and onClose, and each onOpen starts a new open
   * generation so a stale awaited continuation can never render. */
  private active = false;
  private openGeneration = 0;

  constructor(leaf: WorkspaceLeaf, private readonly deps: RDInspectorDeps) {
    super(leaf);
    this.coordinator = deps.coordinator
      ?? new GraphSnapshotCoordinator(deps.store, deps.source);
  }

  getViewType(): string { return RD_INSPECTOR_VIEW_TYPE; }
  getDisplayText(): string { return "RD Inspector"; }
  getIcon(): string { return "panel-right"; }

  async onOpen(): Promise<void> {
    this.openGeneration += 1;
    const generation = this.openGeneration;
    this.active = true;
    emptyEl(this.contentEl);
    this.unsubscribeStore = this.deps.store.subscribe(() => this.render());
    this.unsubscribeBrowser = this.deps.browser.subscribe(() => this.render());
    // The coordinator owns the one published snapshot: a cold open
    // joins the in-flight read instead of starting its own.
    await this.coordinator.ensureLoaded();
    // V2-02: a continuation that resolves after close — or after a
    // close→reopen cycle — belongs to a dead generation: drop
    // silently (closed DOM stays empty, no render, no publish).
    if (!this.active || generation !== this.openGeneration) return;
    this.render();
  }

  async onClose(): Promise<void> {
    this.active = false;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.unsubscribeBrowser?.();
    this.unsubscribeBrowser = null;
    emptyEl(this.contentEl);
  }

  /** Inspection surface: selected object metadata, linked objects,
   * Human review attention, recent contributions, diagnostics for
   * the selection. Collaboration summaries live in the workspace
   * zone, visually separate from knowledge state. */
  private render(): void {
    if (!this.active) return;
    emptyEl(this.contentEl);
    const state = this.deps.store.getState();
    const selected = state.selectedObjectId;
    const snapshot = state.graphSnapshot;
    const available = snapshot !== null && snapshot.state === "available";
    const graphSelection = state.selectionSource === "graph-intelligence";
    const matches = available && selected !== null && snapshot !== null
      ? snapshot.graph.nodes.filter((node) => node.object_id === selected) : [];
    const graphSelectionUnavailable = graphSelection && matches.length !== 1;

    const plane = createChild(this.contentEl, "aside", { cls: "rd-inspector" });
    plane.setAttribute("aria-label", "RD inspection");

    const model = this.deps.browser.getState().model;

    // Inspector hierarchy (review fix): the PRIMARY zone carries the
    // selected Knowledge Object's own context; the workspace zone is
    // visually subordinate so review/contribution records never read
    // as peer knowledge properties.
    let objectZone: HTMLElement | null = null;
    if (!graphSelectionUnavailable && available && selected !== null && snapshot !== null) {
      objectZone = createChild(plane, "div", { cls: "rdin-zone" });
      objectZone.setAttribute("data-zone", "object");
      createChild(objectZone, "div", { cls: "rdin-zone-label", text: "Selected object" });
    } else if (graphSelectionUnavailable) {
      const emptyZone = createChild(plane, "div", { cls: "rdin-zone" });
      emptyZone.setAttribute("data-zone", "object");
      createChild(emptyZone, "div", { cls: "rdin-zone-label", text: "Selected object" });
      createChild(emptyZone, "div", { cls: "rdin-empty",
        text: "Current object unavailable in workspace snapshot" });
      createChild(emptyZone, "div", { cls: "rdin-empty", text: selected === null
        ? "Graph selection has no declared identity."
        : `${selected} · ${matches.length > 1 ? "ambiguous identity" : "no unique snapshot match"}` });
    } else if (selected === null) {
      // Honest empty state: no fabricated object context.
      const emptyZone = createChild(plane, "div", { cls: "rdin-zone" });
      emptyZone.setAttribute("data-zone", "object");
      createChild(emptyZone, "div", { cls: "rdin-zone-label", text: "Selected object" });
      createChild(emptyZone, "div", {
        cls: "rdin-empty", text: "nothing selected — query an exact id or choose an object",
      });
    }

    // Object — declared identity of the current selection. Metadata
    // only; nothing here validates the object.
    if (!graphSelectionUnavailable && available && selected !== null && snapshot !== null) {
      const graph = snapshot.graph;
      const node = graph.nodes.find((n) => n.object_id === selected);
      const obj = createChild(objectZone!, "section", { cls: "rdin-group" });
      createChild(obj, "div", { cls: "rdin-label", text: "Object" });
      if (node === undefined) {
        createChild(obj, "div", {
          cls: "rdin-empty", text: `${selected} — not in snapshot`,
        });
      } else {
        const meta = createChild(obj, "dl", { cls: "rdin-meta" });
        const metaRow = (k: string, v: string) => {
          createChild(meta, "dt", { text: k });
          createChild(meta, "dd", { text: v });
        };
        metaRow("id", node.object_id);
        metaRow("kind", node.kind);
        metaRow("lifecycle", node.status);
        if (node.predecessor !== null) metaRow("predecessor", node.predecessor);
        if (node.successor !== null) metaRow("successor", node.successor);
      }
    }

    // Linked objects — declared relations touching the selection.
    // Navigation only; the listing carries no evaluation.
    if (!graphSelectionUnavailable && available && selected !== null && snapshot !== null) {
      const graph = snapshot.graph;
      const linked = createChild(objectZone!, "section", { cls: "rdin-group" });
      createChild(linked, "div", { cls: "rdin-label", text: "Linked objects" });
      const edges = graph.edges
        .filter((e) => e.source === selected || e.target === selected);
      const unresolved = graph.unresolved
        .filter((e) => e.source === selected || e.target === selected);
      if (edges.length === 0 && unresolved.length === 0) {
        createChild(linked, "div", {
          cls: "rdin-empty", text: "no declared relations in this snapshot",
        });
      } else {
        for (const edge of edges) {
          const outgoing = edge.source === selected;
          const otherId = outgoing ? edge.target : edge.source;
          const row = createChild(linked, "button", { cls: "rdin-link-row" });
          row.setAttribute("data-relation", edge.relation);
          row.setAttribute("aria-label", `inspect ${otherId}`);
          createChild(row, "span", {
            cls: "rdin-link-type",
            text: outgoing ? `${edge.relation} →` : `← ${edge.relation}`,
          });
          createChild(row, "span", { cls: "rdin-link-id", text: otherId });
          row.addEventListener("click", () => {
            this.deps.store.setWorkspaceMode("investigation");
            this.deps.store.setSelectedObject(otherId);
          });
        }
        for (const u of unresolved) {
          const outgoing = u.source === selected;
          const target = outgoing ? u.target : u.source;
          const row = createChild(linked, "div", { cls: "rdin-link-row rdin-link-unresolved" });
          row.setAttribute("data-relation", u.relation);
          row.setAttribute("aria-disabled", "true");
          createChild(row, "span", {
            cls: "rdin-link-type",
            text: outgoing ? `${u.relation} →` : `← ${u.relation}`,
          });
          createChild(row, "span", { cls: "rdin-link-id", text: target });
          createChild(row, "span", { cls: "rdin-link-state", text: "unresolved" });
        }
      }
    }

    // Workspace zone — recorded Human actions and Agent work on the
    // archive. Distinct from, and subordinate to, the selected
    // object's declared context above.
    const workspaceZone = createChild(plane, "div", { cls: "rdin-zone" });
    workspaceZone.setAttribute("data-zone", "workspace");
    createChild(workspaceZone, "div", { cls: "rdin-zone-label", text: "Workspace" });

    // Human review attention — pending proposals, existing data only.
    const review = createChild(workspaceZone, "section", { cls: "rdin-group" });
    createChild(review, "div", { cls: "rdin-label", text: "Workspace review" });
    const pending = model !== null
      ? model.proposals.filter((p) => p.status === "pending")
      : [];
    if (model === null) {
      createChild(review, "div", {
        cls: "rdin-empty", text: "reading proposal records…",
      });
    } else if (pending.length === 0) {
      createChild(review, "div", {
        cls: "rdin-empty",
        text: model.proposals.length > 0
          ? "No proposals awaiting decision — all recorded proposals are decided."
          : "No proposal records found.",
      });
    } else {
      createChild(review, "div", {
        cls: "rdin-count",
        text: `${pending.length} awaiting your decision`,
      });
      for (const p of pending.slice(0, REVIEW_LIMIT)) {
        const row = createChild(review, "button", { cls: "rdin-review-row" });
        row.setAttribute("aria-label", `review ${p.id ?? p.path}`);
        createChild(row, "span", {
          cls: "rdin-review-id", text: p.id ?? "(no id declared)",
        });
        createChild(row, "span", {
          cls: "rdin-review-meta",
          text: p.target !== null ? `→ ${p.target}` : (p.authorAgent ?? "author not declared"),
        });
        row.addEventListener("click", () => {
          void this.deps.shellController.openProposalInWorkspace(p.path);
        });
      }
      if (pending.length > REVIEW_LIMIT) {
        createChild(review, "div", {
          cls: "rdin-more", text: `+ ${pending.length - REVIEW_LIMIT} more in Collaboration`,
        });
      }
    }

    // Recent contributions — provenance of what agents did, not proof.
    const contribs = createChild(workspaceZone, "section", { cls: "rdin-group" });
    createChild(contribs, "div", {
      cls: "rdin-label", text: "Recent workspace contributions",
    });
    const records = model !== null
      ? [...model.contributions].sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, CONTRIBUTION_LIMIT)
      : [];
    if (records.length === 0) {
      createChild(contribs, "div", {
        cls: "rdin-empty", text: "No contribution records found.",
      });
    } else {
      for (const c of records) {
        const row = createChild(contribs, "button", { cls: "rdin-contrib-row" });
        row.setAttribute("aria-label", `inspect ${c.id ?? c.path}`);
        createChild(row, "span", {
          cls: "rdin-review-id", text: c.id ?? "(no id declared)",
        });
        createChild(row, "span", {
          cls: "rdin-review-meta",
          text: [
            c.performedOperation,
            c.createdAt,
          ].filter((x): x is string => x !== null).join(" · "),
        });
        row.addEventListener("click", () => {
          void this.deps.shellController.openContributionInWorkspace(c.path);
        });
      }
    }

    // Diagnostics for the current selection — declared data only.
    if (!graphSelectionUnavailable && available && selected !== null && snapshot !== null) {
      const graph = snapshot.graph;
      const unresolvedCount = graph.unresolved
        .filter((e) => e.source === selected || e.target === selected).length;
      const relationCount = graph.edges
        .filter((e) => e.source === selected || e.target === selected).length;
      const diagCount = graph.diagnostics
        .filter((d) => d.object_id === selected).length;
      const diag = createChild(plane, "section", { cls: "rdin-group" });
      createChild(diag, "div", { cls: "rdin-label", text: "Diagnostics" });
      const line = createChild(diag, "div", { cls: "rdin-diag-line" });
      line.textContent =
        `${relationCount} declared relation(s) · ${unresolvedCount} unresolved · ` +
        `${diagCount} diagnostic(s) — observations, not repair requests`;
    }
  }
}
