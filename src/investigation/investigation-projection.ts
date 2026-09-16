/** v0.4.2 §14: pure Investigation Dashboard projection.
 *
 * RDIndex snapshot → InvestigationProjection → RDInvestigationView.
 *
 * Deterministic, read-only, testable, non-mutating. Consumes the ONE
 * shared RDIndex (objects + normalized logical relations). Never
 * parses Markdown, never rescans the Vault, never mutates index
 * objects, and never invents concepts that are not in the frozen
 * model (no scores, no priorities, no completion percentages). */

import type { RDIndex } from "../index/rd-index";
import type {
  IndexState,
  RDObject,
  RDObjectType,
  RDRelation,
  ResolutionState,
} from "../model";

/** §11: contradiction IS a logical predicate that already exists in
 * the normalized model. No new inference engine, no keyword match. */
export type AttentionKind = "BROKEN" | "AMBIGUOUS" | "CONTRADICTION";

export interface InvestigationCounts {
  case: number;
  evidence: number;
  hypothesis: number;
  loop: number;
  broken: number;
  ambiguous: number;
  contradiction: number;
}

export interface InvestigationCaseRow {
  path: string;
  id: string | null;
  title: string;
  status: string;
  mtime: number;
  /** Only information already represented by the frozen model. */
  relations: { resolved: number; unresolved: number; contradiction: number };
}

export interface AttentionItem {
  key: string;
  kind: AttentionKind;
  /** Real object ID when known; raw text otherwise (§9: raw
   * unresolved label stays visible, E != F). */
  sourceLabel: string;
  sourcePath: string | null;
  predicate: string;
  targetLabel: string;
  targetPath: string | null;
  targetResolution: ResolutionState;
}

export interface RecentObjectRow {
  path: string;
  type: RDObjectType;
  id: string | null;
  title: string;
  mtime: number;
}

export interface InvestigationProjectionData {
  indexState: IndexState;
  counts: InvestigationCounts;
  cases: InvestigationCaseRow[];
  attention: AttentionItem[];
  recent: RecentObjectRow[];
}

/** §12: Recent is a view over CURRENT filesystem metadata only. */
export const RECENT_LIMIT = 12;

function relationKind(relation: RDRelation): AttentionKind | null {
  if (relation.predicate === "contradicts") return "CONTRADICTION";
  const states = [relation.source.resolution, relation.target.resolution];
  if (states.includes("AMBIGUOUS")) return "AMBIGUOUS";
  if (states.includes("BROKEN")) return "BROKEN";
  return null;
}

function endpointLabel(
  objectId: string | null,
  raw: string,
): string {
  return objectId !== null && objectId.length > 0 ? objectId : raw;
}

function compareByMtimeDescPathAsc(
  a: RDObject,
  b: RDObject,
): number {
  if (b.mtime !== a.mtime) return b.mtime - a.mtime;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

export function buildInvestigationProjection(
  index: RDIndex,
): InvestigationProjectionData {
  const { objects } = index.snapshot();
  const relations = index.relations;

  const counts: InvestigationCounts = {
    case: 0,
    evidence: 0,
    hypothesis: 0,
    loop: 0,
    broken: 0,
    ambiguous: 0,
    contradiction: 0,
  };
  for (const object of objects) {
    // §7: ARCHIVE is NOT a fifth object type; archived is object
    // metadata, objects still count under their canonical type.
    counts[object.type] += 1;
  }
  for (const relation of relations) {
    if (relation.predicate === "contradicts") counts.contradiction += 1;
    const states = [relation.source.resolution, relation.target.resolution];
    if (states.includes("BROKEN")) counts.broken += 1;
    if (states.includes("AMBIGUOUS")) counts.ambiguous += 1;
  }

  const relationSummary = new Map<string, { resolved: number; unresolved: number; contradiction: number }>();
  const summaryOf = (path: string) => {
    let entry = relationSummary.get(path);
    if (entry === undefined) {
      entry = { resolved: 0, unresolved: 0, contradiction: 0 };
      relationSummary.set(path, entry);
    }
    return entry;
  };
  for (const relation of relations) {
    // Classify the LOGICAL relation as a whole (§9: not raw
    // provenance): contradiction first, then unresolved, else
    // resolved; attributed to every endpoint that actually exists.
    const bucket: "resolved" | "unresolved" | "contradiction" =
      relation.predicate === "contradicts" ? "contradiction"
        : relationKind(relation) !== null ? "unresolved"
          : "resolved";
    for (const endpoint of [relation.source, relation.target]) {
      if (endpoint.path !== null) summaryOf(endpoint.path)[bucket] += 1;
    }
  }

  const cases: InvestigationCaseRow[] = objects
    .filter((object) => object.type === "case")
    .sort(compareByMtimeDescPathAsc)
    .map((object) => ({
      path: object.path,
      id: object.id,
      title: object.title,
      status: object.status,
      mtime: object.mtime,
      relations: relationSummary.get(object.path)
        ?? { resolved: 0, unresolved: 0, contradiction: 0 },
    }));

  const attention: AttentionItem[] = relations
    .filter((relation) => relationKind(relation) !== null)
    .map((relation) => ({
      key: relation.key,
      kind: relationKind(relation) as AttentionKind,
      sourceLabel: endpointLabel(relation.source.objectId, relation.source.raw),
      sourcePath: relation.source.path,
      predicate: relation.predicate,
      targetLabel: endpointLabel(relation.target.objectId, relation.target.raw),
      targetPath: relation.target.path,
      targetResolution: relation.targetResolution,
    }))
    // Fully deterministic ordering independent of insertion order.
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const recent: RecentObjectRow[] = objects
    .sort(compareByMtimeDescPathAsc)
    .slice(0, RECENT_LIMIT)
    .map((object) => ({
      path: object.path,
      type: object.type,
      id: object.id,
      title: object.title,
      mtime: object.mtime,
    }));

  return {
    indexState: index.state,
    counts,
    cases,
    attention,
    recent,
  };
}
