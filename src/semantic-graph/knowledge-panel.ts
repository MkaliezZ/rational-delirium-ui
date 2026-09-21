/** v1.3.1 §3 — Knowledge Panel: pure view model + safe DOM
 * rendering for the read-only presentation adapter (v1.3.0 §2).
 * Phase 2 extends it with the Provenance Surface, Lineage
 * Explorer, Relation Inspector and Diagnostics Inspector.
 *
 * The panel displays DECLARED data with explicit availability
 * states. It is not a validity surface: projection eligibility is
 * not KO validity, no truth/confidence/ranking/correctness badge
 * exists here, and missing metadata is shown as missing — never
 * fabricated, never inferred. Provenance/origin come from the
 * resolved source note's DECLARED frontmatter only (current-source
 * read, labeled as such); disagreements with the snapshot are
 * displayed, never reconciled.
 */

import type { AvailabilityState, GraphLoadResult } from "./graph-loader";
import {
  diagnosticsFor,
  relationSummary,
  resolveObject,
  buildLineage,
  type LineageModel,
  type RelationRow,
} from "./object-resolver";
import type { KoDetailResult } from "./ko-detail-reader";
import { createChild, emptyEl } from "../views/dom-helpers";

export interface FieldDisplay {
  readonly label: string;
  readonly text: string;
  readonly state: AvailabilityState;
}

export type LayerState = "available" | "declared empty" | "not declared" | "not_loaded";

export interface LayerDisplay {
  readonly label: string;
  readonly state: LayerState;
  readonly text: string;
}

export interface ProvenanceSection {
  /** Overall: available (source resolved) / unavailable / missing /
   * ambiguous — of the SOURCE read, not of truth. */
  readonly overall: AvailabilityState;
  /** Freshness label per v1.3.0 §7: source reads are current-source
   * reads, not snapshot details. */
  readonly sourceLabel: string;
  readonly layers: readonly LayerDisplay[];
  readonly consistency: readonly string[];
}

export interface DiagnosticsGroups {
  readonly snapshot: readonly { type: string; object_id: string; paths: readonly string[] }[];
  readonly unresolvedReferences: readonly { relation: string; target: string }[];
  readonly sourceResolution: string | null;
}

export interface KnowledgePanelModel {
  readonly snapshotState: AvailabilityState;
  readonly snapshotMessage: string;
  readonly workspace: string;
  readonly queryObjectId: string | null;
  readonly resolveState: "available" | "missing" | "ambiguous" | null;
  readonly ambiguousMatches: readonly string[];
  readonly fields: readonly FieldDisplay[];
  readonly relations: readonly RelationRow[];
  readonly unresolvedFrom: readonly { relation: string; target: string }[];
  readonly diagnostics: readonly { type: string; object_id: string; paths: readonly string[] }[];
  // ----- Phase 2 sections -----
  readonly provenance: ProvenanceSection | null;
  readonly lineage: LineageModel | null;
  readonly diagnosticsGroups: DiagnosticsGroups | null;
}

const NOT_IN_SNAPSHOT = "not in v1.2.1 snapshot";

export interface PanelInput {
  readonly load: GraphLoadResult;
  readonly workspace: string;
  readonly objectId?: string;
  /** Phase 2: optional current-source read for the queried object. */
  readonly sourceDetail?: KoDetailResult;
}

function deepFreezePanel<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreezePanel(v);
    Object.freeze(value);
  }
  return value;
}

function emptyDiagnosticsCopy(
  graphDiagnostics: readonly { type: string; object_id: string; paths: readonly string[] }[],
) {
  return graphDiagnostics.map((d) => ({ ...d }));
}

/** Build the panel view model from a load result (+ optional exact
 * object_id query and source read). Pure; derives nothing beyond
 * declared data. The returned model is deeply frozen — the
 * presentation surface hands out read models only. */
export function buildKnowledgePanelModel(input: PanelInput): KnowledgePanelModel {
  return deepFreezePanel(buildPanelModelUnfrozen(input));
}

function buildPanelModelUnfrozen(input: PanelInput): KnowledgePanelModel {
  const base: KnowledgePanelModel = {
    snapshotState: "unavailable",
    snapshotMessage: "",
    workspace: input.workspace,
    queryObjectId: input.objectId ?? null,
    resolveState: null,
    ambiguousMatches: [],
    fields: [],
    relations: [],
    unresolvedFrom: [],
    diagnostics: [],
    provenance: null,
    lineage: null,
    diagnosticsGroups: null,
  };

  if (input.load.state === "missing") {
    return {
      ...base,
      snapshotMessage:
        "Graph artifact missing — no snapshot is loaded. This does not mean no knowledge exists.",
    };
  }
  if (input.load.state === "unavailable") {
    return {
      ...base,
      snapshotMessage: `Graph artifact unavailable (${input.load.reason}). No snapshot is loaded.`,
    };
  }
  if (input.load.state === "invalid") {
    return {
      ...base,
      snapshotState: "invalid",
      snapshotMessage: `Graph artifact invalid (${input.load.reason}). No snapshot is loaded.`,
    };
  }

  const graph = input.load.graph;
  if (input.objectId === undefined || input.objectId === "") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage:
        `${graph.nodes.length} objects, ${graph.edges.length} declared relations ` +
        `in this snapshot (freshness unverified).`,
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: null,
      },
    };
  }

  const resolved = resolveObject(graph, input.workspace, input.objectId);
  if (resolved.state === "missing") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded.",
      resolveState: "missing",
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: describeSourceState(input.sourceDetail),
      },
    };
  }
  if (resolved.state === "ambiguous") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded. Identity is ambiguous — no silent selection.",
      resolveState: "ambiguous",
      ambiguousMatches: resolved.matches.map((n) => n.object_id),
      diagnostics: emptyDiagnosticsCopy(graph.diagnostics),
      diagnosticsGroups: {
        snapshot: emptyDiagnosticsCopy(graph.diagnostics),
        unresolvedReferences: [],
        sourceResolution: describeSourceState(input.sourceDetail),
      },
    };
  }

  const node = resolved.node;
  const rel = relationSummary(graph, node.object_id);
  const source = input.sourceDetail;

  const originField: FieldDisplay = source !== undefined && source.state === "available"
    ? {
        label: "origin (workspace_context / created_from / creator_role)",
        text:
          `current source read: ${source.frontmatter.workspace_context ?? "workspace_context not declared"}; ` +
          `created_from: ${source.frontmatter.created_from?.join(", ") ?? "not declared"}; ` +
          `creator_role: ${source.frontmatter.creator_role ?? "not declared"}`,
        state: "available",
      }
    : {
        label: "origin (workspace_context / created_from / creator_role)",
        text: NOT_IN_SNAPSHOT,
        state: "not_loaded",
      };

  const provenanceSummaryField: FieldDisplay =
    source !== undefined && source.state === "available"
      ? {
          label: "provenance (observation / evidence / inference / conclusion)",
          text: "declared in source (see Provenance section)",
          state: "available",
        }
      : {
          label: "provenance (observation / evidence / inference / conclusion)",
          text: NOT_IN_SNAPSHOT,
          state: "not_loaded",
        };

  return {
    snapshotState: "available",
    snapshotMessage: "Snapshot loaded.",
    workspace: input.workspace,
    queryObjectId: node.object_id,
    resolveState: "available",
    ambiguousMatches: [],
    fields: [
      { label: "object_id", text: node.object_id, state: "available" },
      { label: "title", text: node.title, state: "available" },
      { label: "kind", text: `${node.kind} (declared classification)`, state: "available" },
      {
        label: "status",
        text: `${node.status} (declared lifecycle; not a validity badge)`,
        state: "available",
      },
      { label: "predecessor", text: node.predecessor ?? "none declared", state: "available" },
      { label: "successor", text: node.successor ?? "none declared", state: "available" },
      originField,
      provenanceSummaryField,
      {
        label: "validation",
        text: "schema/lifecycle validation not established by projection",
        state: "not_loaded",
      },
    ],
    relations: rel.rows,
    unresolvedFrom: rel.unresolvedFrom.map((e) => ({ relation: e.relation, target: e.target })),
    diagnostics: emptyDiagnosticsCopy(diagnosticsFor(graph, node.object_id)),
    provenance: buildProvenanceSection(node.kind, node.status, source),
    lineage: buildLineage(graph, node.object_id),
    diagnosticsGroups: {
      snapshot: emptyDiagnosticsCopy(graph.diagnostics),
      unresolvedReferences: rel.unresolvedFrom.map((e) => ({ relation: e.relation, target: e.target })),
      sourceResolution: describeSourceState(source),
    },
  };
}

function describeSourceState(source: KoDetailResult | undefined): string | null {
  if (source === undefined) return null;
  if (source.state === "available") return `source resolved: ${source.path} (current-source read)`;
  if (source.state === "missing") return "source note not found for this object_id (exact match only)";
  if (source.state === "ambiguous") {
    return `source identity ambiguous (${source.paths.length} declaring notes); no silent selection`;
  }
  return `source read unavailable: ${source.reason}`;
}

/** Provenance layers from DECLARED frontmatter only. Missing keys
 * stay explicit states; nothing is generated or inferred. */
function buildProvenanceSection(
  snapshotKind: string,
  snapshotStatus: string,
  source: KoDetailResult | undefined,
): ProvenanceSection | null {
  if (source === undefined) return null;
  if (source.state !== "available") {
    return {
      overall: source.state,
      sourceLabel: "provenance unavailable",
      layers: [
        { label: "Observation", state: "not_loaded", text: describeSourceState(source) ?? "" },
        { label: "Evidence", state: "not_loaded", text: "" },
        { label: "Inference", state: "not_loaded", text: "" },
        { label: "Conclusion", state: "not_loaded", text: "" },
      ],
      consistency: [],
    };
  }
  const p = source.frontmatter.provenance;
  const layer = (label: string, v: string | undefined): LayerDisplay =>
    v === undefined
      ? { label, state: "not declared", text: "not declared in source frontmatter" }
      : v === ""
        ? { label, state: "declared empty", text: "(declared empty)" }
        : { label, state: "available", text: v };
  const consistency: string[] = [];
  if (source.frontmatter.kind !== undefined && source.frontmatter.kind !== snapshotKind) {
    consistency.push(
      `source differs from projection: kind is ${source.frontmatter.kind} in source, ${snapshotKind} in snapshot`,
    );
  }
  if (source.frontmatter.status !== undefined && source.frontmatter.status !== snapshotStatus) {
    consistency.push(
      `source differs from projection: status is ${source.frontmatter.status} in source, ${snapshotStatus} in snapshot`,
    );
  }
  return {
    overall: "available",
    sourceLabel: `declared in source: ${source.path} (current-source read, freshness unverified)`,
    layers: p === undefined
      ? [
          layer("Observation", undefined),
          layer("Evidence", undefined),
          layer("Inference", undefined),
          layer("Conclusion", undefined),
        ]
      : [
          layer("Observation", p.observation),
          layer("Evidence", p.evidence),
          layer("Inference", p.inference),
          layer("Conclusion", p.conclusion),
        ],
    consistency,
  };
}

function section(
  parent: HTMLElement,
  cls: string,
  title: string,
  open: boolean,
): HTMLElement {
  const details = createChild(parent, "details", { cls });
  if (open) details.setAttribute("open", "open");
  createChild(details, "summary", { cls: "rdkp-section-title", text: title });
  return createChild(details, "div", { cls: "rdkp-section-body" });
}

export interface PanelRenderOptions {
  /** v1.6.3: optional object-navigation handler. When present,
   * lineage entries, relation endpoints and unresolved targets
   * render as buttons that call back with the object_id — the
   * investigation flow. Pure rendering; the callback fires only on
   * user action. */
  readonly onSelectObject?: (objectId: string) => void;
  /** Phase 2.2: the panel is composed inside the workspace dossier.
   * The dossier shell already carries workspace scope, snapshot
   * status and object identity, so the panel's own head, message
   * and query lines are omitted and the raw declared record folds
   * into a secondary closed block. Presentation composition only —
   * every value and availability state still renders. */
  readonly composedInDossier?: boolean;
}

/** Render the panel model into a container using the plugin's
 * safe-DOM helpers (createChild/textContent only). Pure output.
 *
 * Phase 2.2 composition order — the case-file reading rhythm:
 * provenance layers first (the declared reading content), then
 * declared relations (grouped by relation type), lineage, the raw
 * declared record (secondary, exact values), and diagnostics. The
 * order is presentation; every section keeps its frozen semantics
 * and availability states. */
export function renderKnowledgePanel(
  container: HTMLElement,
  model: KnowledgePanelModel,
  options?: PanelRenderOptions,
): void {
  emptyEl(container);
  const composed = options?.composedInDossier === true;
  const root = createChild(container, "div", {
    cls: composed ? "rd-knowledge-panel rdkp-composed" : "rd-knowledge-panel",
  });

  if (!composed) {
    const head = createChild(root, "div", { cls: "rdkp-head" });
    createChild(head, "span", { cls: "rdkp-scope", text: `workspace: ${model.workspace}` });
    createChild(head, "span", {
      cls: "rdkp-snapshot-state",
      text: `snapshot: ${model.snapshotState}`,
    });
    createChild(root, "div", { cls: "rdkp-message", text: model.snapshotMessage });
    if (model.queryObjectId !== null) {
      createChild(root, "div", { cls: "rdkp-query", text: `query: ${model.queryObjectId}` });
    }
  }

  if (model.resolveState === "missing") {
    createChild(root, "div", {
      cls: "rdkp-resolve-state",
      text: "object: NOT_FOUND (exact object_id match only)",
    });
  } else if (model.resolveState === "ambiguous") {
    createChild(root, "div", {
      cls: "rdkp-resolve-state",
      text: `object: AMBIGUOUS (${model.ambiguousMatches.length} matches: ` +
        `${model.ambiguousMatches.join(", ")}) — no silent selection`,
    });
  }

  if (model.provenance !== null) {
    const prov = section(root, "rdkp-provenance", "Provenance (declared, four layers)", true);
    createChild(prov, "div", { cls: "rdkp-source-label", text: model.provenance.sourceLabel });
    // Layer order is semantic (Observation → Evidence → Inference →
    // Conclusion) and is never reordered. Each layer keeps an
    // explicit state; declared text renders as an archival excerpt —
    // a declaration, never a verified finding.
    let layerIndex = 0;
    for (const l of model.provenance.layers) {
      layerIndex += 1;
      const line = createChild(prov, "div", { cls: "rdkp-layer" });
      line.setAttribute("data-state", l.state);
      line.setAttribute("data-layer", l.label.toLowerCase());
      const head = createChild(line, "div", { cls: "rdkp-layer-head" });
      createChild(head, "span", {
        cls: "rdkp-layer-marker",
        text: String(layerIndex).padStart(2, "0"),
      });
      createChild(head, "span", { cls: "rdkp-layer-label", text: l.label });
      createChild(head, "span", { cls: "rdkp-layer-state", text: l.state });
      createChild(line, "div", { cls: "rdkp-layer-text", text: l.text });
    }
    for (const c of model.provenance.consistency) {
      createChild(prov, "div", { cls: "rdkp-consistency", text: c });
    }
  }

  const rel = section(
    root,
    "rdkp-relations",
    `Relations (${model.relations.length} declared; snapshot counts only)`,
    true,
  );
  if (model.relations.length === 0 && model.unresolvedFrom.length === 0) {
    createChild(rel, "div", { cls: "rdkp-empty", text: "no declared relations in this snapshot" });
  } else {
    // Declared relations grouped by relation type — a group is an
    // archival index of declarations, never a claim about what the
    // relation proves. contradicts carries only the restrained
    // conflict accent; the declaration text stays exact.
    const groups = new Map<string, (typeof model.relations)[number][]>();
    for (const row of model.relations) {
      const list = groups.get(row.edge.relation) ?? [];
      list.push(row);
      groups.set(row.edge.relation, list);
    }
    for (const relationType of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
      const groupEl = createChild(rel, "div", { cls: "rdkp-rel-group" });
      groupEl.setAttribute("data-relation", relationType);
      createChild(groupEl, "div", { cls: "rdkp-rel-type-label", text: relationType });
      for (const row of groups.get(relationType) ?? []) {
        const navigate = options?.onSelectObject;
        const line = navigate === undefined
          ? createChild(groupEl, "div", { cls: "rdkp-relation-row" })
          : createChild(groupEl, "button", { cls: "rdkp-relation-row rdkp-nav" });
        line.setAttribute("data-direction", row.direction);
        line.setAttribute("data-endpoint", row.endpointState);
        line.setAttribute("data-relation", row.edge.relation);
        if (navigate !== undefined) {
          line.setAttribute("aria-label", `inspect ${row.otherId}`);
          line.addEventListener("click", () => navigate(row.otherId));
        }
        // Structure only — every element of the declaration stays
        // visible: relation type, direction, source, target, endpoint
        // availability. No weight, no confidence, no ranking.
        createChild(line, "span", { cls: "rdkp-rel-type", text: row.edge.relation });
        createChild(line, "span", { cls: "rdkp-rel-dir", text: `[${row.direction}]` });
        createChild(line, "span", {
          cls: "rdkp-rel-path",
          text: `source: ${row.edge.source} → target: ${row.edge.target}`,
        });
        createChild(line, "span", {
          cls: "rdkp-rel-endpoint",
          text: `[endpoint: ${row.endpointState}]`,
        });
      }
    }
    if (model.unresolvedFrom.length > 0) {
      const unresolvedGroup = createChild(rel, "div", { cls: "rdkp-rel-group rdkp-rel-unresolved" });
      createChild(unresolvedGroup, "div", {
        cls: "rdkp-rel-type-label",
        text: "unresolved declarations",
      });
      for (const u of model.unresolvedFrom) {
        const navigate = options?.onSelectObject;
        const line = navigate === undefined
          ? createChild(unresolvedGroup, "div", { cls: "rdkp-unresolved" })
          : createChild(unresolvedGroup, "button", { cls: "rdkp-unresolved rdkp-nav" });
        if (navigate !== undefined) {
          line.setAttribute("aria-label", `inspect ${u.target}`);
          line.addEventListener("click", () => navigate(u.target));
        }
        line.textContent =
          `unresolved declaration: ${u.relation} → ${u.target} (target not in snapshot)`;
      }
    }
  }

  if (model.lineage !== null) {
    const lin = section(root, "rdkp-lineage", "Lineage (declared evolution)", false);
    const renderSide = (title: string, entries: readonly {
      objectId: string; via: string; inSnapshot: boolean; status: string | null;
    }[]) => {
      createChild(lin, "div", { cls: "rdkp-lineage-title", text: title });
      if (entries.length === 0) {
        createChild(lin, "div", { cls: "rdkp-empty", text: "none declared" });
        return;
      }
      for (const e of entries) {
        const navigate = options?.onSelectObject;
        const line = navigate === undefined
          ? createChild(lin, "div", { cls: "rdkp-lineage-row" })
          : createChild(lin, "button", { cls: "rdkp-lineage-row rdkp-nav" });
        line.setAttribute("data-in-snapshot", String(e.inSnapshot));
        if (navigate !== undefined) {
          line.setAttribute("aria-label", `inspect ${e.objectId}`);
          line.addEventListener("click", () => navigate(e.objectId));
        }
        line.textContent =
          `${e.objectId}` +
          `${e.status !== null ? ` [${e.status}]` : ""}` +
          ` — via ${e.via}` +
          `${e.inSnapshot ? "" : " (not in snapshot)"}`;
      }
    };
    renderSide("Previous", model.lineage.previous);
    renderSide("Current", [{
      objectId: model.queryObjectId ?? "",
      via: "query",
      inSnapshot: true,
      status: null,
    }]);
    renderSide("Following", model.lineage.following);
    for (const n of model.lineage.notes) {
      createChild(lin, "div", { cls: "rdkp-lineage-note", text: `note: ${n}` });
    }
  }

  // Declared record — the exact raw field values, deliberately
  // secondary to the reading content above. Never removed, never
  // reordered semantically; folded closed by default in both
  // contexts so the dossier reads as content first.
  if (model.fields.length > 0) {
    const record = section(root, "rdkp-record", "Declared record (exact declared values)", false);
    const list = createChild(record, "dl", { cls: "rdkp-fields" });
    for (const f of model.fields) {
      createChild(list, "dt", { text: f.label });
      const dd = createChild(list, "dd", { text: f.text });
      dd.setAttribute("data-state", f.state);
    }
  }

  if (model.diagnosticsGroups !== null) {
    const diag = section(root, "rdkp-diagnostics", "Diagnostics (observations, not repair requests)", false);
    const g = model.diagnosticsGroups;
    createChild(diag, "div", {
      cls: "rdkp-diag-group",
      text: `snapshot diagnostics (${g.snapshot.length})`,
    });
    for (const d of g.snapshot) {
      const line = createChild(diag, "div", { cls: "rdkp-diagnostic" });
      line.setAttribute("data-type", d.type);
      line.textContent = `${d.type}: ${d.object_id} — ${d.paths.length} declaring path(s)`;
    }
    if (g.snapshot.length === 0) {
      createChild(diag, "div", { cls: "rdkp-empty", text: "none" });
    }
    if (g.unresolvedReferences.length > 0) {
      createChild(diag, "div", {
        cls: "rdkp-diag-group",
        text: `unresolved references for this object (${g.unresolvedReferences.length})`,
      });
      for (const u of g.unresolvedReferences) {
        createChild(diag, "div", {
          cls: "rdkp-diagnostic",
          text: `unresolved: ${u.relation} → ${u.target}`,
        });
      }
    }
    if (g.sourceResolution !== null) {
      createChild(diag, "div", { cls: "rdkp-diag-group", text: "source resolution" });
      createChild(diag, "div", { cls: "rdkp-diagnostic", text: g.sourceResolution });
    }
  }
}
