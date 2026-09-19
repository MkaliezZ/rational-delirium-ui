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

/** Render the panel model into a container using the plugin's
 * safe-DOM helpers (createChild/textContent only). Pure output. */
export function renderKnowledgePanel(container: HTMLElement, model: KnowledgePanelModel): void {
  emptyEl(container);
  const root = createChild(container, "div", { cls: "rd-knowledge-panel" });

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

  if (model.fields.length > 0) {
    const list = createChild(root, "dl", { cls: "rdkp-fields" });
    for (const f of model.fields) {
      createChild(list, "dt", { text: f.label });
      const dd = createChild(list, "dd", { text: f.text });
      dd.setAttribute("data-state", f.state);
    }
  }

  if (model.provenance !== null) {
    const prov = section(root, "rdkp-provenance", "Provenance (declared, four layers)", true);
    createChild(prov, "div", { cls: "rdkp-source-label", text: model.provenance.sourceLabel });
    for (const l of model.provenance.layers) {
      const line = createChild(prov, "div", { cls: "rdkp-layer" });
      line.setAttribute("data-state", l.state);
      line.textContent = `${l.label}: ${l.state} — ${l.text}`;
    }
    for (const c of model.provenance.consistency) {
      createChild(prov, "div", { cls: "rdkp-consistency", text: c });
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
        const line = createChild(lin, "div", { cls: "rdkp-lineage-row" });
        line.setAttribute("data-in-snapshot", String(e.inSnapshot));
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

  const rel = section(
    root,
    "rdkp-relations",
    `Relations (${model.relations.length} declared; snapshot counts only)`,
    true,
  );
  if (model.relations.length === 0) {
    createChild(rel, "div", { cls: "rdkp-empty", text: "no declared relations in this snapshot" });
  } else {
    for (const row of model.relations) {
      const line = createChild(rel, "div", { cls: "rdkp-relation-row" });
      line.setAttribute("data-direction", row.direction);
      line.setAttribute("data-endpoint", row.endpointState);
      line.textContent =
        `${row.edge.relation} [${row.direction}] ` +
        `source: ${row.edge.source} → target: ${row.edge.target}` +
        ` [endpoint: ${row.endpointState}]`;
    }
  }
  for (const u of model.unresolvedFrom) {
    createChild(rel, "div", {
      cls: "rdkp-unresolved",
      text: `unresolved declaration: ${u.relation} → ${u.target} (target not in snapshot)`,
    });
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
