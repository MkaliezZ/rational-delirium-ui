/** v1.7.4-A — Collaboration surface: browser state + pure rendering
 * for the read-only collaboration section of the RD Workspace.
 *
 * Displays "what was proposed" — never "what should happen". No
 * approve/reject/apply controls exist here by design: decisions are
 * Human acts recorded in artifacts, not buttons in a view. Empty
 * states say "No contribution records found." — contribution
 * artifacts are NOT knowledge, and their absence says nothing about
 * knowledge. Browser state follows the workspace UI-state pattern
 * (session-only, frozen emissions, explicit back navigation).
 */

import type {
  ArtifactDetail,
  ArtifactRow,
  CollaborationArtifactSource,
  CollaborationModel,
} from "./artifact-reader";
import { buildCollaborationModel, loadArtifactDetail } from "./artifact-reader";
import { createChild, emptyEl } from "../views/dom-helpers";

export interface CollaborationBrowserState {
  readonly model: CollaborationModel | null;
  readonly selectedPath: string | null;
  readonly trail: readonly string[];
}

type Listener = (state: CollaborationBrowserState) => void;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

export class CollaborationBrowser {
  private state: CollaborationBrowserState = deepFreeze({
    model: null,
    selectedPath: null,
    trail: [],
  });
  private readonly listeners = new Set<Listener>();

  getState(): CollaborationBrowserState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Explicit re-read of available artifacts (user action only). */
  async refresh(source: CollaborationArtifactSource): Promise<void> {
    const model = await buildCollaborationModel(source);
    this.update({ model, selectedPath: null, trail: [] });
  }

  /** List → detail navigation (exact path). */
  select(path: string): void {
    this.update({
      selectedPath: path,
      trail: [...this.state.trail, path],
    });
  }

  /** Detail → back along the browsing trail. */
  back(): void {
    const trail = this.state.trail.slice(0, -1);
    this.update({
      trail,
      selectedPath: trail.length > 0 ? trail[trail.length - 1] : null,
    });
  }

  dispose(): void {
    this.listeners.clear();
  }

  private update(patch: Partial<CollaborationBrowserState>): void {
    this.state = deepFreeze({ ...this.state, ...patch });
    for (const listener of [...this.listeners]) listener(this.state);
  }
}

const EMPTY_TEXT = "No contribution records found.";

function metaLine(label: string, value: string | null): string {
  return `${label}: ${value ?? "not declared"}`;
}

function renderRow(
  list: HTMLElement,
  row: ArtifactRow,
  onSelect: (path: string) => void,
): void {
  const item = createChild(list, "button", { cls: "rdcol-row" });
  item.setAttribute("aria-label", `inspect ${row.id ?? row.path}`);
  item.addEventListener("click", () => onSelect(row.path));
  const head = createChild(item, "div", { cls: "rdcol-row-head" });
  head.textContent =
    `${row.id ?? "(no id declared)"} · ${row.authorAgent ?? "author not declared"}`
    + `${row.createdAt !== null ? ` · ${row.createdAt}` : ""}`;
  const summary = createChild(item, "div", { cls: "rdcol-row-summary" });
  summary.textContent = row.summary !== "" ? row.summary : "(no summary section)";
  const tail = createChild(item, "div", { cls: "rdcol-row-tail" });
  const parts: string[] = [];
  if (row.target !== null) parts.push(`target: ${row.target}`);
  if (row.status !== null) parts.push(`status: ${row.status} (descriptive)`);
  if (row.relatedProposalId !== null) parts.push(`proposal: ${row.relatedProposalId}`);
  if (row.humanDecision !== null) parts.push(`decision: ${row.humanDecision}`);
  if (row.malformed) parts.push("⚠ flagged: malformed");
  tail.textContent = parts.join(" · ");
}

function renderSection(
  parent: HTMLElement,
  title: string,
  rows: readonly ArtifactRow[],
  dirState: string,
  onSelect: (path: string) => void,
): void {
  const details = createChild(parent, "details", { cls: "rdcol-section" });
  details.setAttribute("open", "open");
  createChild(details, "summary", { cls: "rdcol-section-title", text: `${title} (${rows.length})` });
  const body = createChild(details, "div", { cls: "rdcol-section-body" });
  if (dirState !== "available") {
    const note = createChild(body, "div", { cls: "rdcol-empty", text: EMPTY_TEXT });
    void note;
    createChild(body, "div", {
      cls: "rdcol-dir-state",
      text: `artifact directory state: ${dirState}`,
    });
    return;
  }
  if (rows.length === 0) {
    createChild(body, "div", { cls: "rdcol-empty", text: EMPTY_TEXT });
    return;
  }
  for (const row of rows) renderRow(body, row, onSelect);
}

function renderDetail(parent: HTMLElement, detail: ArtifactDetail): void {
  const box = createChild(parent, "div", { cls: "rdcol-detail" });
  const head = createChild(box, "div", { cls: "rdcol-detail-head" });
  head.textContent =
    `${detail.metadata.id ?? "(no id declared)"} · ${detail.metadata.authorAgent ?? "author not declared"}`
    + ` · source: ${detail.path} (read-only inspection)`;
  const meta = createChild(box, "dl", { cls: "rdcol-meta" });
  const metaRows: readonly (readonly [string, string | null])[] = [
    ["created_at", detail.metadata.createdAt],
    ["target", detail.kind === "organization-proposal"
      ? detail.metadata.targetScope
      : detail.metadata.targetObjectId],
    ["target type", detail.metadata.targetType],
    ["related proposal", detail.metadata.relatedProposalId],
    ["status", detail.metadata.status !== null ? `${detail.metadata.status} (descriptive only)` : null],
    ["human decision", detail.metadata.humanDecision],
  ];
  for (const [label, value] of metaRows) {
    createChild(meta, "dt", { text: label });
    const dd = createChild(meta, "dd", { text: value ?? "not declared" });
    dd.setAttribute("data-state", value !== null ? "available" : "not-declared");
  }
  if (detail.malformed) {
    createChild(box, "div", {
      cls: "rdcol-flag",
      text: `⚠ flagged (shown, not hidden): ${detail.problems.join("; ")}`,
    });
  }
  const SECTION_LABELS: readonly [string, string][] = [
    ["Requested Change", "Requested / Proposed Change"],
    ["Contribution Summary", "Contribution Summary"],
    ["Observed Structure", "Observed Structure"],
    ["Proposed Organization Change", "Proposed Organization Change"],
    ["Evidence", "Evidence"],
    ["Evidence Used", "Evidence Used"],
    ["Change Description", "Change Description"],
    ["Reasoning", "Reasoning"],
    ["Expected Impact", "Expected Impact"],
    ["Status", "Status"],
    ["Human Decision", "Human Decision"],
    ["History", "History (append-only)"],
  ];
  for (const [key, label] of SECTION_LABELS) {
    const body = detail.sections[key];
    if (body === undefined) continue;
    const sec = createChild(box, "details", { cls: "rdcol-detail-section" });
    createChild(sec, "summary", { cls: "rdcol-section-title", text: label });
    createChild(sec, "div", { cls: "rdcol-detail-body", text: body === "" ? "(not declared)" : body });
  }
  createChild(box, "div", {
    cls: "rdcol-note",
    text:
      "This view displays what was proposed. Decisions are Human acts recorded in artifacts; " +
      "no approve, reject or apply action exists here.",
  });
}

/** Pure render of the collaboration surface (list mode or detail
 * mode) into a container. Safe DOM only; no mutation of anything. */
export function renderCollaboration(
  container: HTMLElement,
  state: CollaborationBrowserState,
  detail: ArtifactDetail | null,
  handlers: {
    onSelect: (path: string) => void;
    onBack: () => void;
  },
): void {
  emptyEl(container);
  const root = createChild(container, "div", { cls: "rd-collaboration" });

  if (state.selectedPath !== null && detail !== null) {
    const bar = createChild(root, "div", { cls: "rdcol-nav" });
    const back = createChild(bar, "button", { cls: "rdcol-back", text: "◀ Back" });
    back.setAttribute("aria-label", "Back to collaboration list");
    back.addEventListener("click", handlers.onBack);
    renderDetail(root, detail);
    return;
  }

  if (state.model === null) {
    createChild(root, "div", { cls: "rdcol-empty", text: "loading artifact directories…" });
    return;
  }
  renderSection(root, "Agent Contributions", state.model.contributions,
    state.model.dirs.contribution, handlers.onSelect);
  renderSection(root, "Proposals", state.model.proposals,
    state.model.dirs.proposal, handlers.onSelect);
  renderSection(root, "Organization Proposals", state.model.organizationProposals,
    state.model.dirs["organization-proposal"], handlers.onSelect);
}

/** Resolve the detail for the current selection (exact path). */
export async function resolveDetail(
  source: CollaborationArtifactSource,
  state: CollaborationBrowserState,
): Promise<ArtifactDetail | null> {
  if (state.selectedPath === null || state.model === null) return null;
  for (const kind of ["proposal", "contribution", "organization-proposal"] as const) {
    const detail = await loadArtifactDetail(source, kind, state.selectedPath);
    if (detail !== null) return detail;
  }
  return null;
}
