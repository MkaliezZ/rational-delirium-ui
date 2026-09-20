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

export interface ArtifactSelection {
  /** Explicit artifact identity — the selection carries its kind;
   * detail resolution never guesses by trying kinds in order. */
  readonly kind: import("./artifact-reader").ArtifactKind;
  readonly path: string;
}

export interface CollaborationBrowserState {
  readonly model: CollaborationModel | null;
  readonly selectedArtifact: ArtifactSelection | null;
  readonly trail: readonly ArtifactSelection[];
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
    selectedArtifact: null,
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
    this.update({ model, selectedArtifact: null, trail: [] });
  }

  /** List → detail navigation (explicit kind + exact path). */
  select(kind: import("./artifact-reader").ArtifactKind, path: string): void {
    const selection: ArtifactSelection = { kind, path };
    this.update({
      selectedArtifact: selection,
      trail: [...this.state.trail, selection],
    });
  }

  /** Detail → back along the browsing trail. */
  back(): void {
    const trail = this.state.trail.slice(0, -1);
    this.update({
      trail,
      selectedArtifact: trail.length > 0 ? trail[trail.length - 1] : null,
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

const EMPTY_TEXTS: Readonly<Record<import("./artifact-reader").ArtifactKind, string>> = Object.freeze({
  contribution: "No contribution records found.",
  proposal: "No proposal records found.",
  "organization-proposal": "No organization proposal records found.",
});

/** v1.7.4-B: honest explainer under each empty state. */
const EMPTY_EXPLAINER =
  "Artifact records appear here when agents create contribution or proposal records.";

/** v1.7.4-B §1: what this area is — and is not. */
function renderIntro(parent: HTMLElement): void {
  const intro = createChild(parent, "div", { cls: "rdcol-intro" });
  createChild(intro, "div", {
    cls: "rdcol-intro-line",
    text:
      "Collaboration displays contributions and proposals created by external agents.",
  });
  createChild(intro, "div", {
    cls: "rdcol-intro-line",
    text:
      "These records describe proposed work. They do not validate knowledge, " +
      "approve changes, or modify the vault automatically.",
  });
  createChild(intro, "div", {
    cls: "rdcol-intro-principles",
    text: "proposal ≠ approval · contribution ≠ truth · visibility ≠ validation",
  });
  // §2: statuses are recorded human actions, not truth states.
  createChild(intro, "div", {
    cls: "rdcol-intro-status",
    text:
      "Statuses (pending / approved / rejected / applied) record human actions — " +
      "they are not system truth states: approved does not mean correct; " +
      "applied does not mean verified.",
  });
}

function metaLine(label: string, value: string | null): string {
  return `${label}: ${value ?? "not declared"}`;
}

function renderRow(
  list: HTMLElement,
  row: ArtifactRow,
  onSelect: (kind: import("./artifact-reader").ArtifactKind, path: string) => void,
): void {
  const item = createChild(list, "button", { cls: "rdcol-row" });
  item.setAttribute("aria-label", `inspect ${row.id ?? row.path}`);
  item.addEventListener("click", () => onSelect(row.kind, row.path));
  const head = createChild(item, "div", { cls: "rdcol-row-head" });
  head.textContent =
    `${row.id ?? "(no id declared)"} · ${row.authorAgent ?? "author not declared"}`
    + `${row.createdAt !== null ? ` · ${row.createdAt}` : ""}`;
  const summary = createChild(item, "div", { cls: "rdcol-row-summary" });
  summary.textContent = row.summary !== "" ? row.summary : "(no summary section)";
  const tail = createChild(item, "div", { cls: "rdcol-row-tail" });
  const parts: string[] = [];
  if (row.target !== null) parts.push(`target: ${row.target}`);
  if (row.status !== null) parts.push(`status: ${row.status} (recorded human action)`);
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
  emptyText: string,
  onSelect: (kind: import("./artifact-reader").ArtifactKind, path: string) => void,
): void {
  const details = createChild(parent, "details", { cls: "rdcol-section" });
  details.setAttribute("open", "open");
  createChild(details, "summary", { cls: "rdcol-section-title", text: `${title} (${rows.length})` });
  const body = createChild(details, "div", { cls: "rdcol-section-body" });
  if (dirState !== "available") {
    // Honest per-kind empty state; a missing artifact directory is
    // an absence of records, not an error and not a knowledge claim.
    createChild(body, "div", { cls: "rdcol-empty", text: emptyText });
    createChild(body, "div", { cls: "rdcol-empty-explain", text: EMPTY_EXPLAINER });
    createChild(body, "div", {
      cls: "rdcol-dir-state",
      text: `artifact directory state: ${dirState}`,
    });
    return;
  }
  if (rows.length === 0) {
    createChild(body, "div", { cls: "rdcol-empty", text: emptyText });
    createChild(body, "div", { cls: "rdcol-empty-explain", text: EMPTY_EXPLAINER });
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
    ["status", detail.metadata.status !== null
      ? `${detail.metadata.status} (recorded human action; not a truth state)`
      : null],
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
  // v1.7.4-B §3: per-kind reading order — Target/Metadata (the dl
  // above) → Proposed Change → Evidence → Reasoning → Human
  // Decision → History. Org proposals open with their observations
  // before the suggested change (observation precedes suggestion).
  const ORDERS: Readonly<Record<import("./artifact-reader").ArtifactKind,
    readonly (readonly [string, string])[]>> = Object.freeze({
    proposal: Object.freeze([
      ["Requested Change", "Requested / Proposed Change"],
      ["Evidence", "Evidence"],
      ["Reasoning", "Reasoning"],
      ["Expected Impact", "Expected Impact"],
      ["Status", "Status (recorded human action)"],
      ["History", "History (append-only)"],
    ] as const),
    contribution: Object.freeze([
      ["Contribution Summary", "Contribution Summary"],
      ["Change Description", "Change Description"],
      ["Evidence Used", "Evidence Used"],
      ["Human Decision", "Human Decision (recorded human action)"],
      ["History", "History (append-only)"],
    ] as const),
    "organization-proposal": Object.freeze([
      ["Observed Structure", "Observed Structure"],
      ["Proposed Organization Change", "Proposed Organization Change"],
      ["Evidence", "Evidence"],
      ["Reasoning", "Reasoning"],
      ["Expected Impact", "Expected Impact"],
      ["Human Decision", "Human Decision (recorded human action)"],
      ["History", "History (append-only)"],
    ] as const),
  });
  for (const [key, label] of ORDERS[detail.kind]) {
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
    onSelect: (kind: import("./artifact-reader").ArtifactKind, path: string) => void;
    onBack: () => void;
  },
): void {
  emptyEl(container);
  const root = createChild(container, "div", { cls: "rd-collaboration" });

  if (state.selectedArtifact !== null && detail !== null) {
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
  renderIntro(root);
  renderSection(root, "Agent Contributions", state.model.contributions,
    state.model.dirs.contribution, EMPTY_TEXTS.contribution, handlers.onSelect);
  renderSection(root, "Proposals", state.model.proposals,
    state.model.dirs.proposal, EMPTY_TEXTS.proposal, handlers.onSelect);
  renderSection(root, "Organization Proposals", state.model.organizationProposals,
    state.model.dirs["organization-proposal"], EMPTY_TEXTS["organization-proposal"], handlers.onSelect);
}

/** Resolve the detail for the current selection using its EXPLICIT
 * artifact identity (kind + exact path). No type guessing: the
 * selection states what it is; resolution reads exactly that. */
export async function resolveDetail(
  source: CollaborationArtifactSource,
  state: CollaborationBrowserState,
): Promise<ArtifactDetail | null> {
  const selection = state.selectedArtifact;
  if (selection === null || state.model === null) return null;
  return loadArtifactDetail(source, selection.kind, selection.path);
}
