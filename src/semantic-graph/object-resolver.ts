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
