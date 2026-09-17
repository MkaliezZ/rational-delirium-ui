/** v0.4.3 §11: pure LOOP Workspace projection.
 *
 * RDIndex → LoopProjection → RDLoopView.
 *
 * Deterministic, read-only, non-mutating. Consumes the ONE shared
 * RDIndex (objects + normalized logical relations). Direction-safe:
 * a LOOP may appear as either endpoint of a relation; the projection
 * always surfaces the OTHER endpoint. No inference, no backlink/text
 * heuristics, no invented fields — only existing normalized
 * semantics. */

import type { RDIndex } from "../index/rd-index";
import type {
  IndexState,
  RDObject,
  RDObjectType,
  RDRelation,
  RDRelationEndpoint,
  ResolutionState,
} from "../model";

/** §7: the recurrence predicates of the frozen model. */
const RECURRENCE_PREDICATES: ReadonlySet<string> = new Set([
  "repeats_in",
  "observed_in",
]);

export type LoopPhase = "NO_LOOP_SELECTED" | "NO_SUCH_LOOP" | "READY";

export interface LoopIdentity {
  path: string;
  id: string | null;
  title: string;
  status: string;
  lastVerified: string | null;
}

export interface LoopRelationRow {
  key: string;
  predicate: string;
  direction: "outgoing" | "incoming";
  /** The non-LOOP endpoint: real object ID when resolved, raw text
   * otherwise (§14: raw unresolved labels stay visible, E != F). */
  otherLabel: string;
  otherPath: string | null;
  otherType: RDObjectType | null;
  resolution: ResolutionState;
}

export interface LoopSelectorEntry {
  path: string;
  id: string | null;
  title: string;
}

export interface LoopProjectionData {
  indexState: IndexState;
  phase: LoopPhase;
  selectedLoop: LoopIdentity | null;
  /** All indexed LOOP objects, for the restrained selector (§4). */
  loops: LoopSelectorEntry[];
  /** §7 primary section: repeats_in / observed_in relations. */
  recurrences: LoopRelationRow[];
  /** §8-§10: objects connected through ANY canonical relation. */
  evidence: LoopRelationRow[];
  hypotheses: LoopRelationRow[];
  cases: LoopRelationRow[];
}

function endpointLabel(objectId: string | null, raw: string): string {
  return objectId !== null && objectId.length > 0 ? objectId : raw;
}

/** The endpoint that is NOT the selected loop; direction is derived
 * from which side the loop occupies (§12). */
function otherSide(
  relation: RDRelation,
  loopPath: string,
): { other: RDRelationEndpoint; direction: "outgoing" | "incoming" } | null {
  const loopIsSource = relation.source.path === loopPath;
  const loopIsTarget = relation.target.path === loopPath;
  if (!loopIsSource && !loopIsTarget) return null;
  if (loopIsSource && relation.target.path === loopPath && relation.source.path === loopPath) {
    // degenerate self-relation: present the target side as "other"
    return { other: relation.target, direction: "outgoing" };
  }
  return loopIsSource
    ? { other: relation.target, direction: "outgoing" }
    : { other: relation.source, direction: "incoming" };
}

export function buildLoopProjection(
  index: RDIndex,
  selectedLoopPath: string | null,
): LoopProjectionData {
  const { objects } = index.snapshot();
  const loops: LoopSelectorEntry[] = objects
    .filter((o) => o.type === "loop")
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((o) => ({ path: o.path, id: o.id, title: o.title }));

  const data: LoopProjectionData = {
    indexState: index.state,
    phase: "NO_LOOP_SELECTED",
    selectedLoop: null,
    loops,
    recurrences: [],
    evidence: [],
    hypotheses: [],
    cases: [],
  };
  if (selectedLoopPath === null) return data;

  const selected = objects.find((o) => o.path === selectedLoopPath) ?? null;
  if (selected === null || selected.type !== "loop") {
    data.phase = "NO_SUCH_LOOP";
    return data;
  }
  data.phase = "READY";
  data.selectedLoop = {
    path: selected.path,
    id: selected.id,
    title: selected.title,
    status: selected.status,
    lastVerified: selected.lastVerified,
  };

  const typeByPath = new Map<string, RDObject>();
  for (const o of objects) typeByPath.set(o.path, o);

  const rows: LoopRelationRow[] = [];
  for (const relation of index.relations) {
    const side = otherSide(relation, selected.path);
    if (side === null) continue;
    const otherPath = side.other.path;
    rows.push({
      key: relation.key,
      predicate: relation.predicate,
      direction: side.direction,
      otherLabel: endpointLabel(side.other.objectId, side.other.raw),
      otherPath,
      otherType: otherPath !== null ? typeByPath.get(otherPath)?.type ?? null : null,
      resolution: side.other.resolution,
    });
  }
  // Deterministic order independent of relation insertion order.
  rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  data.recurrences = rows.filter((r) => RECURRENCE_PREDICATES.has(r.predicate));
  data.evidence = rows.filter((r) => r.otherType === "evidence");
  data.hypotheses = rows.filter((r) => r.otherType === "hypothesis");
  data.cases = rows.filter((r) => r.otherType === "case");
  return data;
}
