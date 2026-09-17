/** v0.4.4 §3: read-only Graph Intelligence view — a semantic READER
 * over the ONE shared RDIndex. Pure projection (graph-projection.ts)
 * → safe DOM. Follows the active RD object (all four types); retains
 * the selection on non-RD activity; second hop is explicitly expanded
 * per resolved neighbor and reset when the root changes; native Local
 * Graph handoff goes through the single NavigationPort boundary. No
 * renderer, no canvas, no graph DOM. */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { NavigationPort } from "../platform/navigation-core";
import type { RDIndex } from "../index/rd-index";
import {
  buildGraphProjection,
  buildSecondHop,
  type GraphEdgeRow,
  type GraphProjectionData,
  type GraphProvenance,
} from "../graph/graph-projection";
import { createChild, emptyEl } from "./dom-helpers";

export const RD_GRAPH_VIEW_TYPE = "rd-graph-intelligence";

export interface GraphDeps {
  readonly index: RDIndex;
  readonly onIndexCommit: (cb: () => void) => () => void;
  readonly onActiveFile: (cb: (path: string | null) => void) => () => void;
  readonly activeFileProvider?: () => string | null;
  readonly navigation: NavigationPort;
}

export class RDGraphIntelligenceView extends ItemView {
  private readonly deps: GraphDeps;
  private unsubscribeIndex: (() => void) | null = null;
  private unsubscribeActive: (() => void) | null = null;
  private container: HTMLElement | null = null;
  /** §4: memory-only selection. */
  private selectedPath: string | null = null;
  /** §15: memory-only expanded second-hop neighbors (resolved paths). */
  private expandedNeighbors = new Set<string>();
  private nativeGraphState: "OPENED" | "UNAVAILABLE" | null = null;

  constructor(leaf: WorkspaceLeaf, deps: GraphDeps) {
    super(leaf);
    this.deps = deps;
  }

  getViewType(): string { return RD_GRAPH_VIEW_TYPE; }
  getDisplayText(): string { return "RD Graph Intelligence"; }
  getIcon(): string { return "git-fork"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-graph" });
    this.unsubscribeIndex = this.deps.onIndexCommit(() => this.onIndexChanged());
    this.unsubscribeActive = this.deps.onActiveFile((path) => this.onActiveFileChanged(path));
    this.syncFromActiveFile(
      this.deps.activeFileProvider !== undefined ? this.deps.activeFileProvider() : null,
    );
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribeIndex?.();
    this.unsubscribeActive?.();
    this.unsubscribeIndex = null;
    this.unsubscribeActive = null;
    emptyEl(this.contentEl);
  }

  selectObject(path: string | null): void {
    if (path !== this.selectedPath) {
      // §4: changing the root resets all second-hop expansion state.
      this.expandedNeighbors.clear();
    }
    this.selectedPath = path;
    this.render();
  }

  get selected(): string | null { return this.selectedPath; }
  get expandedSecondHops(): readonly string[] { return [...this.expandedNeighbors]; }

  private onActiveFileChanged(path: string | null): void {
    if (this.syncFromActiveFile(path)) this.render();
  }

  /** §4: follow the active RD object; RETAIN the selection when the
   * active file is not an indexed RD object. */
  private syncFromActiveFile(path: string | null): boolean {
    if (path === null) return false;
    if (path === this.selectedPath) return false;
    const object = this.deps.index.objectAt(path);
    if (object === null) return false;
    this.expandedNeighbors.clear();
    this.selectedPath = path;
    return true;
  }

  private onIndexChanged(): void {
    if (this.selectedPath !== null) {
      const object = this.deps.index.objectAt(this.selectedPath);
      if (object === null) {
        this.selectedPath = null;
        this.expandedNeighbors.clear();
      }
    }
    // §15: safely drop expansions for vanished/declassified neighbors.
    for (const path of [...this.expandedNeighbors]) {
      const object = this.deps.index.objectAt(path);
      if (object === null) this.expandedNeighbors.delete(path);
    }
    this.render();
  }

  render(): void {
    const shell = this.container;
    if (shell === null) return;
    emptyEl(shell);

    const data = buildGraphProjection(this.deps.index, this.selectedPath);

    const head = createChild(shell, "div", { cls: "rdg-head" });
    createChild(head, "div", { cls: "rdg-title", text: "Graph Intelligence" });

    if (data.indexState === "INDEXING") {
      createChild(shell, "div", { cls: "rdg-state", text: "Indexing archive…" });
      return;
    }
    if (data.indexState === "ERROR") {
      createChild(shell, "div", { cls: "rdg-state rdg-error", text: "Index unavailable." });
      return;
    }

    if (data.phase !== "READY" || data.selectedObject === null) {
      const section = this.section(shell, "RD Objects");
      if (data.selectableObjects.length === 0) {
        createChild(shell, "div", { cls: "rdg-state", text: "No RD object selected." });
        return;
      }
      for (const entry of data.selectableObjects) {
        const btn = createChild(section, "button", { cls: "rdg-pick" });
        btn.setAttribute("aria-label", `Select ${entry.type} ${entry.title}`);
        const line = createChild(btn, "span", { cls: "rdg-pick-title" });
        line.textContent = `${entry.type} · ${entry.title}`;
        const meta = createChild(btn, "span", { cls: "rdg-meta" });
        meta.textContent = entry.id ?? "(no id)";
        btn.addEventListener("click", () => this.selectObject(entry.path));
      }
      return;
    }

    this.renderIdentity(shell, data.selectedObject);
    this.renderFirstHop(shell, data);
    if (this.expandedNeighbors.size > 0) {
      this.renderSecondHop(shell, data.selectedObject.path);
    }
    this.renderNativeGraph(shell, data.selectedObject.path);
  }

  /** §6: canonical identity fields only. */
  private renderIdentity(shell: HTMLElement, identity: {
    title: string; id: string | null; type: string;
    status: string; path: string; lastVerified: string | null;
  }): void {
    const section = this.section(shell, "Identity");
    const idEl = createChild(section, "div", { cls: "rdg-identity" });
    createChild(idEl, "span", { cls: "rdg-identity-title", text: identity.title });
    const meta = createChild(idEl, "span", { cls: "rdg-meta" });
    const bits = [
      identity.id ?? "(no id)",
      identity.type,
      identity.status || "(no status)",
      identity.path,
    ];
    if (identity.lastVerified !== null) bits.push("verified " + identity.lastVerified);
    meta.textContent = bits.join(" · ");
  }

  private renderFirstHop(shell: HTMLElement, data: GraphProjectionData): void {
    const section = this.section(shell, "Semantic Relations");
    if (data.firstHop.length === 0) {
      createChild(section, "div", { cls: "rdg-state", text: "No semantic relations recorded." });
      return;
    }
    for (const edge of data.firstHop) {
      this.renderEdge(section, edge, true);
    }
  }

  /** §12: second-hop branch, direction relative to the NEIGHBOR. */
  private renderSecondHop(shell: HTMLElement, rootPath: string): void {
    const section = this.section(shell, "Second Hop");
    for (const neighbor of [...this.expandedNeighbors].sort()) {
      const rows = buildSecondHop(this.deps.index, neighbor, rootPath);
      const branch = createChild(section, "div", { cls: "rdg-branch" });
      const branchTitle = createChild(branch, "div", { cls: "rdg-branch-title" });
      branchTitle.textContent = `Second hop via ${neighbor}`;
      if (rows.length === 0) {
        createChild(branch, "div", { cls: "rdg-state", text: "No semantic relations recorded." });
      }
      for (const edge of rows) {
        // §12: second-hop rows are terminal — no third-hop expansion.
        this.renderEdge(branch, edge, false);
      }
    }
  }

  private renderEdge(
    container: HTMLElement,
    edge: GraphEdgeRow,
    expandable: boolean,
  ): void {
    const navigable = edge.otherPath !== null && edge.resolution === "RESOLVED";
    const el = createChild(container, navigable ? "button" : "div", { cls: "rdg-rel" });
    if (!navigable) el.setAttribute("aria-disabled", "true");
    const line = createChild(el, "span", { cls: "rdg-rel-line" });
    const typeTag = edge.otherType !== null ? ` [${edge.otherType}]` : "";
    line.textContent =
      `${edge.direction === "outgoing" ? "→" : "←"} ${edge.predicate} ${edge.otherLabel}${typeTag}`;
    const badge = createChild(el, "span", { cls: "rdg-badge" });
    badge.textContent = edge.resolution;
    badge.setAttribute("data-state", edge.resolution);

    if (navigable && edge.otherPath !== null) {
      const otherPath = edge.otherPath;
      el.setAttribute("aria-label", `Open ${edge.otherLabel}`);
      el.addEventListener("click", () => {
        void this.deps.navigation.open({ path: otherPath }, "normal");
      });
      // §12: only RESOLVED first-hop endpoints expose expansion.
      if (expandable) {
        const toggle = createChild(el, "button", { cls: "rdg-hop-toggle" });
        const expanded = this.expandedNeighbors.has(otherPath);
        toggle.textContent = expanded ? "− second hop" : "+ second hop";
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.setAttribute("aria-label", `Toggle second hop via ${edge.otherLabel}`);
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.expandedNeighbors.has(otherPath)) this.expandedNeighbors.delete(otherPath);
          else this.expandedNeighbors.add(otherPath);
          this.render();
        });
      }
    }

    // §9: full assertion provenance under every edge.
    const prov = createChild(container, "div", { cls: "rdg-prov" });
    for (const p of edge.provenance) {
      this.renderProvenance(prov, p);
    }
  }

  private renderProvenance(container: HTMLElement, p: GraphProvenance): void {
    const row = createChild(container, "div", { cls: "rdg-prov-row" });
    const line = createChild(row, "span", { cls: "rdg-prov-line" });
    const location =
      p.kind === "frontmatter"
        ? `frontmatter · ${p.field ?? p.declaredPredicate}`
        : `body${p.line !== null ? " · line " + p.line : ""}`;
    line.textContent = `${p.declaredPredicate} @ ${p.sourcePath} (${location}) raw [[${p.rawLink}]]`;
    // §10: source navigation — BODY assertions with a reliable line
    // use the existing source mode; everything else degrades safely
    // to plain file opening. Never a fake cursor claim.
    const btn = createChild(row, "button", { cls: "rdg-src" });
    btn.textContent = "Open source";
    btn.setAttribute("aria-label", `Open source ${p.sourcePath}`);
    const target: Parameters<NavigationPort["open"]>[0] =
      p.kind === "body" && p.line !== null
        ? {
          path: p.sourcePath,
          line: p.line,
          sourceRevision: p.sourceRevision,
          sourceLocator: { predicate: p.declaredPredicate, raw: p.rawLink },
        }
        : { path: p.sourcePath };
    btn.addEventListener("click", () => {
      void this.deps.navigation.open(target, target.line !== undefined ? "source" : "normal");
    });
  }

  /** §17: restrained native handoff through the ONE NavigationPort. */
  private renderNativeGraph(shell: HTMLElement, path: string): void {
    const section = this.section(shell, "Native Graph");
    const btn = createChild(section, "button", { cls: "rdg-native" });
    btn.textContent = "Open Native Local Graph";
    btn.setAttribute("aria-label", "Open Obsidian local graph for the selected object");
    btn.addEventListener("click", () => {
      const opener = this.deps.navigation.openLocalGraph;
      if (opener === undefined) {
        this.nativeGraphState = "UNAVAILABLE";
        this.render();
        return;
      }
      void opener.call(this.deps.navigation, path).then((result) => {
        this.nativeGraphState = result;
        this.render();
      });
    });
    if (this.nativeGraphState === "UNAVAILABLE") {
      createChild(section, "div", { cls: "rdg-state", text: "Native Local Graph unavailable." });
    }
  }

  private section(shell: HTMLElement, title: string): HTMLElement {
    const section = createChild(shell, "section", { cls: "rdg-section" });
    createChild(section, "h3", { cls: "rdg-section-title", text: title });
    return section;
  }
}
