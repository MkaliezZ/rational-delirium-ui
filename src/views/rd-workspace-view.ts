/** RD Workspace — the investigation surface.
 *
 * Lineage: v1.6.1 shell → v1.6.3 journey → v1.7.4 collaboration →
 * v1.8 decisions. This phase realizes the frozen visual system
 * (RD_VISUAL_DESIGN_SYSTEM_V1_0 §5, RD_V1_6_0 §5): a three-plane
 * investigation desk — navigation rail / dominant reading surface /
 * inspection plane — with the archival typography scale. Presentation
 * only: every data flow, boundary and workflow semantic is unchanged.
 *
 * Boundaries preserved: read-only except the one decision port;
 * explicit reads only; selection is a UI pointer, never lifecycle;
 * neutral id order, no ranking; collaboration summaries are kept
 * visually and semantically separate from knowledge state; a missing
 * semantic-graph snapshot is an honest unavailable state, never
 * "the vault has no knowledge".
 */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { loadGraphFromSource, type GraphLoadResult } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../semantic-graph/knowledge-panel";
import type { RDWorkspaceStore } from "../architecture/workspace-state";
import { RD_THEME_ATTR, RD_TOKEN_VERSION } from "../architecture/theme-tokens";
import { applyRDTheme, type RDThemeController } from "../themes/theme-runtime";
import type {
  ArtifactDetail,
  ArtifactKind,
  CollaborationArtifactSource,
} from "../collaboration/artifact-reader";
import type { ProposalDecision, ProposalDecisionPort } from "../collaboration/proposal-decision";
import {
  CollaborationBrowser,
  renderCollaboration,
  resolveDetail,
} from "../collaboration/collaboration-surface";
import { createChild, emptyEl } from "./dom-helpers";
import { RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "./knowledge-panel-view";
import { RD_GRAPH_VIEW_TYPE } from "./graph-intelligence-view";
import { RD_LOOP_VIEW_TYPE } from "./loop-view";
import { RD_INVESTIGATION_VIEW_TYPE } from "./investigation-view";

export const RD_WORKSPACE_VIEW_TYPE = "rd-workspace";

export interface RDWorkspaceShellDeps {
  readonly store: RDWorkspaceStore;
  readonly source: GraphSource;
  /** v1.6.3: exact-id source reader for the inspection panel. */
  readonly sourceReader?: KoSourceReader;
  /** Explicit activation of another RD view (registry path). */
  readonly openView: (viewType: string) => Promise<void>;
  /** v1.6.2: explicit, session-only theme selection. */
  readonly themeController?: RDThemeController;
  /** v1.7.4-A: read-only collaboration artifact source. */
  readonly collaborationSource?: CollaborationArtifactSource;
  /** v1.8: the one controlled write path (proposal decisions). */
  readonly decisionPort?: ProposalDecisionPort;
}

/** The six information-architecture areas (v1.6.0 §4) — rendered
 * on the desk home as the "where do I go" map. All live. */
const AREAS: readonly { key: string; question: string; state: string }[] = [
  { key: "Knowledge Panel", question: "What is this object?", state: "live in workspace" },
  { key: "Provenance Explorer", question: "Why do we believe this?", state: "live in workspace" },
  { key: "Lineage Explorer", question: "How did this change?", state: "live in workspace" },
  { key: "Relation Explorer", question: "What is it connected to?", state: "live in workspace" },
  {
    key: "Collaboration View",
    question: "Who worked on this and what happened?",
    state: "live in workspace",
  },
  {
    key: "Agent Contribution View",
    question: "What did Agents do here?",
    state: "live in workspace",
  },
];

/** Left-rail destinations (v1.6.0 §5 navigation; explicit only). */
const SURFACES: readonly { key: string; viewType?: string; mode?: "collaboration" }[] = [
  { key: "Collaboration", mode: "collaboration" },
  { key: "Knowledge Panel", viewType: RD_KNOWLEDGE_PANEL_VIEW_TYPE },
  { key: "Graph Intelligence", viewType: RD_GRAPH_VIEW_TYPE },
  { key: "Loop Workspace", viewType: RD_LOOP_VIEW_TYPE },
  { key: "Investigation", viewType: RD_INVESTIGATION_VIEW_TYPE },
];

const REVIEW_LIMIT = 5;
const CONTRIBUTION_LIMIT = 3;

export class RDWorkspaceShellView extends ItemView {
  private readonly deps: RDWorkspaceShellDeps;
  private unsubscribe: (() => void) | null = null;
  private graphLoad: GraphLoadResult = { state: "unavailable", reason: "not loaded yet" };
  /** Source-read ownership (review fix): a resolved detail belongs
   * to exactly one object id; reads carry a generation token so a
   * late completion from an older selection can never apply, and a
   * stable selection is read at most once (rerenders reuse the
   * completed detail instead of rereading). */
  private sourceDetail: KoDetailResult | undefined = undefined;
  private sourceDetailObjectId: string | null = null;
  /** Per-object in-flight ownership: at most one read per object id,
   * so re-selecting an object whose read is still pending never
   * starts a duplicate (review fix G/H). */
  private readonly sourceReadInFlight = new Set<string>();
  private sourceReadToken = 0;
  /** Latest read generation per object id — a completion applies
   * only if it is still its object's latest read. */
  private readonly sourceReadTokenByObject = new Map<string, number>();
  private observer: ResizeObserver | null = null;
  private mode: "investigation" | "collaboration" = "investigation";
  private readonly browser = new CollaborationBrowser();
  private collabDetail: ArtifactDetail | null = null;

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
    this.buildMasthead(createChild(shell, "div", { cls: "rdws-masthead" }), shell);
    createChild(shell, "div", { cls: "rdws-body" });
    if (this.deps.themeController !== undefined) {
      applyRDTheme(shell, this.deps.themeController.getCurrent());
    }
    this.unsubscribe = this.deps.store.subscribe(() => this.renderBody());
    // Pane-width layout state (v1.3.5 §5: breakpoints follow the
    // allocated pane, not the window). Supporting planes collapse
    // before the reading surface is ever squeezed.
    this.observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      shell.classList.toggle("rdws-narrow", width > 0 && width < 700);
      shell.classList.toggle("rdws-mid", width >= 700 && width < 1100);
    });
    this.observer.observe(shell);
    await this.refreshAvailability();
    // Read-only collaboration summaries for the inspection plane.
    if (this.deps.collaborationSource !== undefined) {
      void this.browser.refresh(this.deps.collaborationSource)
        .then(() => this.renderBody());
    }
    this.renderBody();
  }

  async onClose(): Promise<void> {
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.browser.dispose();
    emptyEl(this.contentEl);
  }

  /** Masthead: investigation title + workspace scope on the left;
   * theme and exact-id query on the right. */
  private buildMasthead(head: HTMLElement, shell: HTMLElement): void {
    const left = createChild(head, "div", { cls: "rdws-masthead-left" });
    createChild(left, "h1", {
      cls: "rdws-masthead-title",
      text: "Rational Delirium",
    });
    createChild(left, "div", {
      cls: "rdws-masthead-scope",
      text: `investigation workspace · ${this.deps.store.getState().workspaceLabel}`,
    });
    const right = createChild(head, "div", { cls: "rdws-masthead-right" });
    const controller = this.deps.themeController;
    if (controller !== undefined) {
      const select = createChild(right, "select", { cls: "rdws-theme-select" }) as HTMLSelectElement;
      select.setAttribute("aria-label", "RD theme (presentation only)");
      for (const theme of controller.list()) {
        const option = createChild(select, "option", { text: theme.label });
        (option as HTMLOptionElement).value = theme.id;
        if (theme.id === controller.getCurrent().id) {
          (option as HTMLOptionElement).selected = true;
        }
      }
      select.addEventListener("change", () => {
        try {
          const theme = controller.setTheme(select.value);
          applyRDTheme(shell, theme);
        } catch {
          // unknown id: keep current theme; selection is explicit-only
        }
      });
    }
    const input = createChild(right, "input", { cls: "rdws-object-input" }) as HTMLInputElement;
    input.type = "text";
    input.placeholder = "inspect exact object_id";
    input.setAttribute("aria-label", "Knowledge object id (exact match)");
    const go = () => {
      const id = input.value.trim();
      if (id !== "") {
        this.mode = "investigation";
        this.deps.store.setSelectedObject(id);
      }
    };
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") go();
    });
    createChild(right, "button", { cls: "rdws-button", text: "Inspect" })
      .addEventListener("click", go);
  }

  /** v1.8: explicit Human decision recording — the only write.
   * Records the decision, then re-reads artifacts and re-opens the
   * same proposal so the Human sees the recorded state. */
  private async recordProposalDecision(
    decision: ProposalDecision,
    path: string,
  ): Promise<void> {
    const port = this.deps.decisionPort;
    const source = this.deps.collaborationSource;
    if (port === undefined || source === undefined) return;
    const result = await port.recordDecision(path, decision);
    if (result.state === "written") {
      await this.browser.refresh(source);
      this.browser.select("proposal", path);
      await this.refreshCollabDetail();
    }
  }

  /** Load the detail for the current collaboration selection
   * (exact path), then re-render. Read-only. */
  private async refreshCollabDetail(): Promise<void> {
    if (this.deps.collaborationSource === undefined) return;
    this.collabDetail = await resolveDetail(
      this.deps.collaborationSource, this.browser.getState());
    this.renderBody();
  }

  /** Explicit re-read of derived-state availability and snapshot. */
  private async refreshAvailability(): Promise<void> {
    this.graphLoad = await loadGraphFromSource(this.deps.source);
    const load = this.graphLoad;
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

  /** Source detail usable ONLY for the object it was read for. A
   * detail that belongs to another object is never reused — B
   * never displays A's provenance (declared-data boundary). */
  private sourceDetailFor(objectId: string): KoDetailResult | undefined {
    return this.sourceDetailObjectId === objectId ? this.sourceDetail : undefined;
  }

  /** One source read per selection change. Rerenders of the same
   * selection reuse the completed detail; a read in flight for an
   * object is never duplicated for that object (selection
   * oscillation A→B→A does not create a second A read). A
   * completion applies only when BOTH hold: the read is still this
   * object's latest (a per-object generation token), and the
   * object is still the CURRENT selection — a stale completion for
   * a no-longer-selected object is discarded without touching the
   * cache and without triggering a render. No timers, no retries —
   * state ownership only. */
  private ensureSourceDetail(objectId: string): void {
    const reader = this.deps.sourceReader;
    if (reader === undefined) return;
    if (this.sourceDetailObjectId === objectId && this.sourceDetail !== undefined) return;
    if (this.sourceReadInFlight.has(objectId)) return;
    this.sourceReadInFlight.add(objectId);
    const token = ++this.sourceReadToken;
    this.sourceReadTokenByObject.set(objectId, token);
    void reader.resolve(objectId).then((detail) => {
      this.sourceReadInFlight.delete(objectId);
      if ((this.sourceReadTokenByObject.get(objectId) ?? 0) !== token) {
        return; // superseded by a newer read for the same object
      }
      if (this.deps.store.getState().selectedObjectId !== objectId) {
        return; // object no longer selected — never displace the cache
      }
      this.sourceDetail = detail;
      this.sourceDetailObjectId = objectId;
      this.renderBody();
    });
  }

  /** Enter collaboration mode focused on one proposal (from the
   * review-attention list). Explicit navigation, read-only. */
  private openProposalInCollaboration(path: string): void {
    this.mode = "collaboration";
    const source = this.deps.collaborationSource;
    if (source === undefined) return;
    void this.browser.refresh(source)
      .then(() => {
        this.browser.select("proposal", path);
        return this.refreshCollabDetail();
      })
      .then(() => this.renderBody());
  }

  private renderBody(): void {
    const body = this.contentEl.querySelector(".rdws-body");
    if (!(body instanceof HTMLElement)) return;
    emptyEl(body);
    const state = this.deps.store.getState();

    // Snapshot status line — an honest data state, not an error.
    const status = createChild(body, "div", { cls: "rdws-statusline" });
    status.setAttribute("data-state", state.snapshot.state);
    status.textContent = `snapshot: ${state.snapshot.state} — ${state.snapshot.note}`;
    if (state.selectedObjectId !== null) {
      createChild(status, "span", {
        cls: "rdws-statusline-trail",
        text: ` · inspecting ${state.selectedObjectId} (UI pointer; not a lifecycle state)`,
      });
    }

    const layout = createChild(body, "div", { cls: "rdws-planes" });
    this.renderNavRail(layout, state.selectedObjectId);
    const center = createChild(layout, "div", { cls: "rdws-plane-center" });

    if (this.mode === "collaboration") {
      const host = createChild(center, "div", { cls: "rdws-collaboration-host" });
      renderCollaboration(host, this.browser.getState(), this.collabDetail, {
        onSelect: (kind: ArtifactKind, path: string) => {
          this.browser.select(kind, path);
          void this.refreshCollabDetail();
        },
        onBack: () => {
          this.browser.back();
          void this.refreshCollabDetail();
        },
        onDecide: (decision: ProposalDecision, path: string) => {
          void this.recordProposalDecision(decision, path);
        },
      });
      return;
    }

    if (this.graphLoad.state === "available" && state.selectedObjectId !== null) {
      this.renderReading(center, state.selectedObjectId);
      this.ensureSourceDetail(state.selectedObjectId);
    } else {
      this.renderDeskHome(center);
    }
    this.renderInspectionPlane(layout, state.selectedObjectId);
  }

  /** LEFT — navigation rail: current selection, knowledge objects,
   * surface destinations. 200–240px; collapses under 700px. */
  private renderNavRail(layout: HTMLElement, selected: string | null): void {
    const rail = createChild(layout, "nav", { cls: "rdws-plane-left" });
    rail.setAttribute("aria-label", "RD workspace navigation");

    const current = createChild(rail, "div", { cls: "rdws-nav-group" });
    createChild(current, "div", { cls: "rdws-nav-label", text: "Investigation" });
    if (selected !== null) {
      const sel = createChild(current, "div", { cls: "rdws-nav-selection" });
      createChild(sel, "div", { cls: "rdws-nav-selection-id", text: selected });
      const back = createChild(current, "button", {
        cls: "rdws-button rdws-back", text: "◀ Back",
      });
      back.setAttribute("aria-label", "Back along investigation trail");
      back.addEventListener("click", () => this.deps.store.back());
    } else {
      createChild(current, "div", {
        cls: "rdws-nav-hint", text: "nothing selected — query an exact id or choose an object",
      });
    }

    const objects = createChild(rail, "div", { cls: "rdws-nav-group rdws-nav-objects" });
    createChild(objects, "div", { cls: "rdws-nav-label", text: "Knowledge Objects" });
    if (this.graphLoad.state !== "available") {
      createChild(objects, "div", {
        cls: "rdws-nav-empty",
        text:
          "snapshot unavailable — the vault still contains its knowledge; " +
          "regenerate the derived graph with the projector when needed",
      });
    } else {
      const nodes = [...this.graphLoad.graph.nodes]
        .sort((a, b) => a.object_id.localeCompare(b.object_id));
      if (nodes.length === 0) {
        createChild(objects, "div", { cls: "rdws-nav-empty", text: "no objects in this snapshot" });
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
        const heading = createChild(objects, "div", { cls: "rdws-nav-kind" });
        createChild(heading, "span", { cls: "rdws-nav-kind-name", text: kind });
        createChild(heading, "span", {
          cls: "rdws-nav-kind-count",
          text: `· ${group.length}`,
        });
        for (const node of group) {
          const row = createChild(objects, "button", { cls: "rdws-object-row" });
          row.setAttribute("aria-label", `inspect ${node.object_id}`);
          if (node.object_id === selected) row.setAttribute("aria-pressed", "true");
          createChild(row, "span", { cls: "rdws-object-row-id", text: node.object_id });
          createChild(row, "span", {
            cls: "rdws-object-row-meta",
            // kind lives in the group heading above — the row states
            // lifecycle only, no duplicated classification
            text: node.status,
          });
          createChild(row, "span", {
            cls: "rdws-object-row-title", text: node.title,
          });
          row.addEventListener("click", () => {
            this.mode = "investigation";
            this.deps.store.setSelectedObject(node.object_id);
          });
        }
      }
    }

    const surfaces = createChild(rail, "div", { cls: "rdws-nav-group" });
    createChild(surfaces, "div", { cls: "rdws-nav-label", text: "Surfaces" });
    for (const surface of SURFACES) {
      const row = createChild(surfaces, "button", { cls: "rdws-surface-row" });
      row.textContent = surface.key;
      if (surface.mode === "collaboration") {
        // v1.7.4-A toggle, now a first-class destination.
        row.classList.add("rdws-collab-toggle");
        row.setAttribute("aria-pressed", String(this.mode === "collaboration"));
        row.addEventListener("click", () => {
          this.mode = this.mode === "collaboration" ? "investigation" : "collaboration";
          if (this.mode === "collaboration" && this.deps.collaborationSource !== undefined) {
            void this.browser.refresh(this.deps.collaborationSource)
              .then(() => this.renderBody());
          }
          this.renderBody();
        });
      } else if (surface.viewType !== undefined) {
        const viewType = surface.viewType;
        row.addEventListener("click", () => { void this.deps.openView(viewType); });
      }
    }
  }

  /** CENTER — dominant reading surface. */
  private renderReading(center: HTMLElement, selected: string): void {
    if (this.graphLoad.state !== "available") return;
    const graph = this.graphLoad.graph;
    const node = graph.nodes.find((n) => n.object_id === selected);
    const host = createChild(center, "div", { cls: "rdws-reading" });

    // Dossier head: context eyebrow → serif display title → exact
    // identity line → descriptive strip. Every value is declared
    // data; the strip describes, it never scores. Presentation band:
    // the identity block sits left; a decorative archive mark sits
    // right (aria-hidden, purely ornamental, carries no meaning).
    const dossier = createChild(host, "header", { cls: "rdws-dossier" });
    const head = createChild(dossier, "div", { cls: "rdws-dossier-head" });
    createChild(head, "div", {
      cls: "rdws-dossier-eyebrow",
      text: node !== undefined
        ? `Knowledge Object · ${node.kind} (declared classification)`
        : "Knowledge Object · not in snapshot",
    });
    createChild(head, "h2", {
      cls: "rdws-ko-title",
      text: node !== undefined && node.title !== "" ? node.title : selected,
    });
    const idLine = createChild(head, "div", { cls: "rdws-ko-identity" });
    idLine.textContent = node !== undefined
      ? `${node.object_id} · ${node.status} (declared lifecycle; not a validity badge)`
      : `${selected} · not in snapshot (declared data unavailable here)`;
    const mark = createChild(dossier, "div", { cls: "rdws-dossier-mark" });
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "§";

    // Identity strip — horizontal, monospace, hairline-ruled. Real
    // fields only: kind, lifecycle, snapshot, source read, declared
    // relation counts, provenance layer availability.
    const strip = createChild(dossier, "dl", { cls: "rdws-identity-strip" });
    const stripItem = (label: string, text: string, state?: string) => {
      const item = createChild(strip, "div", { cls: "rdws-strip-item" });
      if (state !== undefined) item.setAttribute("data-state", state);
      createChild(item, "dt", { text: label });
      createChild(item, "dd", { text });
    };
    if (node !== undefined) {
      stripItem("kind", node.kind);
      stripItem("lifecycle", node.status);
      stripItem("snapshot", "derived projection · freshness unverified");
      const relationCount = graph.edges
        .filter((e) => e.source === selected || e.target === selected).length;
      const unresolvedCount = graph.unresolved
        .filter((e) => e.source === selected || e.target === selected).length;
      stripItem("relations", `${relationCount} declared${unresolvedCount > 0 ? ` · ${unresolvedCount} unresolved` : ""}`);
      const source = this.sourceDetailFor(selected);
      if (source !== undefined && source.state === "available") {
        stripItem("source", "resolved · current-source read", "available");
        const p = source.frontmatter.provenance;
        const withText = p === undefined ? 0
          : [p.observation, p.evidence, p.inference, p.conclusion]
              .filter((v) => v !== undefined && v !== "").length;
        stripItem("provenance", `${withText} of 4 layers carry text`);
      } else if (source !== undefined && source.state === "ambiguous") {
        stripItem("source", `ambiguous (${source.paths.length} notes)`, "missing");
      } else if (source !== undefined && source.state === "missing") {
        stripItem("source", "no declaring note found", "missing");
      } else {
        stripItem("source", "not read in this session", "not_loaded");
      }
    } else {
      stripItem("snapshot", "not in snapshot", "missing");
      stripItem("source", "declared data unavailable here", "missing");
    }

    const reading = createChild(host, "div", { cls: "rdws-reading-inner" });
    const model = buildKnowledgePanelModel({
      load: this.graphLoad,
      workspace: this.deps.store.getState().workspaceLabel,
      objectId: selected,
      sourceDetail: this.sourceDetailFor(selected),
    });
    renderKnowledgePanel(reading, model, {
      onSelectObject: (objectId) => {
        this.deps.store.setSelectedObject(objectId);
      },
      // Phase 2.2: the dossier shell carries scope/status/identity;
      // the panel composes the reading content beneath it.
      composedInDossier: true,
    });
    // Colophon: the honesty note on the left, the exact object id on
    // the right — an archival footer for the dossier page.
    const note = createChild(host, "div", { cls: "rdws-reading-note" });
    createChild(note, "span", {
      text:
        "declared data only — projection eligibility is not Knowledge Object validity; " +
        "no ranking, no recommendation",
    });
    createChild(note, "span", { cls: "rdws-reading-note-id", text: selected });
  }

  /** CENTER — the desk home when nothing is selected. */
  private renderDeskHome(center: HTMLElement): void {
    const desk = createChild(center, "div", { cls: "rdws-desk" });
    createChild(desk, "h2", {
      cls: "rdws-desk-title",
      text: "An investigation desk for your knowledge archive",
    });
    const lead = createChild(desk, "p", { cls: "rdws-desk-lead" });
    lead.textContent =
      "Inspect any Knowledge Object by its exact id — identity, provenance, lineage and " +
      "relations as declared. Agents contribute proposals and records; Humans decide; " +
      "nothing here certifies truth.";

    const map = createChild(desk, "div", { cls: "rdws-desk-map" });
    createChild(map, "div", { cls: "rdws-desk-map-title", text: "Where do I go?" });
    const list = createChild(map, "dl", { cls: "rdws-desk-areas" });
    for (const area of AREAS) {
      const row = createChild(list, "div", { cls: "rdws-area" });
      row.setAttribute("data-live", String(area.state === "live in workspace"));
      createChild(row, "dt", { text: area.key });
      createChild(row, "dd", { text: area.question });
    }
    if (this.graphLoad.state !== "available") {
      createChild(desk, "div", {
        cls: "rdws-desk-snapshot-note",
        text: this.deps.store.getState().snapshot.note +
          " Object inspection needs the derived snapshot; everything else in this " +
          "workspace works without it.",
      });
    }
  }

  /** RIGHT — inspection plane: selected object metadata, linked
   * objects, Human review attention, recent contributions,
   * diagnostics for the selection. 280–340px; collapses under
   * 1100px. Collaboration summaries live here, visually separate
   * from knowledge state. */
  private renderInspectionPlane(layout: HTMLElement, selected: string | null): void {
    const plane = createChild(layout, "aside", { cls: "rdws-plane-right" });
    plane.setAttribute("aria-label", "RD inspection");

    const model = this.browser.getState().model;

    // Inspector hierarchy (review fix): the PRIMARY zone carries the
    // selected Knowledge Object's own context; the workspace zone is
    // visually subordinate so review/contribution records never read
    // as peer knowledge properties.
    let objectZone: HTMLElement | null = null;
    if (this.graphLoad.state === "available" && selected !== null) {
      objectZone = createChild(plane, "div", { cls: "rdws-insp-zone" });
      objectZone.setAttribute("data-zone", "object");
      createChild(objectZone, "div", { cls: "rdws-insp-zone-label", text: "Selected object" });
    }

    // Object — declared identity of the current selection. Metadata
    // only; nothing here validates the object.
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const node = graph.nodes.find((n) => n.object_id === selected);
      const obj = createChild(objectZone!, "section", { cls: "rdws-insp-group" });
      createChild(obj, "div", { cls: "rdws-insp-label", text: "Object" });
      if (node === undefined) {
        createChild(obj, "div", {
          cls: "rdws-nav-empty", text: `${selected} — not in snapshot`,
        });
      } else {
        const meta = createChild(obj, "dl", { cls: "rdws-insp-meta" });
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
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const linked = createChild(objectZone!, "section", { cls: "rdws-insp-group" });
      createChild(linked, "div", { cls: "rdws-insp-label", text: "Linked objects" });
      const edges = graph.edges
        .filter((e) => e.source === selected || e.target === selected);
      const unresolved = graph.unresolved
        .filter((e) => e.source === selected || e.target === selected);
      if (edges.length === 0 && unresolved.length === 0) {
        createChild(linked, "div", {
          cls: "rdws-nav-empty", text: "no declared relations in this snapshot",
        });
      } else {
        for (const edge of edges) {
          const outgoing = edge.source === selected;
          const otherId = outgoing ? edge.target : edge.source;
          const row = createChild(linked, "button", { cls: "rdws-link-row" });
          row.setAttribute("data-relation", edge.relation);
          row.setAttribute("aria-label", `inspect ${otherId}`);
          createChild(row, "span", {
            cls: "rdws-link-type",
            text: outgoing ? `${edge.relation} →` : `← ${edge.relation}`,
          });
          createChild(row, "span", { cls: "rdws-link-id", text: otherId });
          row.addEventListener("click", () => {
            this.mode = "investigation";
            this.deps.store.setSelectedObject(otherId);
          });
        }
        for (const u of unresolved) {
          const outgoing = u.source === selected;
          const target = outgoing ? u.target : u.source;
          const row = createChild(linked, "div", { cls: "rdws-link-row rdws-link-unresolved" });
          row.setAttribute("data-relation", u.relation);
          createChild(row, "span", {
            cls: "rdws-link-type",
            text: outgoing ? `${u.relation} →` : `← ${u.relation}`,
          });
          createChild(row, "span", { cls: "rdws-link-id", text: target });
          createChild(row, "span", { cls: "rdws-link-state", text: "unresolved" });
        }
      }
    }

    // Workspace zone — recorded Human actions and Agent work on the
    // archive. Distinct from, and subordinate to, the selected
    // object's declared context above.
    const workspaceZone = createChild(plane, "div", { cls: "rdws-insp-zone" });
    workspaceZone.setAttribute("data-zone", "workspace");
    createChild(workspaceZone, "div", { cls: "rdws-insp-zone-label", text: "Workspace" });

    // Human review attention — pending proposals, existing data only.
    const review = createChild(workspaceZone, "section", { cls: "rdws-insp-group" });
    createChild(review, "div", { cls: "rdws-insp-label", text: "Workspace review" });
    const pending = model !== null
      ? model.proposals.filter((p) => p.status === "pending")
      : [];
    if (model === null) {
      createChild(review, "div", {
        cls: "rdws-nav-empty", text: "reading proposal records…",
      });
    } else if (pending.length === 0) {
      createChild(review, "div", {
        cls: "rdws-nav-empty",
        text: model.proposals.length > 0
          ? "No proposals awaiting decision — all recorded proposals are decided."
          : "No proposal records found.",
      });
    } else {
      createChild(review, "div", {
        cls: "rdws-insp-count",
        text: `${pending.length} awaiting your decision`,
      });
      for (const p of pending.slice(0, REVIEW_LIMIT)) {
        const row = createChild(review, "button", { cls: "rdws-review-row" });
        row.setAttribute("aria-label", `review ${p.id ?? p.path}`);
        createChild(row, "span", {
          cls: "rdws-review-id", text: p.id ?? "(no id declared)",
        });
        createChild(row, "span", {
          cls: "rdws-review-meta",
          text: p.target !== null ? `→ ${p.target}` : (p.authorAgent ?? "author not declared"),
        });
        row.addEventListener("click", () => this.openProposalInCollaboration(p.path));
      }
      if (pending.length > REVIEW_LIMIT) {
        createChild(review, "div", {
          cls: "rdws-insp-more", text: `+ ${pending.length - REVIEW_LIMIT} more in Collaboration`,
        });
      }
    }

    // Recent contributions — provenance of what agents did, not proof.
    const contribs = createChild(workspaceZone, "section", { cls: "rdws-insp-group" });
    createChild(contribs, "div", {
      cls: "rdws-insp-label", text: "Recent workspace contributions",
    });
    const records = model !== null
      ? [...model.contributions].sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, CONTRIBUTION_LIMIT)
      : [];
    if (records.length === 0) {
      createChild(contribs, "div", {
        cls: "rdws-nav-empty", text: "No contribution records found.",
      });
    } else {
      for (const c of records) {
        const row = createChild(contribs, "button", { cls: "rdws-contrib-row" });
        row.setAttribute("aria-label", `inspect ${c.id ?? c.path}`);
        createChild(row, "span", {
          cls: "rdws-review-id", text: c.id ?? "(no id declared)",
        });
        createChild(row, "span", {
          cls: "rdws-review-meta",
          text: [
            c.performedOperation,
            c.createdAt,
          ].filter((x): x is string => x !== null).join(" · "),
        });
        row.addEventListener("click", () => {
          this.mode = "collaboration";
          if (this.deps.collaborationSource === undefined) return;
          void this.browser.refresh(this.deps.collaborationSource)
            .then(() => {
              this.browser.select("contribution", c.path);
              return this.refreshCollabDetail();
            })
            .then(() => this.renderBody());
        });
      }
    }

    // Diagnostics for the current selection — declared data only.
    if (this.graphLoad.state === "available" && selected !== null) {
      const graph = this.graphLoad.graph;
      const unresolvedCount = graph.unresolved
        .filter((e) => e.source === selected || e.target === selected).length;
      const relationCount = graph.edges
        .filter((e) => e.source === selected || e.target === selected).length;
      const diagCount = graph.diagnostics
        .filter((d) => d.object_id === selected).length;
      const diag = createChild(plane, "section", { cls: "rdws-insp-group" });
      createChild(diag, "div", { cls: "rdws-insp-label", text: "Diagnostics" });
      const line = createChild(diag, "div", { cls: "rdws-diag-line" });
      line.textContent =
        `${relationCount} declared relation(s) · ${unresolvedCount} unresolved · ` +
        `${diagCount} diagnostic(s) — observations, not repair requests`;
    }
  }
}
