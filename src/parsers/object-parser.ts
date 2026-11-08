import type {
  RDDiagnostic,
  RDObject,
  RDObjectType,
  RDRelationAssertion,
} from "../model";
import { KO_KINDS, LEGACY_OBJECT_TYPES } from "../model";
import { isCandidatePath } from "../scope";
import { koFrontmatterFromFields, type KoFrontmatter } from "../semantic-graph/ko-detail-reader";
import { parseFrontmatter, type FrontmatterRelationEntry } from "./frontmatter-parser";
import { extractBodyRelations } from "./body-relations";
import { frontmatterLocation } from "./source-location";

export interface ObjectParseResult {
  /** null when the file is not an RD object (no valid frontmatter.type). */
  object: RDObject | null;
  detail: KoFrontmatter | null;
  declaredId: string | null;
  diagnostics: RDDiagnostic[];
  assertions: RDRelationAssertion[];
  /** Ordinary [[wikilinks]] in the body, for linked/backlink display. */
  ordinaryLinks: string[];
}

const KNOWN_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "closed",
  "unverified",
  "verified",
  "open",
  "supported",
  "refuted",
  "broken",
  "archived",
  "invalid", "candidate", "reviewed", "superseded",
]);

function firstTitle(content: string): string {
  for (const line of content.split("\n")) {
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return "";
}

function toAssertion(
  entry: FrontmatterRelationEntry,
  path: string,
  revision: number,
): RDRelationAssertion {
  return {
    predicate: entry.predicate,
    link: entry.link,
    location: frontmatterLocation(path, entry.predicate, revision),
  };
}

/** Parse one candidate file into an RDObject + relation assertions.
 * Missing IDs are diagnostic-only; duplicates are handled by the
 * index (pathsById one-to-many). No IDs are ever generated or
 * repaired here. */
export function parseObject(
  path: string,
  content: string,
  mtime: number,
  revision: number,
): ObjectParseResult {
  const diagnostics: RDDiagnostic[] = [];
  const fm = parseFrontmatter(content, path);
  diagnostics.push(...fm.diagnostics);
  const modern = Object.prototype.hasOwnProperty.call(fm.fields, "object_id");
  const typeRaw = fm.fields[modern ? "kind" : "type"];
  const idRaw = fm.fields[modern ? "object_id" : "id"];
  const declaredId = modern && typeof idRaw === "string" && /^ko-\d{8}-\d+$/.test(idRaw) ? idRaw : null;
  const reject = (code?: string, message?: string): ObjectParseResult => {
    if (code) diagnostics.push({ code, message: message ?? code, path });
    return { object: null, detail: null, declaredId, diagnostics, assertions: [], ordinaryLinks: [] };
  };
  const allowed: readonly string[] = modern ? KO_KINDS : LEGACY_OBJECT_TYPES;
  if (typeof typeRaw !== "string" || !allowed.includes(typeRaw) || (!modern && !isCandidatePath(path))) {
    return reject(modern ? "invalid-ko-kind" : undefined, "KO requires a declared supported kind");
  }
  if (modern && (typeof idRaw !== "string" || !/^ko-\d{8}-\d+$/.test(idRaw))) {
    return reject("invalid-ko-id", "object_id must match ko-YYYYMMDD-number");
  }
  if (modern && fm.fields.id !== undefined && fm.fields.id !== idRaw) {
    return reject("conflicting-identity", "id and object_id disagree; no identity was selected");
  }
  if (modern && (typeof fm.fields.title !== "string" || !fm.fields.title.trim())) {
    return reject("missing-ko-title", "KO requires a non-empty title");
  }
  if (modern && !["candidate", "reviewed", "active", "superseded", "archived"].includes(String(fm.fields.status))) {
    return reject("invalid-ko-status", "KO requires a declared lifecycle status");
  }
  const type = typeRaw as RDObjectType;
  let id: string | null = null;
  if (typeof idRaw === "string" && idRaw.trim().length > 0) {
    id = idRaw.trim();
  } else {
    diagnostics.push({
      code: "missing-id",
      message: "RD object has no id; no id will be generated",
      path,
    });
  }
  const status = typeof fm.fields["status"] === "string" ? fm.fields["status"] : "";
  if (status && !KNOWN_STATUSES.has(status)) {
    diagnostics.push({
      code: "unknown-status",
      message: `unknown status: ${status}`,
      path,
    });
  }
  const tags: string[] = Array.isArray(fm.fields["tags"])
    ? fm.fields["tags"].filter((t): t is string => typeof t === "string")
    : [];
  const object: RDObject = {
    path,
    schema: modern ? "ko" : "legacy",
    id,
    type,
    status,
    title: modern ? fm.fields.title as string : firstTitle(content) || (id ?? path),
    tags,
    created: typeof fm.fields[modern ? "created_at" : "created"] === "string" ? fm.fields[modern ? "created_at" : "created"] as string : null,
    lastVerified:
      typeof fm.fields["last_verified"] === "string"
        ? fm.fields["last_verified"]
        : null,
    mtime,
    demo: tags.includes("rd/demo") || fm.fields["demo"] === true,
    proof: tags.some((t) => t.startsWith("rd/proof/")),
    revision,
    diagnostics,
  };
  const declared = koFrontmatterFromFields(fm.fields);
  const detail = declared === null ? null : { ...declared, title: object.title };
  const assertions = fm.relations.map((e) => toAssertion(e, path, revision));
  const body = extractBodyRelations(content, path, revision);
  diagnostics.push(...body.diagnostics);
  // RD-08 §23: file-level suppression from frontmatter OR body
  if (fm.fileSuppressed || body.fileSuppressed) {
    return { object, detail, declaredId: id, diagnostics, assertions: [], ordinaryLinks: body.ordinaryLinks };
  }
  assertions.push(...body.assertions);
  return { object, detail, declaredId: id, diagnostics, assertions, ordinaryLinks: body.ordinaryLinks };
}
