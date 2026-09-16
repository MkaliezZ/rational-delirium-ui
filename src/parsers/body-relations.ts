import { fromMarkdown } from "mdast-util-from-markdown";
import type { Paragraph, PhrasingContent } from "mdast";
import type {
  RDDiagnostic,
  RDRelationAssertion,
  RelationPredicate,
} from "../model";
import { BODY_RELATION_PREDICATES } from "../model";
import { parseWikilink, validateInternalLinkTarget } from "./link-reference";
import { bodyLocation, lineStarts } from "./source-location";

const LINE = /^\r?(derived_from|repeats_in|observed_in)[ \t]*:[ \t]*\[\[([^\[\]\n]+?)\]\][ \t]*\r?$/;

function excludedInlineRanges(para: Paragraph): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const visit = (node: PhrasingContent | Paragraph): void => {
    if (node.type === "inlineCode" || node.type === "emphasis" ||
        node.type === "strong" || node.type === "delete" ||
        node.type === "html" || node.type === "link" ||
        node.type === "image" || node.type === "imageReference" ||
        node.type === "linkReference") {
      const pos = node.position;
      if (pos?.start.offset !== undefined && pos?.end.offset !== undefined) {
        ranges.push([pos.start.offset, pos.end.offset]);
      }
      return;
    }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) visit(child as PhrasingContent);
    }
  };
  visit(para);
  return ranges;
}

function overlaps(range: [number, number], excluded: Array<[number, number]>): boolean {
  for (const [exStart, exEnd] of excluded) {
    if (range[0] < exEnd && range[1] > exStart) return true;
  }
  return false;
}

/** RD-07 §21: if a paragraph contains ANY HTML AST node, the whole
 * paragraph produces no body relation (conservative parser). */
function paragraphHasHtml(para: Paragraph): boolean {
  let has = false;
  const visit = (node: PhrasingContent | Paragraph): void => {
    if (node.type === "html") { has = true; return; }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) visit(child as PhrasingContent);
    }
  };
  visit(para);
  return has;
}

/** RD-07 §22: conservative cross-paragraph HTML region scanner.
 * Tracks whether any candidate line is inside an unclosed HTML region.
 * Only recognizes simple open/close tag pairs at block level; complex
 * HTML that can't be reliably analyzed → fail conservative (reject). */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;

/** RD-07/FS-01 §22: use ONLY real mdast html nodes (not raw regex
 * on full source) to compute HTML region state. Code fences and
 * inline code are NOT html nodes in mdast, so they don't pollute. */
/** RD-07/FS-01 §22: build a sorted list of HTML depth events from
 * ONLY real mdast html nodes. For any candidate offset, binary-search
 * to determine if inside an unclosed region. Code fences and inline
 * code are NOT html nodes in mdast, so they don't pollute. */
interface HtmlEvent { offset: number; delta: number }

function computeHtmlEvents(
  tree: ReturnType<typeof fromMarkdown>,
  astOffsetBase: number,
  content: string,
): HtmlEvent[] {
  const events: HtmlEvent[] = [];
  const visitNode = (node: unknown): void => {
    if (node === null || node === undefined) return;
    const n = node as { type?: string; position?: { start?: { offset?: number }; end?: { offset?: number } }; children?: unknown[] };
    if (n.type === "html" && n.position?.start?.offset !== undefined) {
      const start = n.position.start.offset + astOffsetBase;
      const end = (n.position.end?.offset ?? 0) + astOffsetBase;
      const text = content.slice(start, end);
      // FS-02 §6: HTML comments must NOT generate tag events.
      // Their content (e.g., <!-- <span> -->) is inert.
      const trimmed = text.trim();
      if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) {
        // Whole node is a comment: no tag events from its content
      } else {
        TAG_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = TAG_RE.exec(text)) !== null) {
          const isClose = m[1] === "/";
          const tag = m[2].toLowerCase();
          if (VOID_ELEMENTS.has(tag)) continue;
          events.push({ offset: start + m.index, delta: isClose ? -1 : 1 });
        }
      }
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) visitNode(child);
    }
  };
  for (const node of tree.children) visitNode(node);
  events.sort((a, b) => a.offset - b.offset);
  return events;
}

function htmlDepthAt(events: HtmlEvent[], offset: number): number {
  let depth = 0;
  for (const e of events) {
    if (e.offset >= offset) break;
    depth += e.delta;
  }
  return Math.max(0, depth);
}

export interface BodyRelationResult {
  assertions: RDRelationAssertion[];
  ordinaryLinks: string[];
  /** RD-08 §23: when true, ALL semantic relations from this file are
   * suppressed (file-level conservative boundary). */
  fileSuppressed: boolean;
  diagnostics: RDDiagnostic[];
}

/** RC-E (RD-07/12): body relation extraction with inline AST exclusion,
 * HTML paragraph exclusion, and BOM offset mapping. mdast parses the
 * BOM-stripped text; ast offsets are mapped back to original source
 * via astOffsetBase. */
export function extractBodyRelations(
  content: string,
  path: string,
  revision: number,
): BodyRelationResult {
  const assertions: RDRelationAssertion[] = [];
  const ordinaryLinks: string[] = [];
  const diagnostics: RDDiagnostic[] = [];
  const starts = lineStarts(content);

  // RC-E RD-12: BOM offset mapping
  const hasBom = content.charCodeAt(0) === 0xfeff;
  const parseSource = hasBom ? content.slice(1) : content;
  const astOffsetBase = hasBom ? 1 : 0;

  const tree = fromMarkdown(parseSource);
  // RD-07/FS-01 §22: compute position-aware HTML events from mdast
  const htmlEvents = computeHtmlEvents(tree, astOffsetBase, content);
  for (const node of tree.children) {
    if (node.type !== "paragraph") continue;
    const para = node as Paragraph;
    const pos = para.position;
    if (!pos || pos.start.offset === undefined || pos.end.offset === undefined) {
      continue;
    }
    // RD-07 §21: HTML in paragraph → skip whole paragraph
    if (paragraphHasHtml(para)) continue;

    const excluded = excludedInlineRanges(para);
    // Map AST offsets back to original source
    const paraStart = pos.start.offset + astOffsetBase;
    const paraEnd = pos.end.offset + astOffsetBase;
    const slice = content.slice(paraStart, paraEnd);
    const lines = slice.split("\n");
    let offset = paraStart;
    for (const line of lines) {
      const lineStart = offset;
      // RD-12 §36: strip trailing \r from range (but keep original
      // line.length for next-line offset advance)
      const crlfAdjust = line.endsWith("\r") ? 1 : 0;
      const declLength = line.length - crlfAdjust;
      const lineEnd = offset + declLength;
      const match = LINE.exec(line);
      if (match !== null) {
        // RD-07/FS-01 §22: reject if inside real HTML region at this offset
        if (htmlDepthAt(htmlEvents, lineStart) === 0 && !overlaps([lineStart, lineEnd], excluded)) {
          const predicate = match[1] as RelationPredicate;
          if (!validateInternalLinkTarget(match[2])) {
            diagnostics.push({
              code: "body-relation-invalid-link",
              message: `invalid internal link target on a ${predicate} line`,
              path,
            });
          } else {
            const link = parseWikilink(match[2]);
            if (link !== null && BODY_RELATION_PREDICATES.includes(predicate)) {
              assertions.push({
                predicate,
                link,
                location: bodyLocation(path, starts, lineStart, lineEnd, revision),
              });
            }
          }
        }
      } else {
        const inner = /\[\[([^\[\]\n]+?)\]\]/g;
        let m: RegExpExecArray | null;
        while ((m = inner.exec(line)) !== null) {
          const linkStart = lineStart + m.index;
          if (!overlaps([linkStart, linkStart + m[0].length], excluded)) {
            if (validateInternalLinkTarget(m[1])) {
              ordinaryLinks.push(m[1]);
            }
          }
        }
      }
      offset += line.length + 1;
    }
  }
  return { assertions, ordinaryLinks, fileSuppressed: false, diagnostics };
}
