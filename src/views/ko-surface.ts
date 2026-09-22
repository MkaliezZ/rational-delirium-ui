/** Native Markdown leaf companion. Declared source fields and the shared
 * snapshot are labelled separately; no reader, parser or mutation lives here. */
import type { KoFrontmatter } from "../semantic-graph/ko-detail-reader";
import type { GraphLoadResult } from "../semantic-graph/graph-loader";
import { resolveObject, relationSummary, buildLineage } from "../semantic-graph/object-resolver";
import { createChild, emptyEl } from "./dom-helpers";

export interface KoSurfaceInput {
  readonly path: string;
  readonly frontmatter: KoFrontmatter;
  readonly snapshot: GraphLoadResult | null;
  readonly inspect?: (objectId: string) => void;
}

export function renderKoSurface(host: HTMLElement, input: KoSurfaceInput): void {
  const expanded = new Set([...host.querySelectorAll<HTMLDetailsElement>("details[open]")].map(el => el.dataset.section));
  const focusKey = host.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.focusKey : undefined;
  const scroll = host.scrollTop;
  emptyEl(host);
  const fm = input.frontmatter;
  host.setAttribute("aria-label", "Knowledge Object declared context");
  host.dataset.objectId = fm.object_id;
  createChild(host, "div", { cls: "rdko-eyebrow", text: "KNOWLEDGE OBJECT · SAVED SOURCE" });
  createChild(host, "h2", { cls: "rdko-title", text: fm.title ?? "Title not declared" });
  const identity = createChild(host, "dl", { cls: "rdko-identity" });
  const field = (parent: HTMLElement, key: string, value: string | undefined) => {
    createChild(parent, "dt", { text: key });
    createChild(parent, "dd", { text: value ?? "not declared" });
  };
  field(identity, "object_id", fm.object_id);
  field(identity, "kind", fm.kind);
  field(identity, "status · declared lifecycle", fm.status);
  const actions = createChild(host, "div", { cls: "rdko-actions" });
  if (input.inspect !== undefined) {
    const inspect = createChild(actions, "button", { text: "Inspect object" });
    inspect.dataset.focusKey = "inspect";
    inspect.addEventListener("click", () => input.inspect?.(fm.object_id));
  }
  createChild(actions, "span", { cls: "rdko-note", text: "Native Properties and note content remain below. Declarations are not validation." });
  const sections = createChild(host, "div", { cls: "rdko-sections" });
  const section = (key: string, title: string): HTMLElement => {
    const details = createChild(sections, "details", { cls: "rdko-section" }) as HTMLDetailsElement;
    details.dataset.section = key; details.open = expanded.has(key);
    const summary = createChild(details, "summary", { text: title }); summary.dataset.focusKey = key;
    return createChild(details, "div", { cls: "rdko-section-body" });
  };
  const provenance = section("provenance", "Provenance · source declarations");
  const origin = createChild(provenance, "dl", { cls: "rdko-origin" });
  field(origin, "source", input.path);
  field(origin, "creator_role", fm.creator_role);
  field(origin, "workspace_context", fm.workspace_context);
  field(origin, "created_from", fm.created_from?.join(" · "));
  for (const layer of ["observation", "evidence", "inference", "conclusion"] as const) {
    const block = createChild(provenance, "section", { cls: "rdko-layer" });
    block.dataset.layer = layer;
    createChild(block, "h3", { text: layer });
    createChild(block, "p", { text: fm.provenance?.[layer] ?? "Not declared in the available source fields." });
  }
  const relations = section("relations", "Relations · loaded snapshot");
  const lineage = section("lineage", "Lineage · loaded snapshot");
  const load = input.snapshot;
  if (load === null || load.state !== "available") {
    const state = load?.state ?? "not loaded";
    for (const el of [relations, lineage]) createChild(el, "p", { cls: "rdko-note", text:
      `Snapshot ${state}. Relations and lineage unavailable here; this does not mean the note has no declarations.` });
  } else {
    const resolved = resolveObject(load.graph, fm.workspace_context ?? "default", fm.object_id);
    if (resolved.state !== "available") {
      for (const el of [relations, lineage]) createChild(el, "p", { cls: "rdko-note", text:
        `Object ${resolved.state} in the loaded snapshot. No title or path substitution.` });
    } else {
      for (const el of [relations, lineage]) createChild(el, "p", { cls: "rdko-note", text: "Derived snapshot · freshness unverified · source declarations may differ." });
      if (resolved.node.kind !== fm.kind || resolved.node.status !== fm.status) {
        createChild(relations, "p", { cls: "rdko-note", text: `Snapshot/source differ: snapshot kind ${resolved.node.kind}, status ${resolved.node.status}. Not reconciled.` });
      }
      const target = (parent: HTMLElement, objectId: string, prefix: string, unresolved = false) => {
        const exact = resolveObject(load.graph, fm.workspace_context ?? "default", objectId);
        const available = !unresolved && exact.state === "available";
        const row = createChild(parent, "div", { cls: "rdko-link-row" });
        createChild(row, "span", { text: prefix });
        if (available && input.inspect !== undefined) {
          const button = createChild(row, "button", { text: objectId });
          button.dataset.focusKey = `${prefix}:${objectId}`;
          button.setAttribute("aria-label", `Inspect ${objectId}`);
          button.addEventListener("click", () => input.inspect?.(objectId));
        } else {
          createChild(row, "span", { text: `${objectId}${available ? "" : ` · ${unresolved ? "unresolved" : exact.state}`}` });
        }
      };
      const rel = relationSummary(load.graph, fm.object_id);
      for (const row of rel.rows) target(relations, row.otherId,
        row.direction === "outgoing" ? `${fm.object_id} — ${row.edge.relation} →` : `${fm.object_id} ← ${row.edge.relation} —`);
      for (const edge of rel.unresolvedFrom) target(relations, edge.target, `${fm.object_id} — ${edge.relation} →`, true);
      for (const edge of rel.unresolvedTo) target(relations, edge.source, `${fm.object_id} ← ${edge.relation} —`, true);
      if (rel.rows.length + rel.unresolvedFrom.length + rel.unresolvedTo.length === 0) {
        createChild(relations, "p", { text: "No declared relations in this snapshot." });
      }
      const history = buildLineage(load.graph, fm.object_id);
      for (const entry of history.previous) target(lineage, entry.objectId, `Previous · ${entry.via} ·`, !entry.inSnapshot);
      for (const entry of history.following) target(lineage, entry.objectId, `Following · ${entry.via} ·`, !entry.inSnapshot);
      for (const note of history.notes) createChild(lineage, "p", { text: note });
      if (history.previous.length + history.following.length === 0) createChild(lineage, "p", { text: "No lineage declared in this snapshot. History is not inferred from file dates." });
    }
  }
  host.scrollTop = scroll;
  if (focusKey !== undefined) for (const el of host.querySelectorAll<HTMLElement>("[data-focus-key]")) {
    if (el.dataset.focusKey === focusKey) { el.focus({ preventScroll: true }); break; }
  }
}
