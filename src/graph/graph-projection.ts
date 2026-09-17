/** v0.4.4 §5: pure Graph Intelligence projection.
 *
 * RDIndex → GraphProjection → RDGraphIntelligenceView.
 *
 * A semantic READER, not a renderer: every edge is an existing
 * normalized RDRelation; one relation.key → exactly one first-hop
 * edge; all assertion provenance stays inspectable; second hop shows
 * only ACTUAL relations touching the expanded neighbor (never a
 * transitive/composed edge). Ordinary backlinks are NOT semantic
 * relations and never appear here. Deterministic, read-only,
 * non-mutating. */

import type { RDIndex } from "../index/rd-index";
import type {
  IndexState,
  RDObject,
  RDObjectType,
  RDRelation,
  RDRelationAssertion,
  RDRelationEndpoint,
  RelationPredicate,
  ResolutionState,
} from "../model";

export type GraphPhase = "NO_OBJECT_SELECTED" | "NO_SUCH_OBJECT" | "READY";

export interface GraphIdentity {
  path: string;
  id: string | null;
  type: RDObjectType;
  title: string;
  status: string;
  lastVerified: string | null;
}

export interface GraphSelectorEntry {
  path: string;
  id: string | null;
  type: RDObjectType;
  title: string;
}

/** One assertion's provenance (§9). */
export interface GraphProvenance {
  /** The predicate AS DECLARED in Markdown (may differ from the
   * normalized logical predicate, e.g. supported_by → supports). */
  declaredPredicate: RelationPredicate;
  /** Path of the declaring file. */
  sourcePath: string;
  kind: "frontmatter" | "body";
  field: string | null;
  /** 1-based UI line when available. */
  line: number | null;
  /** The raw wikilink inner text as written. */
  rawLink: string;
  /** Index revision for stale-cursor validation (§10 source mode). */
  sourceRevision: number;
}

export interface GraphEdgeRow {
  key: string;
  predicate: string;
  /** Direction relative to the row's SUBJECT object. */
  direction: "outgoing" | "incoming";
  otherLabel: string;
  otherPath: string | null;
  otherType: RDObjectType | null;
  resolution: ResolutionState;
  /** ALL underlying assertions, deterministically ordered (§9). */
  provenance: GraphProvenance[];
}

export interface GraphProjectionData {
  indexState: IndexState;
  phase: GraphPhase;
  selectedObject: GraphIdentity | null;
  selectableObjects: GraphSelectorEntry[];
  /** §7: ONE HOP ONLY — one row per normalized relation touching
   * the selected object. */
  firstHop: GraphEdgeRow[];
}

/** Subject-relative edges of one object (shared by first and second
 * hop; direction is relative to `subjectPath`). */
function edgesFor(
  index: RDIndex,
  subjectPath: string,
  typeByPath: ReadonlyMap<string, RDObject>,
  excludeKeys: ReadonlySet<string>,
  /** §14: relations directly connecting subject to this root are
   * already displayed one hop up — never repeated in the branch. */
  rootPath: string | null,
): GraphEdgeRow[] {
  const rows: GraphEdgeRow[] = [];
  for (const relation of index.relations) {
    if (excludeKeys.has(relation.key)) continue;
    const subjectIsSource = relation.source.path === subjectPath;
    const subjectIsTarget = relation.target.path === subjectPath;
    if (!subjectIsSource && !subjectIsTarget) continue;
    const other: RDRelationEndpoint = subjectIsSource ? relation.target : relation.source;
    // Skip the already-displayed subject↔root direct relation.
    if (rootPath !== null && other.path === rootPath) continue;
    rows.push({
      key: relation.key,
      predicate: relation.predicate,
      direction: subjectIsSource ? "outgoing" : "incoming",
      otherLabel: other.objectId !== null && other.objectId.length > 0 ? other.objectId : other.raw,
      otherPath: other.path,
      otherType: other.path !== null ? typeByPath.get(other.path)?.type ?? null : null,
      resolution: other.resolution,
      provenance: provenanceOf(relation),
    });
  }
  rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return rows;
}

/** §9: ALL assertions with deterministic order — path, then
 * location/line, then declared predicate/raw. Provenance keeps the
 * DECLARED predicate and declaring path even when normalization
 * swapped the endpoints (§24). */
function provenanceOf(relation: RDRelation): GraphProvenance[] {
  return [...relation.assertions]
    .map((a: RDRelationAssertion) => ({
      declaredPredicate: a.predicate,
      sourcePath: a.location.path,
      kind: a.location.kind,
      field: a.location.field ?? null,
      line: a.location.line ?? null,
      rawLink: a.link.raw,
      sourceRevision: a.location.sourceRevision,
      sortLine: a.location.line ?? a.location.range?.start ?? 0,
    }))
    .sort((x, y) => {
      if (x.sourcePath !== y.sourcePath) return x.sourcePath < y.sourcePath ? -1 : 1;
      if (x.sortLine !== y.sortLine) return x.sortLine - y.sortLine;
      if (x.declaredPredicate !== y.declaredPredicate) return x.declaredPredicate < y.declaredPredicate ? -1 : 1;
      return x.rawLink < y.rawLink ? -1 : x.rawLink > y.rawLink ? 1 : 0;
    })
    .map(({ declaredPredicate, sourcePath, kind, field, line, rawLink, sourceRevision }) => ({
      declaredPredicate, sourcePath, kind, field, line, rawLink, sourceRevision,
    }));
}

export function buildGraphProjection(
  index: RDIndex,
  selectedPath: string | null,
): GraphProjectionData {
  const { objects } = index.snapshot();
  const typeByPath = new Map<string, RDObject>();
  for (const o of objects) typeByPath.set(o.path, o);

  const selectable = objects
    .filter((o) => o.type === "case" || o.type === "evidence" || o.type === "hypothesis" || o.type === "loop")
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((o) => ({ path: o.path, id: o.id, type: o.type, title: o.title }));

  const data: GraphProjectionData = {
    indexState: index.state,
    phase: "NO_OBJECT_SELECTED",
    selectedObject: null,
    selectableObjects: selectable,
    firstHop: [],
  };
  if (selectedPath === null) return data;

  const selected = typeByPath.get(selectedPath) ?? null;
  if (selected === null) {
    data.phase = "NO_SUCH_OBJECT";
    return data;
  }
  data.phase = "READY";
  data.selectedObject = {
    path: selected.path,
    id: selected.id,
    title: selected.title,
    type: selected.type,
    status: selected.status,
    lastVerified: selected.lastVerified,
  };
  data.firstHop = edgesFor(index, selected.path, typeByPath, new Set(), null);
  return data;
}

/** §12: actual semantic relations touching `neighborPath`, direction
 * relative to the NEIGHBOR, excluding any relation already displayed
 * between the root and this neighbor. Purely a branch view — the
 * caller passes the first-hop keys that connect root↔neighbor. */
export function buildSecondHop(
  index: RDIndex,
  neighborPath: string,
  rootPath: string,
): GraphEdgeRow[] {
  const { objects } = index.snapshot();
  const typeByPath = new Map<string, RDObject>();
  for (const o of objects) typeByPath.set(o.path, o);
  const excludeKeys = new Set<string>();
  for (const relation of index.relations) {
    const touchesRoot = relation.source.path === rootPath || relation.target.path === rootPath;
    const touchesNeighbor = relation.source.path === neighborPath || relation.target.path === neighborPath;
    if (touchesRoot && touchesNeighbor) excludeKeys.add(relation.key);
  }
  return edgesFor(index, neighborPath, typeByPath, excludeKeys, rootPath);
}
