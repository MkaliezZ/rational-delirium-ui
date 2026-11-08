import { parseYamlFields } from "../parsers/frontmatter-parser";
import { LEGACY_OBJECT_TYPES } from "../model";
/** v1.3.1 Phase 2 — KO detail reader: read-only resolution of a
 * Knowledge Object's DECLARED frontmatter (v1.3.0 §8 "KO detail
 * reader" contract).
 *
 * Boundaries:
 * - Frontmatter ONLY. The note body is never parsed — provenance is
 *   never extracted from Markdown prose, never summarized, never
 *   classified, never guessed. What was declared is what is shown.
 * - Resolution is EXACT object_id match inside the selected
 *   workspace's vault (v1.3.0 §7): no title/filename matching, no
 *   folder guessing, no latest-file fallback. 0 → missing, 1 →
 *   available, >1 → ambiguous (paths listed; never silent choice).
 * - Production details and graph projections share one committed saved-note
 *   index. Compatibility artifact readers can still read a different source
 *   revision, so those surfaces retain their source/snapshot distinction.
 * - Read-only port: no write verb exists on this surface.
 */

export interface KoProvenanceLayers {
  readonly observation?: string;
  readonly evidence?: string;
  readonly inference?: string;
  readonly conclusion?: string;
}

export interface KoFrontmatter {
  readonly object_id: string;
  readonly predecessor?: string;
  readonly successor?: string;
  readonly kind?: string;
  readonly status?: string;
  readonly title?: string;
  readonly workspace_context?: string;
  readonly creator_role?: string;
  readonly created_from?: readonly string[];
  readonly provenance?: KoProvenanceLayers;
}

export type KoDetailResult =
  | { readonly state: "available"; readonly path: string; readonly frontmatter: KoFrontmatter }
  | { readonly state: "missing" }
  | { readonly state: "ambiguous"; readonly paths: readonly string[] }
  | { readonly state: "unavailable"; readonly reason: string };

export interface KoSourceReader {
  resolve(objectId: string): Promise<KoDetailResult>;
  /** Optional cache invalidation hook for explicit re-reads. */
  invalidate?(): void;
}

/** Extract the frontmatter block (between the opening `---` and the
 * next `---` line). Returns null when absent. Body is discarded. */
export function extractFrontmatterBlock(text: string): string | null {
  const normalized = text.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const lines = normalized.split("\n");
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return lines.slice(1, i).join("\n");
  }
  return null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Normalize declared field names only. Legacy types/statuses/ids are
 * retained verbatim; evidence never becomes fact and ids are never generated. */
export function koFrontmatterFromFields(fields: Record<string, unknown>): KoFrontmatter | null {
  const modern = Object.prototype.hasOwnProperty.call(fields, "object_id");
  const legacy = typeof fields.type === "string" &&
    (LEGACY_OBJECT_TYPES as readonly string[]).includes(fields.type);
  const objectId = text(modern ? fields.object_id : legacy ? fields.id : undefined)?.trim();
  if (!objectId) return null;
  if (modern && fields.id !== undefined && fields.id !== objectId) return null;
  const raw = fields.provenance;
  const provenance: Record<string, string> = {};
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    for (const layer of ["observation", "evidence", "inference", "conclusion"]) {
      const value = (raw as Record<string, unknown>)[layer];
      if (typeof value === "string") provenance[layer] = value;
    }
  }
  return {
    object_id: objectId,
    kind: text(modern ? fields.kind : fields.type),
    status: text(fields.status), title: text(fields.title),
    predecessor: text(fields.predecessor), successor: text(fields.successor),
    workspace_context: text(fields.workspace_context), creator_role: text(fields.creator_role),
    created_from: Array.isArray(fields.created_from)
      ? fields.created_from.filter((v): v is string => typeof v === "string") : undefined,
    provenance: Object.keys(provenance).length > 0 ? provenance : undefined,
  };
}

/** Full YAML 1.2 parsing, shared with the live index. Invalid/duplicate
 * declarations are never partly interpreted as a different identity. */
export function parseKoFrontmatter(block: string): KoFrontmatter | null {
  const parsed = parseYamlFields(block, "");
  if (parsed.diagnostics.length > 0) return null;
  return koFrontmatterFromFields(parsed.fields);
}

/** Compose a resolution through a parsed note: the caller (view or
 * test) supplies how bytes were read; this helper only shapes the
 * result. Malformed-but-identifiable sources stay "available" with
 * whatever fields parsed — incompleteness is display state, not
 * failure (v1.3.0: field-level missing/empty distinction). */
export function koDetailFromNote(path: string, text: string): KoDetailResult {
  const block = extractFrontmatterBlock(text);
  if (block === null) return { state: "missing" };
  const fm = parseKoFrontmatter(block);
  if (fm === null) return { state: "missing" };
  return { state: "available", path, frontmatter: fm };
}
