/** v1.3.1 §3 — Knowledge Panel MVP: pure view model + safe DOM
 * rendering for the read-only presentation adapter (v1.3.0 §2).
 *
 * The panel displays DECLARED data with explicit availability
 * states. It is not a validity surface: projection eligibility is
 * not KO validity, no truth/confidence/ranking/correctness badge
 * exists here, and missing metadata is shown as missing — never
 * fabricated, never inferred. Origin/provenance fields are not in
 * the v1.2.1 snapshot; they display as not_loaded ("not in
 * snapshot") until a later phase reads source records.
 */

import type { AvailabilityState, GraphLoadResult } from "./graph-loader";
import { diagnosticsFor, relationSummary, resolveObject, type RelationRow } from "./object-resolver";
import { createChild, emptyEl } from "../views/dom-helpers";

export interface FieldDisplay {
  readonly label: string;
  readonly text: string;
  readonly state: AvailabilityState;
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
}

const NOT_IN_SNAPSHOT = "not in v1.2.1 snapshot";

export interface PanelInput {
  readonly load: GraphLoadResult;
  readonly workspace: string;
  readonly objectId?: string;
}

/** Build the panel view model from a load result (+ optional exact
 * object_id query). Pure; derives nothing beyond declared data. */
export function buildKnowledgePanelModel(input: PanelInput): KnowledgePanelModel {
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
  };

  if (input.load.state === "missing") {
    return {
      ...base,
      snapshotState: "unavailable",
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
      diagnostics: graph.diagnostics.map((d) => ({ ...d })),
    };
  }

  const resolved = resolveObject(graph, input.workspace, input.objectId);
  if (resolved.state === "missing") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded.",
      resolveState: "missing",
      diagnostics: graph.diagnostics.map((d) => ({ ...d })),
    };
  }
  if (resolved.state === "ambiguous") {
    return {
      ...base,
      snapshotState: "available",
      snapshotMessage: "Snapshot loaded. Identity is ambiguous — no silent selection.",
      resolveState: "ambiguous",
      ambiguousMatches: resolved.matches.map((n) => n.object_id),
      diagnostics: graph.diagnostics.map((d) => ({ ...d })),
    };
  }

  const node = resolved.node;
  const rel = relationSummary(graph, node.object_id);
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
      // Origin/provenance are deliberately absent from the v1.2.1
      // artifact; they display as not_loaded, never fabricated.
      { label: "origin (workspace_context / created_from / creator_role)", text: NOT_IN_SNAPSHOT, state: "not_loaded" },
      { label: "provenance (observation / evidence / inference / conclusion)", text: NOT_IN_SNAPSHOT, state: "not_loaded" },
      {
        label: "validation",
        text: "schema/lifecycle validation not established by projection",
        state: "not_loaded",
      },
    ],
    relations: rel.rows,
    unresolvedFrom: rel.unresolvedFrom.map((e) => ({ relation: e.relation, target: e.target })),
    diagnostics: diagnosticsFor(graph, node.object_id).map((d) => ({ ...d })),
  };
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

  const rel = createChild(root, "div", { cls: "rdkp-section" });
  createChild(rel, "div", {
    cls: "rdkp-section-title",
    text: `Relations (${model.relations.length} declared; snapshot counts only)`,
  });
  if (model.relations.length === 0) {
    createChild(rel, "div", { cls: "rdkp-empty", text: "no declared relations in this snapshot" });
  } else {
    for (const row of model.relations) {
      const line = createChild(rel, "div", { cls: "rdkp-relation-row" });
      line.setAttribute("data-direction", row.direction);
      line.setAttribute("data-endpoint", row.endpointState);
      line.textContent =
        `${row.direction === "outgoing" ? "→" : "←"} ${row.edge.relation} ` +
        `${row.direction === "outgoing" ? row.otherId : row.otherId}` +
        ` [endpoint: ${row.endpointState}]`;
    }
  }

  for (const u of model.unresolvedFrom) {
    createChild(root, "div", {
      cls: "rdkp-unresolved",
      text: `unresolved declaration: ${u.relation} → ${u.target} (target not in snapshot)`,
    });
  }

  const diag = createChild(root, "div", { cls: "rdkp-section" });
  createChild(diag, "div", {
    cls: "rdkp-section-title",
    text: `Diagnostics (${model.diagnostics.length})`,
  });
  if (model.diagnostics.length === 0) {
    createChild(diag, "div", { cls: "rdkp-empty", text: "none" });
  } else {
    for (const d of model.diagnostics) {
      const line = createChild(diag, "div", { cls: "rdkp-diagnostic" });
      line.setAttribute("data-type", d.type);
      line.textContent = `${d.type}: ${d.object_id} — ${d.paths.length} declaring path(s)`;
    }
  }
}
