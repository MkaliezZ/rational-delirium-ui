import type {
  RDDiagnostic,
  RDObject,
  RDObjectType,
  RDRelationAssertion,
} from "../model";
import { RD_OBJECT_TYPES } from "../model";
import { parseFrontmatter, type FrontmatterRelationEntry } from "./frontmatter-parser";
import { extractBodyRelations } from "./body-relations";
import { frontmatterLocation } from "./source-location";

export interface ObjectParseResult {
  /** null when the file is not an RD object (no valid frontmatter.type). */
  object: RDObject | null;
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
  "invalid",
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
  const typeRaw = fm.fields["type"];
  if (typeof typeRaw !== "string" || !RD_OBJECT_TYPES.includes(typeRaw as RDObjectType)) {
    // Not an RD object (or invalid type): not indexed; diagnostics kept.
    return { object: null, assertions: [], ordinaryLinks: [] };
  }
  const type = typeRaw as RDObjectType;
  const idRaw = fm.fields["id"];
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
    id,
    type,
    status,
    title: firstTitle(content) || (id ?? path),
    tags,
    created: typeof fm.fields["created"] === "string" ? fm.fields["created"] : null,
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
  const assertions = fm.relations.map((e) => toAssertion(e, path, revision));
  const body = extractBodyRelations(content, path, revision);
  diagnostics.push(...body.diagnostics);
  // RD-08 §23: file-level suppression from frontmatter OR body
  if (fm.fileSuppressed || body.fileSuppressed) {
    return { object, assertions: [], ordinaryLinks: body.ordinaryLinks };
  }
  assertions.push(...body.assertions);
  return { object, assertions, ordinaryLinks: body.ordinaryLinks };
}
