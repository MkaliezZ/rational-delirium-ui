import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { ContextController } from "../context/context-controller";
import type { NavigationPort, NavigationTarget, OpenMode } from "../platform/navigation-core";
import { createChild, emptyEl } from "./dom-helpers";
import { renderObjectSummary } from "./object-summary";
import { renderRelationList } from "./relation-list";
import type { ProjectionRelationRow } from "../model";

export const RD_CONTEXT_VIEW_TYPE = "rd-context";

interface RelationRowWithMeta extends ProjectionRelationRow {
  _sourceAction?: boolean;
}

export class RDContextView extends ItemView {
  private readonly controller: ContextController;
  private readonly nav: NavigationPort;
  private unsubscribe: (() => void) | null = null;
  private container: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    controller: ContextController,
    navigation: NavigationPort,
  ) {
    super(leaf);
    this.controller = controller;
    this.nav = navigation;
  }

  getViewType(): string { return RD_CONTEXT_VIEW_TYPE; }
  getDisplayText(): string { return "RD Context"; }
  getIcon(): string { return "file-search"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    this.container = createChild(this.contentEl, "div", { cls: "rd-context" });
    this.unsubscribe = this.controller.subscribe(() => this.render());
    await this.controller.reattach();
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    emptyEl(this.contentEl);
  }

  render(): void {
    const shell = this.container;
    if (shell === null) return;
    const controller = this.controller;
    const projection = controller.projection;
    const session = controller.session;

    const focusKey = this.captureFocusKey(shell);
    emptyEl(shell);

    if (projection === null) {
      createChild(shell, "div", {
        cls: "rdc-state",
        text: controller.phase === "LOADING" ? "Loading…" : "No context",
      });
      return;
    }

    const summary = createChild(shell, "div", { cls: "rdc-summary" });
    const relations = createChild(shell, "div", { cls: "rdc-relations" });

    renderObjectSummary(summary, projection, session.mode === "PINNED", {
      onPinToggle: () => void this.togglePin(),
    });
    renderRelationList(relations, projection, session.expandedSections, {
      onSelectRelation: (row) => this.navigateRelation(row as RelationRowWithMeta, "normal"),
      onSelectRelationTab: (row) => this.navigateRelation(row as RelationRowWithMeta, "tab"),
      onSelectRelationSplit: (row) => this.navigateRelation(row as RelationRowWithMeta, "split"),
      onToggleSection: (key, expanded) => {
        controller.setSectionExpanded(key, expanded);
      },
    });

    this.restoreFocus(shell, focusKey);
  }

  private async togglePin(): Promise<void> {
    if (this.controller.session.mode === "PINNED") await this.controller.unpin();
    else await this.controller.pin();
  }

  /** RR-03 §29: primary action opens TARGET; source action opens the
   * declaration source. RD-10 §26: tab/split mode also supported. */
  private navigateRelation(
    row: RelationRowWithMeta,
    mode: "normal" | "tab" | "split" = "normal",
  ): void {
    if (row._sourceAction === true) {
      // Secondary: open declaration source
      if (row.sourcePath === null) return;
      const target: NavigationTarget = { path: row.sourcePath };
      if (row.sourceLine !== null && row.sourceLine !== undefined) {
        target.line = row.sourceLine;
        if (row.sourceRevision !== null) target.sourceRevision = row.sourceRevision;
        target.sourceLocator = row.sourceLocator;
      }
      this.nav.open(target, target.line !== undefined ? "source" : "normal");
      return;
    }
    // Primary: open relation TARGET (in normal/tab/split mode)
    if (row.resolution !== "RESOLVED") return;
    const targetPath = row.targetPath ?? null;
    if (targetPath === null || targetPath.length === 0) return;
    const target: NavigationTarget = { path: targetPath };
    if (row.subpath !== null) target.subpath = row.subpath;
    this.nav.open(target, mode);
  }

  private captureFocusKey(shell: HTMLElement): string | null {
    const active = document.activeElement;
    if (active === null || !(active instanceof HTMLElement)) return null;
    if (!shell.contains(active)) return null;
    if (active.classList.contains("rdc-pin")) return "pin";
    for (const toggle of shell.querySelectorAll<HTMLElement>(".rdc-section-title")) {
      if (toggle === active) return "section:" + (toggle.textContent ?? "");
    }
    for (const rel of shell.querySelectorAll<HTMLElement>(".rdc-rel")) {
      if (rel === active) return "rel:" + (rel.textContent ?? "").slice(0, 40);
    }
    return null;
  }

  private restoreFocus(shell: HTMLElement, key: string | null): void {
    if (key === null) return;
    if (key === "pin") {
      shell.querySelector<HTMLElement>(".rdc-pin")?.focus();
      return;
    }
    if (key.startsWith("section:")) {
      const title = key.slice("section:".length);
      for (const toggle of shell.querySelectorAll<HTMLElement>(".rdc-section-title")) {
        if (toggle.textContent === title) { toggle.focus(); return; }
      }
      shell.querySelector<HTMLElement>(".rdc-summary")?.setAttribute("tabindex", "-1");
      shell.querySelector<HTMLElement>(".rdc-summary")?.focus();
      return;
    }
    if (key.startsWith("rel:")) {
      const prefix = key.slice("rel:".length);
      for (const rel of shell.querySelectorAll<HTMLElement>(".rdc-rel")) {
        if ((rel.textContent ?? "").slice(0, 40) === prefix) { rel.focus(); return; }
      }
      shell.setAttribute("tabindex", "-1");
      shell.focus();
      return;
    }
    shell.setAttribute("tabindex", "-1");
    shell.focus();
  }
}
