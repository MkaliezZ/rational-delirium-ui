import type { RDLink, ResolutionState } from "../model";

const WIKILINK = /^\[\[([^\[\]]+?)\]\]$/;
const WRAPPED = /^\[\[([^\[\]]+)\]\]$/;
const URI_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const ABS_RE = /^([a-z]:[\\/]|[\\/]|~\/?)/i;

/** RR-04: shared internal reference validator used by BOTH the
 * frontmatter relation parser and the body relation parser. Rejects
 * external URIs, absolute OS paths, and other non-internal forms. */
export function validateInternalLinkTarget(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed || trimmed.includes("[") || trimmed.includes("]")) return false;
  if (URI_RE.test(trimmed)) return false;
  if (ABS_RE.test(trimmed)) return false;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("file:")) return false;
  return true;
}

/** Strict RD wikilink parser for one raw inner value. */
export function parseWikilink(raw: string): RDLink | null {
  let inner = raw.trim();
  const direct = WRAPPED.exec(inner);
  if (direct) inner = direct[1].trim();
  if (!validateInternalLinkTarget(inner)) return null;
  let target = inner;
  let alias: string | undefined;
  const bar = inner.indexOf("|");
  if (bar >= 0) {
    alias = inner.slice(bar + 1).trim() || undefined;
    target = inner.slice(0, bar);
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
  if (!targetName || targetName.includes("\n")) return null;
  return { raw: inner, targetName, alias, heading, block };
}

export function looksLikeWikilink(text: string): boolean {
  return WIKILINK.test(text.trim());
}

export interface LinkResolution {
  state: ResolutionState;
  paths: string[];
}

export function resolveLink(
  link: RDLink,
  candidatePaths: readonly string[],
): LinkResolution {
  const wanted = link.targetName;
  const exact = candidatePaths.filter((p) => p === wanted || p === wanted + ".md");
  if (exact.length === 1) return { state: "RESOLVED", paths: exact };
  if (exact.length > 1) return { state: "AMBIGUOUS", paths: exact };
  const byName = candidatePaths.filter(
    (p) => p.endsWith("/" + wanted + ".md") || p.endsWith("/" + wanted),
  );
  if (byName.length === 1) return { state: "RESOLVED", paths: byName };
  if (byName.length > 1) return { state: "AMBIGUOUS", paths: byName };
  return { state: "BROKEN", paths: [] };
}
