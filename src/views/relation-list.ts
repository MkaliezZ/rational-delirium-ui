import type { ContextProjectionData, ProjectionRelationRow } from "../model";
import { createChild, emptyEl } from "./dom-helpers";

export interface RelationCallbacks {
  onSelectRelation(row: ProjectionRelationRow): void;
  onSelectRelationTab(row: ProjectionRelationRow): void;
  onSelectRelationSplit(row: ProjectionRelationRow): void;
  onToggleSection(key: string, expanded: boolean): void;
}

/** Safe-DOM relation sections with disclosure semantics. RD-13:
 * section toggle notifies the controller session state. */
export function renderRelationList(
  container: HTMLElement,
  data: ContextProjectionData,
  expanded: ReadonlySet<string>,
  callbacks: RelationCallbacks,
): void {
  emptyEl(container);
  if (data.indexState === "INDEXING" && data.sections.length === 0) {
    createChild(container, "div", { cls: "rdc-state", text: "INDEXING" });
    container.setAttribute("aria-busy", "true");
    return;
  }
  container.removeAttribute("aria-busy");
  for (const section of data.sections) {
    const sectionEl = createChild(container, "div", { cls: "rdc-section" });
    const title = createChild(sectionEl, "button", {
      cls: "rdc-section-title",
      text: section.title,
    });
    const isOpen = expanded.has(section.key);
    title.setAttribute("aria-expanded", isOpen ? "true" : "false");
    const body = createChild(sectionEl, "div", { cls: "rdc-section-body" });
    body.style.display = isOpen ? "" : "none";
    title.addEventListener("click", () => {
      const nowOpen = body.style.display === "none";
      body.style.display = nowOpen ? "" : "none";
      title.setAttribute("aria-expanded", nowOpen ? "true" : "false");
      callbacks.onToggleSection(section.key, nowOpen);
    });
    for (const row of section.rows) {
      const btn = createChild(body, "button", { cls: "rdc-rel" });
      const label = createChild(btn, "span", { cls: "rdc-pred" });
      label.textContent =
        (row.direction === "incoming" ? "\u2190 " : "\u2192 ") +
        row.predicate +
        (row.ordinary
          ? " (" + (row.direction === "incoming" ? "backlink" : "linked") + ")"
          : "");
      createChild(btn, "span", { text: " " + row.targetTitle });
      const state = createChild(btn, "span", {
        cls: "rdc-badge",
        text: row.resolution,
      });
      state.setAttribute("data-state", row.resolution);
      // RD-10 §26: lightweight tab/split actions per relation row
      const actions = createChild(btn, "span", { cls: "rdc-actions" });
      const tabBtn = createChild(actions, "button", {
        cls: "rdc-act rdc-act-tab",
        text: "\u21D7",
      });
      tabBtn.setAttribute("aria-label", "Open in new tab");
      tabBtn.title = "Open in new tab";
      tabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onSelectRelationTab(row);
      });
      const splitBtn = createChild(actions, "button", {
        cls: "rdc-act rdc-act-split",
        text: "\u25A4",
      });
      splitBtn.setAttribute("aria-label", "Open in split");
      splitBtn.title = "Open in split";
      splitBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onSelectRelationSplit(row);
      });
      if (row.sourcePath !== null) {
        const src = createChild(actions, "button", {
          cls: "rdc-act rdc-src",
          text: row.sourceLine !== null ? "@" + row.sourceLine : "@",
        });
        src.setAttribute("aria-label",
          row.sourceLine !== null
            ? "Jump to source line " + row.sourceLine
            : "Open source file");
        src.title = "Open source";
        src.addEventListener("click", (e) => {
          e.stopPropagation();
          callbacks.onSelectRelation({ ...row, _sourceAction: true } as never);
        });
      }
      btn.addEventListener("click", () => callbacks.onSelectRelation(row));
    }
  }
}
