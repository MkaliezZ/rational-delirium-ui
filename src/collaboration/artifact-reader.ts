/** v1.7.4-A — Collaboration artifact reader: read-only loading and
 * parsing of the v1.7.2/v1.7.3-A markdown artifacts (proposals,
 * contribution records, organization proposals).
 *
 * Boundaries: this layer READS artifact files and shapes them into
 * frozen display models. It never writes, never approves, never
 * applies, never evaluates. Missing directories are explicit empty
 * states ("No contribution records found." — never "no knowledge
 * exists": contribution artifacts are NOT knowledge). Malformed
 * artifacts are flagged and shown, never silently dropped. Fields
 * absent from an artifact display as "not declared"; a display
 * model is not a validation verdict (Visibility ≠ Validation).
 */

export const PROPOSALS_DIR = ".proposals";
export const CONTRIBUTIONS_DIR = ".contributions";
export const ORGANIZATION_PROPOSALS_DIR = ".organization-proposals";

export interface ArtifactFile {
  readonly path: string;
  readonly text: string;
}

export type DirReadResult =
  | { readonly state: "available"; readonly files: readonly ArtifactFile[] }
  | { readonly state: "missing" }
  | { readonly state: "unavailable"; readonly reason: string };

/** Read-only port over wherever artifact files live. The Obsidian
 * implementation lists and reads a directory; tests use fakes. No
 * write verb exists on this surface. */
export interface CollaborationArtifactSource {
  readDir(dir: string): Promise<DirReadResult>;
}

export type ArtifactKind = "proposal" | "contribution" | "organization-proposal";

export interface ArtifactMetadata {
  readonly id: string | null;
  readonly authorAgent: string | null;
  readonly createdAt: string | null;
  readonly relatedProposalId: string | null;
  readonly relatedProposalDecision: string | null;
  readonly targetObjectId: string | null;
  readonly targetType: string | null;
  readonly targetScope: string | null;
  readonly status: string | null;
  readonly humanDecision: string | null;
}

export interface ArtifactDetail {
  readonly kind: ArtifactKind;
  readonly path: string;
  /** Original artifact text (needed for byte-accurate transforms;
   * display code must not alter it). */
  readonly rawText: string;
  readonly metadata: ArtifactMetadata;
  /** Section title → body text (verbatim, trimmed). */
  readonly sections: Readonly<Record<string, string>>;
  readonly malformed: boolean;
  readonly problems: readonly string[];
}

export interface ArtifactRow {
  readonly kind: ArtifactKind;
  readonly id: string | null;
  readonly path: string;
  readonly authorAgent: string | null;
  readonly createdAt: string | null;
  /** List summary: the artifact's own change/summary section,
   * first non-empty line. */
  readonly summary: string;
  readonly status: string | null;
  readonly target: string | null;
  readonly humanDecision: string | null;
  readonly relatedProposalId: string | null;
  readonly relatedProposalDecision: string | null;
  readonly malformed: boolean;
}

export interface CollaborationModel {
  readonly proposals: readonly ArtifactRow[];
  readonly contributions: readonly ArtifactRow[];
  readonly organizationProposals: readonly ArtifactRow[];
  /** Per-directory availability, for honest empty states. */
  readonly dirs: Readonly<Record<ArtifactKind, DirReadResult["state"]>>;
}

function section(text: string, title: string): string {
  const re = new RegExp(`^##\\s+${title}\\s*$`, "m");
  const m = re.exec(text);
  if (m === null) return "";
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const next = /^##\s+/m.exec(rest);
  const body = (next === null ? rest : rest.slice(0, next.index)).trim();
  return body;
}

function metaField(metadataBody: string, key: string): string | null {
  const m = new RegExp(`^-\\s*${key}\\s*:\\s*(.+)$`, "m").exec(metadataBody);
  if (m === null) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
  return v === "" ? null : v;
}

function firstLine(body: string): string {
  const line = body.split("\n").map((l) => l.trim()).find((l) => l !== "" && !l.startsWith("<!--"));
  return line ?? "";
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

const ID_KEYS: Readonly<Record<ArtifactKind, string>> = Object.freeze({
  proposal: "proposal_id",
  contribution: "contribution_id",
  "organization-proposal": "organization_proposal_id",
});

/** Parse one artifact file. Recognizes the v1.7.2/v1.7.3-A template
 * shapes; anything unrecognizable is malformed-but-visible. */
export function parseArtifact(kind: ArtifactKind, file: ArtifactFile): ArtifactDetail {
  const problems: string[] = [];
  const metadataBody = section(file.text, "Metadata");
  const id = metaField(metadataBody, ID_KEYS[kind]);
  if (id === null) problems.push(`no ${ID_KEYS[kind]} declared`);
  const authorAgent = metaField(metadataBody, "author_agent");
  if (authorAgent === null) problems.push("no author_agent declared");
  const titles = SECTION_TITLES[kind];
  const sections: Record<string, string> = {};
  for (const logical of titles) {
    const body = section(file.text, logical);
    if (body === "") problems.push(`missing section: ${logical}`);
    sections[logical] = body;
  }
  const status = kind === "proposal"
    ? metaField(section(file.text, "Status"), "status") ?? firstLine(section(file.text, "Status"))
    : null;
  const humanDecision = kind === "organization-proposal" || kind === "contribution"
    ? firstLine(section(file.text, "Human Decision"))
    : null;
  return deepFreeze({
    kind,
    path: file.path,
    rawText: file.text,
    metadata: deepFreeze({
      id,
      authorAgent,
      createdAt: metaField(metadataBody, "created_at"),
      relatedProposalId: metaField(metadataBody, "related_proposal_id"),
      relatedProposalDecision: metaField(metadataBody, "related_proposal_decision"),
      targetObjectId: metaField(metadataBody, "target_object_id"),
      targetType: metaField(metadataBody, "target_object_type"),
      targetScope: metaField(metadataBody, "target_scope"),
      status,
      humanDecision,
    }),
    sections: deepFreeze(sections),
    malformed: problems.length > 0,
    problems: deepFreeze(problems),
  });
}

const SECTION_TITLES: Readonly<Record<ArtifactKind, readonly string[]>> = Object.freeze({
  proposal: Object.freeze([
    "Metadata", "Requested Change", "Evidence", "Reasoning",
    "Expected Impact", "Status", "History",
  ]),
  contribution: Object.freeze([
    "Metadata", "Contribution Summary", "Evidence Used",
    "Change Description", "Human Decision", "History",
  ]),
  "organization-proposal": Object.freeze([
    "Metadata", "Observed Structure", "Proposed Organization Change",
    "Evidence", "Reasoning", "Expected Impact", "Human Decision", "History",
  ]),
});

function summaryOf(kind: ArtifactKind, detail: ArtifactDetail): string {
  if (kind === "proposal") return firstLine(detail.sections["Requested Change"] ?? "");
  if (kind === "contribution") return firstLine(detail.sections["Contribution Summary"] ?? "");
  return firstLine(detail.sections["Proposed Organization Change"] ?? "");
}

function rowOf(kind: ArtifactKind, detail: ArtifactDetail): ArtifactRow {
  return deepFreeze({
    kind,
    id: detail.metadata.id,
    path: detail.path,
    authorAgent: detail.metadata.authorAgent,
    createdAt: detail.metadata.createdAt,
    summary: summaryOf(kind, detail),
    status: detail.metadata.status,
    target: kind === "organization-proposal"
      ? detail.metadata.targetScope
      : detail.metadata.targetObjectId,
    humanDecision: detail.metadata.humanDecision,
    relatedProposalId: detail.metadata.relatedProposalId,
    relatedProposalDecision: detail.metadata.relatedProposalDecision,
    malformed: detail.malformed,
  });
}

function rowsFor(
  kind: ArtifactKind,
  result: DirReadResult,
): { rows: ArtifactRow[]; state: DirReadResult["state"] } {
  if (result.state !== "available") return { rows: [], state: result.state };
  const rows = result.files
    .map((f) => parseArtifact(kind, f))
    .map((d) => rowOf(kind, d))
    .sort((a, b) => (a.id ?? a.path).localeCompare(b.id ?? b.path));
  return { rows, state: "available" };
}

/** Build the collaboration model from three directory reads.
 * Deterministic (stable id/path order); read-only. */
export async function buildCollaborationModel(
  source: CollaborationArtifactSource,
): Promise<CollaborationModel> {
  const [proposals, contributions, orgProps] = await Promise.all([
    source.readDir(PROPOSALS_DIR),
    source.readDir(CONTRIBUTIONS_DIR),
    source.readDir(ORGANIZATION_PROPOSALS_DIR),
  ]);
  const p = rowsFor("proposal", proposals);
  const c = rowsFor("contribution", contributions);
  const o = rowsFor("organization-proposal", orgProps);
  return deepFreeze({
    proposals: p.rows,
    contributions: c.rows,
    organizationProposals: o.rows,
    dirs: deepFreeze({
      proposal: p.state,
      contribution: c.state,
      "organization-proposal": o.state,
    }),
  });
}

/** Resolve one artifact by path for the detail view (exact path
 * match — no fuzzy lookup). */
export async function loadArtifactDetail(
  source: CollaborationArtifactSource,
  kind: ArtifactKind,
  path: string,
): Promise<ArtifactDetail | null> {
  const dir = kind === "proposal" ? PROPOSALS_DIR
    : kind === "contribution" ? CONTRIBUTIONS_DIR
      : ORGANIZATION_PROPOSALS_DIR;
  const result = await source.readDir(dir);
  if (result.state !== "available") return null;
  const file = result.files.find((f) => f.path === path);
  if (file === undefined) return null;
  return parseArtifact(kind, file);
}
