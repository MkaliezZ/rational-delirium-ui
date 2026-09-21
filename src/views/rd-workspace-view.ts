/** RD Workspace — the investigation surface.
 *
 * Lineage: v1.6.1 shell → v1.6.3 journey → v1.7.4 collaboration →
 * v1.8 decisions → V2 Phase A real shell. The V1 three-plane
 * internal layout is decomposed: the navigation rail and the
 * inspection plane are now real Obsidian dock leaves
 * (rd-archive-nav / rd-inspector, sharing the session store), and
 * this view keeps the central reading surface only — a slim
 * archival masthead (exact-id input, Inspect, theme select), the
 * honest snapshot statusline, and the dossier / desk home /
 * collaboration host. Presentation only: every data flow, boundary
 * and workflow semantic is unchanged.
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
import type { GraphLoadResult } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../semantic-graph/knowledge-panel";
import { type RDWorkspaceStore } from "../architecture/workspace-state";
import { GraphSnapshotCoordinator } from "../architecture/graph-snapshot-coordinator";
import type { RDShellController } from "../architecture/rd-shell-controller";
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
  /** V2: shared collaboration browser (created once in
   * rd-view-setup, shared with the inspector dock). When absent the
   * view owns a private one (direct construction in tests). */
  readonly browser?: CollaborationBrowser;
  /** V2 Phase A: shell controller owning the body scope class and
   * the dock leaves while this view is open. */
  readonly shellController?: RDShellController;
  /** V2-01: the shared graph snapshot coordinator (created once in
   * rd-view-setup, shared with both dock leaves). When absent the
   * view owns a private one over the same store+source (direct
   * construction in tests). */
  readonly coordinator?: GraphSnapshotCoordinator;
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

export class RDWorkspaceShellView extends ItemView {
  private readonly deps: RDWorkspaceShellDeps;
  private unsubscribe: (() => void) | null = null;
  /** V2-01: the one snapshot authority. The view renders from the
   * PUBLISHED store snapshot; loads (cold-open dedup, explicit
   * re-read generations, stale-completion rejection) are owned by
   * the coordinator, never by this view. */
  private readonly coordinator: GraphSnapshotCoordinator;
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
  /** V2: the desk mode lives in the shared store; this local mirror
   * exists only so the view can detect entering collaboration mode
   * and drive the one explicit artifact re-read for that entry. */
  private lastMode: "investigation" | "collaboration" = "investigation";
  /** V2: the browser is a shared service; a directly constructed
   * view (tests) owns its private one and disposes it itself. */
  private readonly browser: CollaborationBrowser;
  private readonly ownsBrowser: boolean;
  private collabDetail: ArtifactDetail | null = null;

  constructor(leaf: WorkspaceLeaf, deps: RDWorkspaceShellDeps) {
    super(leaf);
    this.deps = deps;
    this.browser = deps.browser ?? new CollaborationBrowser();
    this.ownsBrowser = deps.browser === undefined;
    this.coordinator = deps.coordinator
      ?? new GraphSnapshotCoordinator(deps.store, deps.source);
  }

  getViewType(): string { return RD_WORKSPACE_VIEW_TYPE; }
  getDisplayText(): string { return "RD Workspace"; }
  getIcon(): string { return "library"; }

  async onOpen(): Promise<void> {
    emptyEl(this.contentEl);
    // V2: activating the workspace brings up the real shell scope
    // (body class + dock leaves), without stealing focus.
    this.deps.shellController?.attach(this);
    const shell = createChild(this.contentEl, "div", { cls: "rd-workspace-shell" });
    shell.setAttribute(RD_THEME_ATTR, "");
    shell.setAttribute("data-rd-tokens", RD_TOKEN_VERSION);
    this.buildMasthead(createChild(shell, "div", { cls: "rdws-masthead" }), shell);
    createChild(shell, "div", { cls: "rdws-body" });
    if (this.deps.themeController !== undefined) {
      applyRDTheme(shell, this.deps.themeController.getCurrent());
    }
    this.unsubscribe = this.deps.store.subscribe((state) => {
      // Entering collaboration mode drives exactly one explicit
      // artifact re-read for that entry (unchanged v1.7.4-A
      // behavior); all other state changes simply re-render.
      if (state.workspaceMode === "collaboration" && this.lastMode !== "collaboration"
          && this.deps.collaborationSource !== undefined) {
        void this.browser.refresh(this.deps.collaborationSource)
          .then(() => this.renderBody());
      }
      this.lastMode = state.workspaceMode;
      this.renderBody();
    });
    // Pane-width layout state (v1.3.5 §5: breakpoints follow the
    // allocated pane, not the window). Narrow keeps the dossier
    // typography compact; the docks are Obsidian sidebars now and
    // no longer fold inside this view.
    this.observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      shell.classList.toggle("rdws-narrow", width > 0 && width < 700);
    });
    this.observer.observe(shell);
    await this.coordinator.ensureLoaded();
    // Read-only collaboration summaries for the inspector dock.
    if (this.deps.collaborationSource !== undefined) {
      void this.browser.refresh(this.deps.collaborationSource)
        .then(() => this.renderBody());
    }
    this.renderBody();
  }

  async onClose(): Promise<void> {
    // V2: closing the workspace releases the shell scope and the
    // dock leaves with it.
    this.deps.shellController?.release();
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.ownsBrowser) this.browser.dispose();
    emptyEl(this.contentEl);
  }

  /** Slim archival masthead: theme selection and the exact-id
   * query. The archive identity head now lives in the left dock. */
  private buildMasthead(head: HTMLElement, shell: HTMLElement): void {
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
        this.deps.store.setWorkspaceMode("investigation");
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

  /** Explicit re-read of derived-state availability and snapshot
   * (V2-01): a FRESH generation through the shared coordinator, so
   * every shell surface switches to the new published snapshot
   * together. Stale older generations can never overwrite it. */
  async refreshAvailability(): Promise<void> {
    await this.coordinator.refresh();
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
   * inspector's review list). Explicit navigation, read-only.
   * Public: the shell controller routes dock-row clicks here. */
  openProposalInCollaboration(path: string): void {
    // Mark the mode change locally first so the store subscription
    // does not start a second artifact re-read for the same entry.
    this.lastMode = "collaboration";
    this.deps.store.setWorkspaceMode("collaboration");
    const source = this.deps.collaborationSource;
    if (source === undefined) return;
    void this.browser.refresh(source)
      .then(() => {
        this.browser.select("proposal", path);
        return this.refreshCollabDetail();
      })
      .then(() => this.renderBody());
  }

  /** Enter collaboration mode focused on one contribution (from the
   * inspector's recent-contributions list). Explicit, read-only.
   * Public: the shell controller routes dock-row clicks here. */
  openContributionInCollaboration(path: string): void {
    this.lastMode = "collaboration";
    this.deps.store.setWorkspaceMode("collaboration");
    const source = this.deps.collaborationSource;
    if (source === undefined) return;
    void this.browser.refresh(source)
      .then(() => {
        this.browser.select("contribution", path);
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

    // Center-only composition: the reading surface is the view.
    const center = createChild(body, "div", { cls: "rdws-center" });

    if (state.workspaceMode === "collaboration") {
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

    // V2-01: the center renders from the SAME published store
    // snapshot the dock leaves render from — no private copy.
    const snapshot = state.graphSnapshot;
    if (snapshot !== null && snapshot.state === "available"
        && state.selectedObjectId !== null) {
      this.renderReading(center, state.selectedObjectId, snapshot);
      this.ensureSourceDetail(state.selectedObjectId);
    } else {
      this.renderDeskHome(center, snapshot);
    }
  }

  /** CENTER — dominant reading surface. */
  private renderReading(
    center: HTMLElement,
    selected: string,
    load: Extract<GraphLoadResult, { readonly state: "available" }>,
  ): void {
    const graph = load.graph;
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
      load,
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
  private renderDeskHome(center: HTMLElement, snapshot: GraphLoadResult | null): void {
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
    if (snapshot === null || snapshot.state !== "available") {
      createChild(desk, "div", {
        cls: "rdws-desk-snapshot-note",
        text: this.deps.store.getState().snapshot.note +
          " Object inspection needs the derived snapshot; everything else in this " +
          "workspace works without it.",
      });
    }
  }
}
