/** v0.4.2 §4: read-only Investigation Dashboard view over the ONE
 * shared RDIndex. Pure projection (investigation-projection.ts) →
 * safe DOM. No rescanning, no second index, no persistence: filter
 * state is session-only (memory). Navigation reuses the established
 * v0.4.1 NavigationPort path; unresolved targets are never given a
 * deterministic navigation action (§10). */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { NavigationPort } from "../platform/navigation-core";
import type { RDIndex } from "../index/rd-index";
import {
  buildInvestigationProjection,
  type AttentionItem,
  type InvestigationProjectionData,
} from "../investigation/investigation-projection";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_INVESTIGATION_VIEW_TYPE = "rd-investigation-dashboard";

/** §13: lightweight session-only focus filters. Reload resets. */
export type InvestigationFilter = "all" | "cases" | "unresolved" | "contradictions";

export interface InvestigationDeps {
  readonly index: RDIndex;
  /** Live-update hookup through the shared index commit stream. */
  readonly onIndexCommit: (cb: () => void) => () => void;
  readonly navigation: NavigationPort;
}

const FILTERS: ReadonlyArray<{ key: InvestigationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "cases", label: "Cases" },
  { key: "unresolved", label: "Unresolved" },
  { key: "contradictions", label: "Contradictions" },
];

function formatDate(mtime: number): string {
  if (mtime <= 0) return "—";
  return new Date(mtime).toISOString().slice(0, 10);
}

export class RDInvestigationView extends ItemView {
  private readonly deps: InvestigationDeps;
  private unsubscribe: (() => void) | null = null;
  private container: HTMLElement | null = null;
  private filter: InvestigationFilter = "all";

  constructor(leaf: WorkspaceLeaf, deps: InvestigationDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string { return RD_INVESTIGATION_VIEW_TYPE; }
  getDisplayText(): string { return "RD Investigation"; }
  getIcon(): string { return "layout-list"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-investigation" });
    this.unsubscribe = this.deps.onIndexCommit(() => this.render());
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }

  /** §13: session-only; exists purely in this view instance. */
  setFilter(filter: InvestigationFilter): void {
    this.filter = filter;
    this.render();
  }

  get currentFilter(): InvestigationFilter { return this.filter; }

  render(): void {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);

    const data = buildInvestigationProjection(this.deps.index);

    const head = createChild(shell, "div", { cls: "rdi-head" });
    createChild(head, "div", { cls: "rdi-title", text: "Investigation" });
    const bar = createChild(head, "div", { cls: "rdi-filters" });
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Investigation focus");
    for (const f of FILTERS) {
      const btn = createChild(bar, "button", { cls: "rdi-filter", text: f.label });
      btn.setAttribute("aria-pressed", this.filter === f.key ? "true" : "false");
      btn.setAttribute("aria-label", "Filter: " + f.label);
      btn.addEventListener("click", () => this.setFilter(f.key));
    }

    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdi-state", text: "Indexing archive…" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdi-state rdi-error", text: "Index unavailable." });
      return;
    }
    if (data.cases.length === 0 && data.recent.length === 0 && data.attention.length === 0) {
      createChild(shell, "div", { cls: "rdi-state", text: "No RD objects in the current index." });
      return;
    }

    this.renderKnowledgeState(shell, data);
    if (this.filter === "all" || this.filter === "cases") {
      this.renderCases(shell, data);
    }
    if (this.filter !== "cases") {
      this.renderAttention(shell, data);
    }
    if (this.filter === "all") {
      this.renderRecent(shell, data);
    }
  }

  /** §7: canonical object type counts + logical relation state counts. */
  private renderKnowledgeState(shell: HTMLElement, data: InvestigationProjectionData): void {
    const section = this.section(shell, "Knowledge State");
    const grid = createChild(section, "div", { cls: "rdi-counts" });
    const entries: ReadonlyArray<[string, number]> = [
      ["CASE", data.counts.case],
      ["EVIDENCE", data.counts.evidence],
      ["HYPOTHESIS", data.counts.hypothesis],
      ["LOOP", data.counts.loop],
      ["BROKEN", data.counts.broken],
      ["AMBIGUOUS", data.counts.ambiguous],
      ["CONTRADICTION", data.counts.contradiction],
    ];
    for (const [label, value] of entries) {
      const cell = createChild(grid, "div", { cls: "rdi-count" });
      createChild(cell, "span", { cls: "rdi-count-value", text: String(value) });
      createChild(cell, "span", { cls: "rdi-count-label", text: label });
    }
  }

  /** §8: CASE rows, most recently modified first, existing model
   * fields only. Click opens the EXISTING file via the established
   * navigation path; never creates a file. */
  private renderCases(shell: HTMLElement, data: InvestigationProjectionData): void {
    const section = this.section(shell, "Cases");
    if (data.cases.length === 0) {
      createChild(section, "div", { cls: "rdi-state", text: "No cases in the current index." });
      return;
    }
    for (const row of data.cases) {
      const btn = createChild(section, "button", { cls: "rdi-case" });
      btn.setAttribute(
        "aria-label",
        `Open case ${row.title}${row.id !== null ? " (" + row.id + ")" : ""}`,
      );
      createChild(btn, "span", { cls: "rdi-case-title", text: row.title });
      const meta = createChild(btn, "span", { cls: "rdi-meta" });
      meta.textContent =
        `${row.id ?? "(no id)"} · ${formatDate(row.mtime)}` +
        ` · rel ${row.relations.resolved}/${row.relations.unresolved}` +
        (row.relations.contradiction > 0 ? ` · contra ${row.relations.contradiction}` : "");
      btn.addEventListener("click", () => {
        void this.deps.navigation.open({ path: row.path }, "normal");
      });
    }
  }

  /** §9: logical relations needing attention. §22 invariants: E != F,
   * raw labels visible, logical dedup already done by the index. */
  private renderAttention(shell: HTMLElement, data: InvestigationProjectionData): void {
    const section = this.section(shell, "Attention");
    const kinds =
      this.filter === "unresolved" ? ["BROKEN", "AMBIGUOUS"]
        : this.filter === "contradictions" ? ["CONTRADICTION"]
          : ["BROKEN", "AMBIGUOUS", "CONTRADICTION"];
    const items = data.attention.filter((item) => kinds.includes(item.kind));
    if (items.length === 0) {
      createChild(section, "div", { cls: "rdi-state", text: "Nothing requires attention." });
      return;
    }
    for (const item of items) {
      this.renderAttentionRow(section, item);
    }
  }

  private renderAttentionRow(section: HTMLElement, item: AttentionItem): void {
    // §10: only a RESOLVED target on an existing path may navigate.
    // BROKEN/AMBIGUOUS rows are inert — no file creation, no guess,
    // no arbitrary candidate open.
    const navigable = item.targetPath !== null && item.targetResolution === "RESOLVED";
    const row = createChild(section, navigable ? "button" : "div", { cls: "rdi-att" });
    if (!navigable) row.setAttribute("aria-disabled", "true");
    const line = createChild(row, "span", { cls: "rdi-att-line" });
    line.textContent = `${item.sourceLabel} ${item.predicate} ${item.targetLabel}`;
    // §31: visible text semantics, never color-only status.
    const badge = createChild(row, "span", { cls: "rdi-badge" });
    badge.textContent = item.kind;
    badge.setAttribute("data-kind", item.kind);
    if (navigable && item.targetPath !== null) {
      const path = item.targetPath;
      row.setAttribute("aria-label", `Open ${item.targetLabel}`);
      row.addEventListener("click", () => {
        void this.deps.navigation.open({ path }, "normal");
      });
    }
  }

  /** §12: current filesystem metadata only; no history, no log. */
  private renderRecent(shell: HTMLElement, data: InvestigationProjectionData): void {
    const section = this.section(shell, "Recent");
    if (data.recent.length === 0) {
      createChild(section, "div", { cls: "rdi-state", text: "No recent objects." });
      return;
    }
    for (const object of data.recent) {
      const btn = createChild(section, "button", { cls: "rdi-recent" });
      btn.setAttribute("aria-label", `Open ${object.title}`);
      const line = createChild(btn, "span", { cls: "rdi-recent-line" });
      line.textContent = `${object.type} · ${object.title}`;
      const meta = createChild(btn, "span", { cls: "rdi-meta" });
      meta.textContent = formatDate(object.mtime);
      btn.addEventListener("click", () => {
        void this.deps.navigation.open({ path: object.path }, "normal");
      });
    }
  }

  private section(shell: HTMLElement, title: string): HTMLElement {
    const section = createChild(shell, "section", { cls: "rdi-section" });
    createChild(section, "h3", { cls: "rdi-section-title", text: title });
    return section;
  }
}
