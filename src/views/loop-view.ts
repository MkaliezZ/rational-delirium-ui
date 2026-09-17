/** v0.4.3 §3: read-only LOOP Workspace view over the ONE shared
 * RDIndex. Pure projection (loop-projection.ts) → safe DOM.
 * Selection state is memory-only (§4): the workspace follows the
 * active LOOP (§17) and retains the current selection when the
 * active file is not a LOOP. Navigation reuses the established
 * NavigationPort; BROKEN/AMBIGUOUS endpoints stay inert (§15). */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { NavigationPort } from "../platform/navigation-core";
import type { RDIndex } from "../index/rd-index";
import {
  buildLoopProjection,
  type LoopRelationRow,
  type LoopProjectionData,
} from "../loop/loop-projection";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_LOOP_VIEW_TYPE = "rd-loop-workspace";

export interface LoopDeps {
  readonly index: RDIndex;
  /** Live-update hookup through the shared index commit stream. */
  readonly onIndexCommit: (cb: () => void) => () => void;
  /** Active-file stream from the shared workspace wiring (§17). */
  readonly onActiveFile: (cb: (path: string | null) => void) => () => void;
  /** Current active file, for the initial selection (§4). */
  readonly activeFileProvider?: () => string | null;
  readonly navigation: NavigationPort;
}

export class RDLoopView extends ItemView {
  private readonly deps: LoopDeps;
  private unsubscribeIndex: (() => void) | null = null;
  private unsubscribeActive: (() => void) | null = null;
  private container: HTMLElement | null = null;
  /** §4/§17: memory-only selected LOOP path. */
  private selectedLoopPath: string | null = null;

  constructor(leaf: WorkspaceLeaf, deps: LoopDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string { return RD_LOOP_VIEW_TYPE; }
  getDisplayText(): string { return "RD Loop Workspace"; }
  getIcon(): string { return "iteration-ccw"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-loop" });
    this.unsubscribeIndex = this.deps.onIndexCommit(() => this.onIndexChanged());
    this.unsubscribeActive = this.deps.onActiveFile((path) => this.onActiveFileChanged(path));
    // §4: initial selection comes from the currently active RD object.
    this.syncFromActiveFile(this.currentActivePath());
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribeIndex?.();
    this.unsubscribeActive?.();
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    emptyEl(this.contentEl);
  }

  /** Test/programmatic selection; memory-only. */
  selectLoop(path: string | null): void {
    this.selectedLoopPath = path;
    this.render();
  }

  get selectedLoop(): string | null { return this.selectedLoopPath; }

  private currentActivePath(): string | null {
    return this.deps.activeFileProvider !== undefined ? this.deps.activeFileProvider() : null;
  }

  private onActiveFileChanged(path: string | null): void {
    if (this.syncFromActiveFile(path)) this.render();
  }

  /** §17: follow the active LOOP; retain the current selection when
   * the active file is not a LOOP. Returns whether state changed. */
  private syncFromActiveFile(path: string | null): boolean {
    if (path === null) return false;
    const object = this.deps.index.objectAt(path);
    if (object !== null && object.type === "loop") {
      if (this.selectedLoopPath === path) return false;
      this.selectedLoopPath = path;
      return true;
    }
    return false;
  }

  private onIndexChanged(): void {
    // The selected LOOP may have been deleted or declassified; a
    // vanished selection falls back to the selector.
    if (this.selectedLoopPath !== null) {
      const object = this.deps.index.objectAt(this.selectedLoopPath);
      if (object === null || object.type !== "loop") {
        this.selectedLoopPath = null;
      }
    }
    this.render();
  }

  render(): void {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);

    const data = buildLoopProjection(this.deps.index, this.selectedLoopPath);

    const head = createChild(shell, "div", { cls: "rdl-head" });
    createChild(head, "div", { cls: "rdl-title", text: "Loop" });

    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdl-state", text: "Indexing archive…" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdl-state rdl-error", text: "Index unavailable." });
      return;
    }

    if (data.phase === "NO_LOOP_SELECTED" || data.phase === "NO_SUCH_LOOP") {
      const section = this.section(shell, "Loops");
      if (data.loops.length === 0) {
        createChild(shell, "div", { cls: "rdl-state", text: "No LOOP selected." });
        return;
      }
      for (const entry of data.loops) {
        const btn = createChild(section, "button", { cls: "rdl-loop-pick" });
        btn.setAttribute("aria-label", `Select loop ${entry.title}`);
        createChild(btn, "span", { cls: "rdl-loop-pick-title", text: entry.title });
        const meta = createChild(btn, "span", { cls: "rdl-meta" });
        meta.textContent = entry.id ?? "(no id)";
        btn.addEventListener("click", () => {
          this.selectedLoopPath = entry.path;
          this.render();
        });
      }
      return;
    }

    this.renderIdentity(shell, data);
    this.renderRows(shell, "Recurrences", data.recurrences, "No recurrences recorded.");
    this.renderRows(shell, "Evidence", data.evidence, "No connected evidence.");
    this.renderRows(shell, "Hypotheses", data.hypotheses, "No connected hypotheses.");
    this.renderRows(shell, "Related Cases", data.cases, "No related cases.");
  }

  /** §6 + LOOP-02: canonical LOOP fields only — title, id, status,
   * path, lastVerified — as read-only safe text. */
  private renderIdentity(shell: HTMLElement, data: LoopProjectionData): void {
    const identity = data.selectedLoop;
    if (identity === null) return;
    const section = this.section(shell, "Identity");
    const idEl = createChild(section, "div", { cls: "rdl-identity" });
    createChild(idEl, "span", { cls: "rdl-identity-title", text: identity.title });
    const meta = createChild(idEl, "span", { cls: "rdl-meta" });
    const bits = [
      identity.id ?? "(no id)",
      identity.status || "(no status)",
      identity.path,
    ];
    if (identity.lastVerified !== null) bits.push("verified " + identity.lastVerified);
    meta.textContent = bits.join(" · ");
  }

  private renderRows(
    shell: HTMLElement,
    title: string,
    rows: LoopRelationRow[],
    emptyText: string,
  ): void {
    const section = this.section(shell, title);
    if (rows.length === 0) {
      createChild(section, "div", { cls: "rdl-state", text: emptyText });
      return;
    }
    for (const row of rows) {
      this.renderRow(section, row);
    }
  }

  private renderRow(section: HTMLElement, row: LoopRelationRow): void {
    // §15: only a RESOLVED other endpoint on an existing path may
    // navigate. BROKEN/AMBIGUOUS rows are inert.
    const navigable = row.otherPath !== null && row.resolution === "RESOLVED";
    const el = createChild(section, navigable ? "button" : "div", { cls: "rdl-rel" });
    if (!navigable) el.setAttribute("aria-disabled", "true");
    const line = createChild(el, "span", { cls: "rdl-rel-line" });
    line.textContent =
      `${row.direction === "outgoing" ? "→" : "←"} ${row.predicate} ${row.otherLabel}`;
    const badge = createChild(el, "span", { cls: "rdl-badge" });
    badge.textContent = row.resolution;
    badge.setAttribute("data-state", row.resolution);
    if (navigable && row.otherPath !== null) {
      const path = row.otherPath;
      el.setAttribute("aria-label", `Open ${row.otherLabel}`);
      el.addEventListener("click", () => {
        void this.deps.navigation.open({ path }, "normal");
      });
    }
  }

  private section(shell: HTMLElement, title: string): HTMLElement {
    const section = createChild(shell, "section", { cls: "rdl-section" });
    createChild(section, "h3", { cls: "rdl-section-title", text: title });
    return section;
  }
}
