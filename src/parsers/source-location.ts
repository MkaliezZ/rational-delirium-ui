import type { RDSourceLocation } from "../model";

/** Precompute line-start offsets of the ORIGINAL content so body
 * offsets (which mdast reports against the same string) map to
 * 1-based UI lines without re-scans. */
export function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

export function lineAt(starts: number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-based
}

export function frontmatterLocation(
  path: string,
  field: string,
  sourceRevision: number,
): RDSourceLocation {
  return { path, kind: "frontmatter", field, sourceRevision };
}

export function bodyLocation(
  path: string,
  starts: number[],
  start: number,
  end: number,
  sourceRevision: number,
): RDSourceLocation {
  return {
    path,
    kind: "body",
    range: { start, end },
    line: lineAt(starts, start),
    sourceRevision,
  };
}
