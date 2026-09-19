/** v1.3.1 §2 — object resolver over a loaded snapshot.
 *
 * Lookup is EXACT object_id match inside the selected workspace's
 * snapshot — nothing else (v1.3.0 §7): no title matching, no
 * filename matching, no folder guessing, no latest-file fallback,
 * no fuzzy search, no cross-workspace lookup. The snapshot IS the
 * selected workspace's scope; there is nothing else to search.
 *
 * 0 matches → missing; >1 matches (only possible in a hand-edited
 * artifact — the v1.2.1 projector excludes duplicates upstream) →
 * ambiguous with every match. Never silently choose.
 */

import type { GraphDiagnostic, GraphEdge, GraphNode, SemanticGraphSnapshot } from "./graph-loader";

export type ResolveResult =
  | { readonly state: "available"; readonly node: GraphNode }
  | { readonly state: "missing" }
  | { readonly state: "ambiguous"; readonly matches: readonly GraphNode[] };

/** `workspace` is the explicitly selected logical workspace label.
 * It is carried for scope discipline and display; the resolver
 * never reaches outside the snapshot it was given. */
export function resolveObject(
  graph: SemanticGraphSnapshot,
  _workspace: string,
  objectId: string,
): ResolveResult {
  const matches = graph.nodes.filter((n) => n.object_id === objectId);
  if (matches.length === 1) return { state: "available", node: matches[0] };
  if (matches.length === 0) return { state: "missing" };
  return { state: "ambiguous", matches };
}

export interface RelationRow {
  readonly edge: GraphEdge;
  /** "outgoing": the resolved object declares this edge (it is the
   * source). "incoming": another object declares an edge to it. */
  readonly direction: "outgoing" | "incoming";
  /** Availability of the OTHER endpoint within this snapshot:
   * available, or missing (declared but absent — unresolved). */
  readonly endpointState: "available" | "missing";
  readonly otherId: string;
}

export interface RelationSummary {
  readonly rows: readonly RelationRow[];
  /** Declared edges whose endpoint is absent from the snapshot. */
  readonly unresolvedFrom: readonly GraphEdge[];
  readonly unresolvedTo: readonly GraphEdge[];
}

/** Snapshot relation selector (v1.3.0 §8): existing declared edges
 * only, exact endpoints, both directions, endpoint availability
 * per row. Derives nothing; creates no new relations; inverse
 * listings are readings of existing declarations. */
export function relationSummary(
  graph: SemanticGraphSnapshot,
  objectId: string,
): RelationSummary {
  const ids = new Set(graph.nodes.map((n) => n.object_id));
  const rows: RelationRow[] = [];
  for (const edge of graph.edges) {
    if (edge.source === objectId) {
      rows.push({
        edge,
        direction: "outgoing",
        otherId: edge.target,
        endpointState: ids.has(edge.target) ? "available" : "missing",
      });
    }
    if (edge.target === objectId) {
      rows.push({
        edge,
        direction: "incoming",
        otherId: edge.source,
        endpointState: ids.has(edge.source) ? "available" : "missing",
      });
    }
  }
  return {
    rows,
    unresolvedFrom: graph.unresolved.filter((e) => e.source === objectId),
    unresolvedTo: graph.unresolved.filter((e) => e.target === objectId),
  };
}

/** Diagnostics mentioning an object (duplicate_identity etc.),
 * plus all snapshot diagnostics for panel display. Unknown
 * diagnostic types stay inspectable — nothing disappears. */
export function diagnosticsFor(
  graph: SemanticGraphSnapshot,
  objectId: string | undefined,
): readonly GraphDiagnostic[] {
  if (objectId === undefined) return graph.diagnostics;
  return graph.diagnostics.filter((d) => d.object_id === objectId);
}

/** ----- v1.3.1 Phase 2: Lineage Explorer (declared data only) -----
 *
 * Previous/following entries come from DECLARED pointers and edges
 * only: the predecessor/successor fields, the object's own
 * revises/supersedes declarations, and INVERSE READINGS of other
 * objects' revises/supersedes declarations (an inverse listing is a
 * reading of an existing edge, never a new relation). Historical
 * objects stay visible; nothing is merged, hidden, or auto-selected;
 * multiple successors are all listed. Inconsistent declarations are
 * surfaced as notes, never reconciled. */

export interface LineageEntry {
  readonly objectId: string;
  /** Which declaration produced this entry. */
  readonly via: "predecessor field" | "successor field" | "revises declaration" | "supersedes declaration" | "revised-by reading" | "superseded-by reading";
  readonly inSnapshot: boolean;
  readonly status: string | null;
}

export interface LineageModel {
  readonly previous: readonly LineageEntry[];
  readonly following: readonly LineageEntry[];
  readonly notes: readonly string[];
}

function statusOf(graph: SemanticGraphSnapshot, objectId: string): {
  inSnapshot: boolean; status: string | null;
} {
  const node = graph.nodes.find((n) => n.object_id === objectId);
  return { inSnapshot: node !== undefined, status: node ? node.status : null };
}

function entry(
  graph: SemanticGraphSnapshot,
  objectId: string,
  via: LineageEntry["via"],
): LineageEntry {
  const s = statusOf(graph, objectId);
  return { objectId, via, inSnapshot: s.inSnapshot, status: s.status };
}

export function buildLineage(graph: SemanticGraphSnapshot, objectId: string): LineageModel {
  const node = graph.nodes.find((n) => n.object_id === objectId);
  const notes: string[] = [];
  const previous: LineageEntry[] = [];
  const following: LineageEntry[] = [];

  if (node !== undefined) {
    if (node.predecessor !== null) {
      previous.push(entry(graph, node.predecessor, "predecessor field"));
    }
    if (node.successor !== null) {
      following.push(entry(graph, node.successor, "successor field"));
    }
  }

  // The object's own revises/supersedes declarations point backward.
  for (const edge of graph.edges) {
    if (edge.source !== objectId) continue;
    if (edge.relation === "revises") {
      previous.push(entry(graph, edge.target, "revises declaration"));
    } else if (edge.relation === "supersedes") {
      previous.push(entry(graph, edge.target, "supersedes declaration"));
    }
  }
  // Inverse readings: other objects declaring revises/supersedes TO
  // this object point forward. Reading a declared edge, not creating.
  for (const edge of graph.edges) {
    if (edge.target !== objectId) continue;
    if (edge.relation === "revises") {
      following.push(entry(graph, edge.source, "revised-by reading"));
    } else if (edge.relation === "supersedes") {
      following.push(entry(graph, edge.source, "superseded-by reading"));
    }
  }

  // Consistency notes (displayed, never reconciled):
  const predIds = new Set(previous.map((e) => e.objectId));
  const succIds = new Set(following.map((e) => e.objectId));
  if (predIds.size > 1) {
    notes.push(`multiple predecessors declared (${[...predIds].join(", ")}); not reconciled`);
  }
  if (succIds.size > 1) {
    notes.push(
      `multiple following objects (${[...succIds].join(", ")}); all listed, none auto-selected`,
    );
  }
  if (node !== undefined && node.predecessor !== null &&
      !graph.edges.some((e) => e.source === objectId && e.target === node.predecessor &&
        (e.relation === "revises" || e.relation === "supersedes"))) {
    notes.push(
      `predecessor field (${node.predecessor}) has no matching revises/supersedes declaration`,
    );
  }

  return { previous, following, notes };
}
