import {
  isAlias,
  isMap,
  isSeq,
  isScalar,
  parseDocument,
  type Document,
} from "yaml";
import type {
  RDDiagnostic,
  RDLink,
  RelationPredicate,
} from "../model";
import { FRONTMATTER_RELATION_FIELDS } from "../model";
import { validateInternalLinkTarget } from "./link-reference";

export interface FrontmatterRelationEntry {
  predicate: RelationPredicate;
  link: RDLink;
  rawValue: string;
}

export interface FrontmatterParseResult {
  fields: Record<string, unknown>;
  relations: FrontmatterRelationEntry[];
  /** RD-08 §23: when true, ALL semantic relations (frontmatter AND
   * body) from this file are suppressed (conservative boundary). */
  fileSuppressed: boolean;
  diagnostics: RDDiagnostic[];
}

const DELIMITER = /^---\r?$/;
const FM_WIKILINK = /^\[\[([^\[\]\n]+)\]\]$/;

/** RR-04 §24: uses the SHARED validateInternalLinkTarget from
 * link-reference.ts — no separate frontmatter-specific validator. */
export function parseFrontmatterWikilink(raw: string): RDLink | null {
  const m = FM_WIKILINK.exec(raw.trim());
  if (m === null) return null;
  if (!validateInternalLinkTarget(m[1])) return null;
  let target = m[1];
  let alias: string | undefined;
  const bar = target.indexOf("|");
  if (bar >= 0) {
    alias = target.slice(bar + 1).trim() || undefined;
    target = target.slice(0, bar);
  }
  let heading: string | undefined;
  let block: string | undefined;
  const hash = target.indexOf("#");
  const caret = target.indexOf("^");
  if (caret >= 0 && (hash < 0 || caret < hash)) {
    block = target.slice(caret + 1).trim() || undefined;
    target = target.slice(0, caret);
  } else if (hash >= 0) {
    heading = target.slice(hash + 1).trim() || undefined;
    target = target.slice(0, hash);
  }
  const targetName = target.trim();
  if (!targetName) return null;
  return { raw: m[1], targetName, alias, heading, block };
}

export function splitFrontmatter(
  content: string,
): { text: string; start: number; end: number } | null {
  let offset = 0;
  if (content.charCodeAt(0) === 0xfeff) offset = 1;
  const body = content.slice(offset);
  const firstLineEnd = body.indexOf("\n");
  if (firstLineEnd < 0) return null;
  if (!DELIMITER.test(body.slice(0, firstLineEnd))) return null;
  const rest = body.slice(firstLineEnd + 1);
  const lines = rest.split("\n");
  let consumed = firstLineEnd + 1;
  for (let i = 0; i < lines.length; i++) {
    if (DELIMITER.test(lines[i])) {
      const end = offset + consumed + lines[i].length + 1;
      const text = body.slice(0, consumed + lines[i].length + 1);
      return { text: (offset > 0 ? content[0] : "") + text, start: 0, end };
    }
    consumed += lines[i].length + 1;
  }
  return null;
}

/** RR-05 §25: detect merge key ONLY in mapping-key context. A
 * scalar VALUE of "<<" (e.g. label: "<<") is perfectly legal. */
function refuseConstructs(
  doc: Document.Parsed,
  diagnostics: RDDiagnostic[],
  path: string,
): void {
  const visit = (node: unknown, isMappingKey: boolean): void => {
    if (node === null || node === undefined) return;
    if (isAlias(node)) {
      diagnostics.push({
        code: "frontmatter-alias",
        message: "YAML aliases are not supported in RD frontmatter",
        path,
      });
      return;
    }
    const anyNode = node as { anchor?: unknown; tag?: unknown };
    if (anyNode.anchor) {
      diagnostics.push({
        code: "frontmatter-anchor",
        message: "YAML anchors are not supported in RD frontmatter",
        path,
      });
    }
    if (typeof anyNode.tag === "string" && anyNode.tag.startsWith("!")) {
      diagnostics.push({
        code: "frontmatter-tag",
        message: `custom YAML tag not supported: ${anyNode.tag}`,
        path,
      });
    }
    // RR-05: merge key detection ONLY when this scalar IS a mapping key
    if (isMappingKey && isScalar(node)) {
      const val = String((node as unknown as { value: unknown }).value);
      if (val === "<<") {
        diagnostics.push({
          code: "frontmatter-merge-key",
          message: "YAML merge key (<<) is not supported",
          path,
        });
      }
    }
    if (isMap(node)) {
      for (const pair of node.items) {
        visit(pair.key, true);
        visit(pair.value, false);
      }
    } else if (isSeq(node)) {
      for (const item of node.items) visit(item, false);
    }
  };
  visit(doc.contents, false);
}

export function parseFrontmatter(
  content: string,
  path: string,
): FrontmatterParseResult {
  const diagnostics: RDDiagnostic[] = [];
  const relations: FrontmatterRelationEntry[] = [];
  const block = splitFrontmatter(content);
  if (block === null) {
    return { fields: {}, relations, fileSuppressed: false, diagnostics };
  }
  let doc: Document.Parsed;
  try {
    doc = parseDocument(block.text, {
      strict: true,
      merge: false,
      schema: "core",
      logLevel: "silent",
    });
  } catch (err) {
    diagnostics.push({
      code: "frontmatter-invalid-yaml",
      message: `invalid YAML: ${(err as Error).message.split("\n")[0]}`,
      path,
    });
    return { fields: {}, relations, fileSuppressed: true, diagnostics };
  }
  if (doc.errors.length > 0 || doc.warnings.length > 0) {
    const first =
      doc.errors[0]?.message ?? doc.warnings[0]?.message ?? "unknown";
    diagnostics.push({
      code: "frontmatter-invalid-yaml",
      message: first.split("\n")[0],
      path,
    });
    return { fields: {}, relations, fileSuppressed: true, diagnostics };
  }
  refuseConstructs(doc, diagnostics, path);
  if (diagnostics.length > 0) {
    // §23: structural frontmatter errors → file-level suppression
    const fields: Record<string, unknown> = {};
    const root = doc.contents;
    if (isMap(root)) {
      for (const pair of root.items) {
        const keyNode = pair.key as { toString(): string } | null;
        const key = keyNode === null ? "" : String(keyNode);
        const value = pair.value
          ? (pair.value as unknown as { toJSON(): unknown }).toJSON()
          : null;
        fields[key] = value;
      }
    }
    return { fields, relations: [], fileSuppressed: true, diagnostics };
  }
  const fields: Record<string, unknown> = {};
  const root = doc.contents;
  if (isMap(root)) {
    for (const pair of root.items) {
      const keyNode = pair.key as { toString(): string } | null;
      const key = keyNode === null ? "" : String(keyNode);
      if (key in fields) {
        diagnostics.push({
          code: "frontmatter-duplicate-key",
          message: `duplicate key: ${key}`,
          path,
        });
        continue;
      }
      const value = pair.value
        ? (pair.value as unknown as { toJSON(): unknown }).toJSON()
        : null;
      fields[key] = value;
    }
  } else if (root !== null) {
    diagnostics.push({
      code: "frontmatter-not-a-map",
      message: "frontmatter must be a mapping",
      path,
    });
  }
  if (diagnostics.length > 0) {
    return { fields, relations: [], fileSuppressed: true, diagnostics };
  }
  // RD-08 §23: any relation-field structural error → file-level
  // semantic relation suppression (not per-field salvage)
  let anyRelationFieldError = false;
  for (const predicate of FRONTMATTER_RELATION_FIELDS) {
    if (!(predicate in fields)) continue;
    const value = fields[predicate];
    const items: unknown[] = Array.isArray(value) ? value : [value];
    const collected: FrontmatterRelationEntry[] = [];
    for (const item of items) {
      if (item === null || item === undefined) continue;
      if (typeof item !== "string") {
        anyRelationFieldError = true;
        diagnostics.push({
          code: "frontmatter-relation-type",
          message: `field ${predicate} must be "[[target]]" strings or lists thereof`,
          path,
        });
        continue;
      }
      const link = parseFrontmatterWikilink(item);
      if (link === null) {
        anyRelationFieldError = true;
        diagnostics.push({
          code: "frontmatter-relation-type",
          message: `field ${predicate} value is not a wikilink: ${item}`,
          path,
        });
        continue;
      }
      collected.push({ predicate, link, rawValue: item });
    }
    if (!anyRelationFieldError) relations.push(...collected);
  }
  return {
    fields,
    relations: anyRelationFieldError ? [] : relations,
    fileSuppressed: anyRelationFieldError,
    diagnostics,
  };
}
