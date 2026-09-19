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
 * - Source reads are CURRENT-source reads, not necessarily the
 *   state the graph snapshot was built from; the panel labels them
 *   as such and surfaces disagreements instead of reconciling.
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

function scalar(raw: string): string | undefined {
  let v = raw.trim();
  if (v === "" || v === "null" || v === "~") return undefined;
  const q = v[0];
  if (q === '"' || q === "'") {
    const end = v.indexOf(q, 1);
    if (end === -1) return undefined; // unterminated — malformed
    return v.slice(1, end) || undefined;
  }
  const comment = v.indexOf(" #");
  if (comment !== -1) v = v.slice(0, comment).trim();
  return v === "" || v === "null" ? undefined : v;
}

/** Parse a frontmatter block into declared KO fields. Returns null
 * when the block declares no object_id (not a KO / malformed);
 * declared-absent fields stay undefined so callers can distinguish
 * "declared empty" from "not declared". */
export function parseKoFrontmatter(block: string): KoFrontmatter | null {
  const lines = block.split("\n");
  const scalars: Record<string, string | undefined> = {};
  const createdFrom: string[] = [];
  const provenance: Record<string, string | undefined> = {};
  let i = 0;
  let inCreatedFrom = false;
  let inProvenance = false;
  while (i < lines.length) {
    const line = lines[i];
    const top = /^([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(line);
    const nested = /^\s+([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(line);
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (top) {
      inCreatedFrom = false;
      inProvenance = false;
      const key = top[1];
      if (key === "created_from") {
        inCreatedFrom = true;
        const rest = top[2].trim();
        if (rest === "[]") { inCreatedFrom = false; i++; continue; }
        if (rest !== "") { inCreatedFrom = false; i++; continue; }
      } else if (key === "provenance") {
        inProvenance = true;
        i++;
        continue;
      } else {
        scalars[key] = scalar(top[2]);
      }
    } else if (inProvenance && nested) {
      provenance[nested[1]] = scalar(nested[2]);
    } else if (inCreatedFrom && item) {
      const v = scalar(item[1]);
      if (v !== undefined) createdFrom.push(v);
    }
    i++;
  }
  const objectId = scalars.object_id;
  if (objectId === undefined) return null;
  const hasProvenanceKeys =
    provenance.observation !== undefined || provenance.evidence !== undefined ||
    provenance.inference !== undefined || provenance.conclusion !== undefined;
  return {
    object_id: objectId,
    kind: scalars.kind,
    status: scalars.status,
    title: scalars.title,
    workspace_context: scalars.workspace_context,
    creator_role: scalars.creator_role,
    created_from: createdFrom.length > 0 ? createdFrom : undefined,
    provenance: hasProvenanceKeys ? provenance : undefined,
  };
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
