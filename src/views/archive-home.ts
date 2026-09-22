/** Archive Home: a read-only presentation of the workspace's published models. */
import type { GraphLoadResult } from "../semantic-graph/graph-loader";
import type { CollaborationModel } from "../collaboration/artifact-reader";
import { createChild } from "./dom-helpers";

export function renderArchiveHome(
  host: HTMLElement,
  snapshot: GraphLoadResult | null,
  collaboration: CollaborationModel | null,
  inspect: (id: string) => void,
  openCollaboration: () => void,
): void {
  const home = createChild(host, "section", { cls: "rd-archive-home" });
  home.setAttribute("aria-label", "Archive Home");
  createChild(home, "div", { cls: "rdah-eyebrow", text: "RATIONAL DELIRIUM / ARCHIVE" });
  createChild(home, "h2", { text: "Archive Home" });
  createChild(home, "p", { text: "Knowledge as declared. Contributions as recorded." });
  const columns = createChild(home, "div", { cls: "rdah-columns" });
  const section = (title: string) => {
    const el = createChild(columns, "section", { cls: "rdah-section" });
    createChild(el, "h3", { text: title });
    return el;
  };
  const landscape = section("Knowledge Landscape");
  if (snapshot?.state === "available") {
    createChild(landscape, "p", { cls: "rdah-note", text: "Objects in the loaded semantic snapshot · freshness unverified. Browse all in Archive Navigation." });
    const nodes = [...snapshot.graph.nodes].sort((a, b) => a.object_id < b.object_id ? -1 : a.object_id > b.object_id ? 1 : 0);
    if (!nodes.length) createChild(landscape, "p", { text: "No objects in this snapshot. This is not a Vault inventory." });
    for (const node of nodes.slice(0, 8)) {
      const row = createChild(landscape, "button", { cls: "rdah-object" });
      createChild(row, "span", { cls: "rdah-meta", text: `${node.object_id} · ${node.kind} · ${node.status}` });
      createChild(row, "span", { text: node.title });
      row.addEventListener("click", () => inspect(node.object_id));
    }
    if (nodes.length > 8) createChild(landscape, "p", { cls: "rdah-note", text: "Showing 8 objects in identity order; not ranked." });
  } else {
    createChild(landscape, "p", { text: `Semantic snapshot: ${snapshot?.state ?? "not_loaded"}. Object landscape is unavailable; this does not mean the Vault has no knowledge.` });
  }
  const records = section("Collaboration");
  createChild(records, "p", { cls: "rdah-note", text: "Recorded work, not verification of execution or knowledge." });
  for (const [kind, title, rows] of [
    ["proposal", "Proposal records", collaboration?.proposals],
    ["contribution", "Contribution records", collaboration?.contributions],
  ] as const) {
    createChild(records, "h4", { text: title });
    const state = collaboration?.dirs[kind];
    if (state !== "available") {
      createChild(records, "p", { text: `${title}: ${state ?? "not_loaded"}` });
      continue;
    }
    if (!rows?.length) createChild(records, "p", { text: `No ${kind} records found.` });
    for (const row of [...(rows ?? [])].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).slice(0, 4)) {
      createChild(records, "p", { cls: "rdah-record", text: `${row.id ?? row.path} · ${row.status ?? "status not declared"}${row.malformed ? " · malformed record" : ""}\n${row.summary}` });
    }
  }
  createChild(records, "button", { text: "Open Collaboration" }).addEventListener("click", openCollaboration);
  const relations = section("Declared Relations");
  const diagnostics = section("Snapshot Diagnostics");
  if (snapshot?.state !== "available") {
    for (const el of [relations, diagnostics]) createChild(el, "p", { text: "Unavailable until a semantic snapshot is loaded." });
    return;
  }
  const graph = snapshot.graph;
  for (const [label, edges] of [["Declared relations", graph.edges], ["Unresolved declarations", graph.unresolved]] as const) {
    createChild(relations, "h4", { text: label });
    if (!edges.length) createChild(relations, "p", { text: `No ${label.toLowerCase()} in this snapshot.` });
    for (const edge of edges.slice(0, 6)) createChild(relations, "p", { cls: "rdah-record", text: `${edge.source} → ${edge.target}\n${edge.relation}` });
    if (edges.length > 6) createChild(relations, "p", { cls: "rdah-note", text: `Showing 6 of ${edges.length} declarations in snapshot order.` });
  }
  createChild(relations, "p", { cls: "rdah-note", text: "Unresolved means target resolution, not a research task or a judgment." });
  if (!graph.diagnostics.length) createChild(diagnostics, "p", { text: "No diagnostics reported in this snapshot. This does not validate knowledge." });
  for (const item of graph.diagnostics.slice(0, 6)) createChild(diagnostics, "p", { cls: "rdah-record", text: `${item.type} · ${item.object_id}\n${item.paths.join("\n")}` });
  if (graph.diagnostics.length > 6) createChild(diagnostics, "p", { text: `Showing 6 of ${graph.diagnostics.length} diagnostics.` });
}
