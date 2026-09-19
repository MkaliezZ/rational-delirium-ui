/** v1.3.1 §1 — read-only loader for the v1.2.1 semantic graph
 * artifact (frozen contract: schema/nodes/edges/unresolved/
 * diagnostics).
 *
 * Boundaries (v1.3.0 §7):
 * - The artifact is the frozen contract: this loader parses and
 *   exposes typed, deeply frozen read models. It never modifies,
 *   regenerates, or "repairs" the artifact, never infers missing
 *   relations, and never reads Markdown bodies or wikilinks.
 * - Unknown schema tags are rejected without migration
 *   (unsupported-schema), not guessed forward.
 * - Missing / malformed / unsupported artifacts produce explicit
 *   result states; callers must never render an empty graph that
 *   suggests no knowledge exists.
 * - These availability states are PRESENTATION states, not KO
 *   lifecycle values.
 */

export const GRAPH_SCHEMA_TAG = "rd-semantic-graph-projection/1";

/** Vault-relative location of the derived artifact for the Phase 1
 * prototype. The projector writes it; the plugin only reads. */
export const DEFAULT_SEMANTIC_GRAPH_PATH = "semantic-graph/graph.json";

/** Presentation-only availability states (v1.3.0 §8). Not lifecycle. */
export type AvailabilityState =
  | "available"
  | "missing"
  | "ambiguous"
  | "unavailable"
  | "invalid"
  | "not_loaded";

export const GRAPH_RELATIONS: readonly string[] = [
  "supports",
  "contradicts",
  "derived_from",
  "depends_on",
  "revises",
  "supersedes",
];

export interface GraphNode {
  readonly object_id: string;
  readonly kind: string;
  readonly status: string;
  readonly title: string;
  readonly predecessor: string | null;
  readonly successor: string | null;
}

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
}

export interface GraphDiagnostic {
  readonly type: string;
  readonly object_id: string;
  readonly paths: readonly string[];
}

export interface SemanticGraphSnapshot {
  readonly schema: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly unresolved: readonly GraphEdge[];
  readonly diagnostics: readonly GraphDiagnostic[];
}

export type GraphLoadResult =
  | { readonly state: "available"; readonly graph: SemanticGraphSnapshot }
  | { readonly state: "missing" }
  | { readonly state: "invalid"; readonly reason: "malformed-json" | "unsupported-schema" | "invalid-shape" }
  | { readonly state: "unavailable"; readonly reason: string };

/** Minimal read port over wherever the artifact bytes live. The
 * Obsidian implementation (main.ts) reads a vault file; tests use
 * fakes. Read-only by construction: no write verb exists here. */
export interface GraphSource {
  read(): Promise<
    | { readonly state: "available"; readonly text: string }
    | { readonly state: "missing" }
    | { readonly state: "unavailable"; readonly reason: string }
  >;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function parseNode(raw: unknown): GraphNode | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const pred = r.predecessor;
  const succ = r.successor;
  if (
    !isString(r.object_id) || !isString(r.kind) || !isString(r.status) ||
    !isString(r.title) ||
    (pred !== null && !isString(pred)) || (succ !== null && !isString(succ))
  ) {
    return null;
  }
  return {
    object_id: r.object_id,
    kind: r.kind,
    status: r.status,
    title: r.title,
    predecessor: pred as string | null,
    successor: succ as string | null,
  };
}

function parseEdge(raw: unknown): GraphEdge | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isString(r.source) || !isString(r.target) || !isString(r.relation)) return null;
  if (!GRAPH_RELATIONS.includes(r.relation)) return null;
  return { source: r.source, target: r.target, relation: r.relation };
}

function parseDiagnostic(raw: unknown): GraphDiagnostic | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isString(r.type) || !isString(r.object_id) || !Array.isArray(r.paths)) return null;
  if (!r.paths.every(isString)) return null;
  return { type: r.type, object_id: r.object_id, paths: r.paths };
}

/** Parse artifact text into a frozen read model. Pure; never
 * mutates or retains the input string; never throws for bad
 * input — every failure is an explicit result state. */
export function parseGraphSnapshot(raw: string): GraphLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "invalid", reason: "malformed-json" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  const r = parsed as Record<string, unknown>;
  if (r.schema !== GRAPH_SCHEMA_TAG) {
    return { state: "invalid", reason: "unsupported-schema" };
  }
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges) ||
      !Array.isArray(r.unresolved) || !Array.isArray(r.diagnostics)) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  const nodes = r.nodes.map(parseNode);
  const edges = r.edges.map(parseEdge);
  const unresolved = r.unresolved.map(parseEdge);
  const diagnostics = r.diagnostics.map(parseDiagnostic);
  if (nodes.includes(null) || edges.includes(null) ||
      unresolved.includes(null) || diagnostics.includes(null)) {
    return { state: "invalid", reason: "invalid-shape" };
  }
  // Shape-valid duplicates are ACCEPTED here: the v1.2.1 projector
  // already excludes them upstream; if a hand-edited artifact still
  // contains duplicate identities, the object resolver reports
  // AMBIGUOUS rather than the loader silently choosing (§2).
  return {
    state: "available",
    graph: deepFreeze({
      schema: GRAPH_SCHEMA_TAG,
      nodes: nodes as GraphNode[],
      edges: edges as GraphEdge[],
      unresolved: unresolved as GraphEdge[],
      diagnostics: diagnostics as GraphDiagnostic[],
    }),
  };
}

/** Load through a GraphSource: missing/unavailable come from the
 * source; available text goes through parseGraphSnapshot. */
export async function loadGraphFromSource(source: GraphSource): Promise<GraphLoadResult> {
  const read = await source.read();
  if (read.state === "missing") return { state: "missing" };
  if (read.state === "unavailable") return { state: "unavailable", reason: read.reason };
  return parseGraphSnapshot(read.text);
}
