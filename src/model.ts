/** Core internal model for the Rational Delirium read-only projection. */

export type RDObjectType = "case" | "evidence" | "hypothesis" | "loop";

export const RD_OBJECT_TYPES: readonly RDObjectType[] = [
  "case",
  "evidence",
  "hypothesis",
  "loop",
];

/** Predicates exactly as declared in note content. */
export type RelationPredicate =
  | "related"
  | "supports"
  | "supported_by"
  | "contradicts"
  | "contradicted_by"
  | "derived_from"
  | "repeats_in"
  | "observed_in";

/** Predicates after logical normalization. */
export type LogicalPredicate =
  | "related"
  | "supports"
  | "contradicts"
  | "derived_from"
  | "repeats_in"
  | "observed_in";

export const FRONTMATTER_RELATION_FIELDS: readonly RelationPredicate[] = [
  "related",
  "supports",
  "supported_by",
  "contradicts",
  "contradicted_by",
];

export const BODY_RELATION_PREDICATES: readonly RelationPredicate[] = [
  "derived_from",
  "repeats_in",
  "observed_in",
];

export type ResolutionState =
  | "RESOLVED"
  | "BROKEN"
  | "AMBIGUOUS"
  | "OUT_OF_SCOPE"
  | "PENDING";

export interface RDSourceLocation {
  path: string;
  kind: "frontmatter" | "body";
  field?: string;
  /** 0-based offsets into the ORIGINAL file content. */
  range?: { start: number; end: number };
  /** 1-based UI line; omitted when unreliable. */
  line?: number;
  sourceRevision: number;
}

export interface RDLink {
  /** The inner text of one [[...]] reference. */
  raw: string;
  /** Target without alias/heading/block decoration. */
  targetName: string;
  alias?: string;
  heading?: string;
  block?: string;
}

export interface RDRelationAssertion {
  predicate: RelationPredicate;
  location: RDSourceLocation;
  /** The link as written, for display and navigation. */
  link: RDLink;
}

export interface RDRelationEndpoint {
  /** Real RD identity; never inferred from raw text or a filename. */
  objectId: string | null;
  raw: string;
  path: string | null;
  resolution: ResolutionState;
}

export interface RDRelation {
  key: string;
  predicate: LogicalPredicate;
  source: RDRelationEndpoint;
  target: RDRelationEndpoint;
  /** Path of the declaring side (empty when endpoint unresolved). */
  sourcePath: string;
  /** Compatibility lookup: real source ID, or empty when unknown. */
  sourceId: string;
  /** Real object ID of the target; null when unresolved. */
  targetObjectId: string | null;
  /** Original wikilink target for display (e.g. "E"). */
  targetRaw: string;
  /** Convenience: target display/lookup ID (objectId ?? raw). */
  targetId: string;
  /** Path(s) the target resolves to; empty when not RESOLVED. */
  targetPaths: string[];
  targetResolution: ResolutionState;
  assertions: RDRelationAssertion[];
}

export interface RDDiagnostic {
  code: string;
  message: string;
  path: string;
}

export interface RDObject {
  path: string;
  id: string | null;
  type: RDObjectType;
  status: string;
  title: string;
  tags: string[];
  created: string | null;
  lastVerified: string | null;
  mtime: number;
  demo: boolean;
  proof: boolean;
  revision: number;
  diagnostics: RDDiagnostic[];
}

export type IndexState = "INDEXING" | "READY" | "ERROR";

export interface ProjectionRelationRow {
  predicate: LogicalPredicate;
  direction: "outgoing" | "incoming";
  targetId: string;
  targetTitle: string;
  /** RR-03: resolved target path for primary navigation. */
  targetPath: string | null;
  resolution: ResolutionState;
  sourcePath: string | null;
  sourceLine: number | null;
  /** RD-10: source revision for stale-cursor validation. */
  sourceRevision: number | null;
  /** Declaration identity for re-resolution against current source text. */
  sourceLocator?: { predicate: RelationPredicate; raw: string };
  /** RD-11: display alias for ordinary links ([[B|Alias]]). */
  alias: string | null;
  /** RD-11: subpath for ordinary links ([[B#Heading]] or [[B^block]]). */
  subpath: string | null;
  ordinary: boolean;
}

export interface ContextProjectionData {
  phase: "READY" | "NO_ACTIVE_OBJECT" | "LOADING" | "ERROR";
  indexState: IndexState;
  mode: "FOLLOW" | "PINNED";
  pinnedDeleted?: boolean;
  object: {
    id: string;
    type: RDObjectType | "archive";
    title: string;
    status: string;
    lastVerified: string | null;
    demo: boolean;
    proof: boolean;
  } | null;
  /** Minimal CASE sections; non-CASE keeps a flat relation list. */
  sections: Array<{
    key: string;
    title: string;
    rows: ProjectionRelationRow[];
  }>;
}
