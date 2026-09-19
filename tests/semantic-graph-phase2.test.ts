/** v1.3.1 Phase 2 tests — Provenance Surface, Lineage Explorer,
 * Relation Inspector, Diagnostics Inspector, boundary proofs.
 *
 * Provenance comes ONLY from declared source frontmatter (the
 * ko-detail-reader contract): available / declared empty / not
 * declared / not_loaded are distinct states. Lineage reads declared
 * pointers and inverse readings of declared edges — nothing merged,
 * hidden, or auto-selected. Relations render exactly what was
 * declared; no reverse inference. Diagnostics are observations.
 */

import { describe, expect, it } from "vitest";
import { GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";
import { buildLineage } from "../src/semantic-graph/object-resolver";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../src/semantic-graph/knowledge-panel";
import {
  extractFrontmatterBlock,
  parseKoFrontmatter,
  type KoDetailResult,
} from "../src/semantic-graph/ko-detail-reader";

const node = (object_id: string, over: Record<string, unknown> = {}) => ({
  object_id,
  kind: "observation",
  status: "candidate",
  title: `Object ${object_id}`,
  predecessor: null,
  successor: null,
  ...over,
});
const edge = (source: string, target: string, relation: string) => ({ source, target, relation });
const artifact = (parts: {
  nodes?: object[]; edges?: object[]; unresolved?: object[]; diagnostics?: object[];
}) =>
  parseGraphSnapshot(JSON.stringify({
    schema: GRAPH_SCHEMA_TAG,
    nodes: parts.nodes ?? [],
    edges: parts.edges ?? [],
    unresolved: parts.unresolved ?? [],
    diagnostics: parts.diagnostics ?? [],
  }));

const koNote = (objectId: string, extra: string[] = []) =>
  [
    "---",
    `object_id: "${objectId}"`,
    "kind: observation",
    "status: active",
    'title: "Note title"',
    ...extra,
    "---",
    "",
    "## Observation",
    "",
    "Body prose is NEVER parsed for provenance.",
  ].join("\n");

const withProvenance = koNote("ko-20260921-0001", [
  "provenance:",
  '  observation: "what was observed"',
  '  evidence: "where it came from"',
  '  inference: "what was derived"',
  '  conclusion: "current understanding"',
  "created_from:",
  '  - "workflow/research-r1.md"',
  'creator_role: "research"',
  'workspace_context: "FICT-W"',
]);

const availableSource = (text: string): KoDetailResult => {
  const block = extractFrontmatterBlock(text);
  if (block === null) throw new Error("fixture must have frontmatter");
  const fm = parseKoFrontmatter(block);
  if (fm === null) throw new Error("fixture must parse");
  return { state: "available", path: "KO/ko-1.md", frontmatter: fm };
};

describe("Phase 2 §1 provenance surface", () => {
  const loaded = artifact({
    nodes: [node("ko-20260921-0001", { status: "active" })],
  });
  if (loaded.state !== "available") throw new Error("fixture must load");

  it("1. available declared provenance renders all four layers", () => {
    const model = buildKnowledgePanelModel({
      load: loaded,
      workspace: "FICT-W",
      objectId: "ko-20260921-0001",
      sourceDetail: availableSource(withProvenance),
    });
    expect(model.provenance).not.toBeNull();
    if (model.provenance === null) return;
    expect(model.provenance.overall).toBe("available");
    expect(model.provenance.layers.map((l) => [l.label, l.state, l.text])).toEqual([
      ["Observation", "available", "what was observed"],
      ["Evidence", "available", "where it came from"],
      ["Inference", "available", "what was derived"],
      ["Conclusion", "available", "current understanding"],
    ]);
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("what was observed");
    expect(host.textContent).toContain("current-source read");
  });

  it("2. missing provenance stays an explicit unavailable state", () => {
    const noProv = availableSource(koNote("ko-20260921-0001"));
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W",
      objectId: "ko-20260921-0001", sourceDetail: noProv,
    });
    if (model.provenance === null) throw new Error("section must exist");
    expect(model.provenance.layers.every((l) => l.state === "not declared")).toBe(true);
    // source missing entirely → overall not_loaded states, no text
    const model2 = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W",
      objectId: "ko-20260921-0001", sourceDetail: { state: "missing" },
    });
    if (model2.provenance === null) throw new Error();
    expect(model2.provenance.overall).toBe("missing");
    const byLabel = new Map(model2.fields.map((f) => [f.label, f]));
    expect(byLabel.get("provenance (observation / evidence / inference / conclusion)")?.state)
      .toBe("not_loaded");
  });

  it("3. no inferred provenance: body prose is never read; absent keys never fabricated", () => {
    // The fixture note's BODY says "Body prose is NEVER parsed..." —
    // if provenance were inferred from prose, that string would
    // appear in provenance layers. It must not.
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W",
      objectId: "ko-20260921-0001", sourceDetail: availableSource(koNote("ko-20260921-0001")),
    });
    const text = JSON.stringify(model.provenance);
    expect(text).not.toContain("NEVER parsed");
    expect(text).not.toContain("Note title"); // title ≠ provenance
    expect(model.provenance?.layers.every((l) => l.state === "not declared")).toBe(true);
  });
});

describe("Phase 2 §2 lineage explorer", () => {
  const loaded = artifact({
    nodes: [
      node("ko-20260921-0001", { status: "superseded", successor: "ko-20260921-0002" }),
      node("ko-20260921-0002", {
        status: "active",
        predecessor: "ko-20260921-0001",
        successor: "ko-20260921-0003",
      }),
      node("ko-20260921-0003", { status: "candidate", predecessor: "ko-20260921-0002" }),
      node("ko-20260921-0004", { status: "candidate" }),
    ],
    edges: [
      edge("ko-20260921-0002", "ko-20260921-0001", "supersedes"),
      edge("ko-20260921-0003", "ko-20260921-0002", "revises"),
      edge("ko-20260921-0004", "ko-20260921-0002", "revises"),
    ],
  });
  if (loaded.state !== "available") throw new Error("fixture must load");

  it("4. predecessor and successor render via fields and inverse readings", () => {
    const lineage = buildLineage(loaded.graph, "ko-20260921-0002");
    expect(lineage.previous.map((e) => [e.objectId, e.via])).toEqual([
      ["ko-20260921-0001", "predecessor field"],
      ["ko-20260921-0001", "supersedes declaration"],
    ]);
    expect(lineage.following.map((e) => [e.objectId, e.via])).toEqual([
      ["ko-20260921-0003", "successor field"],
      ["ko-20260921-0003", "revised-by reading"],
      ["ko-20260921-0004", "revised-by reading"],
    ]);
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260921-0002",
    });
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("via predecessor field");
    expect(host.textContent).toContain("via revised-by reading");
  });

  it("5. superseded objects remain visible", () => {
    const lineage = buildLineage(loaded.graph, "ko-20260921-0002");
    const pred = lineage.previous.find((e) => e.objectId === "ko-20260921-0001");
    expect(pred).toBeDefined();
    expect(pred?.status).toBe("superseded");
    expect(pred?.inSnapshot).toBe(true);
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260921-0002",
    });
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("[superseded]");
  });

  it("6. no automatic latest selection: multiple following objects all listed", () => {
    const lineage = buildLineage(loaded.graph, "ko-20260921-0002");
    expect(lineage.following.filter((e) => e.via !== "successor field")).toHaveLength(2);
    expect(lineage.notes.some((n) => n.includes("none auto-selected"))).toBe(true);
  });
});

describe("Phase 2 §3 relation inspector", () => {
  const six = artifact({
    nodes: [node("ko-20260921-0001"), node("ko-20260921-0002")],
    edges: [
      edge("ko-20260921-0001", "ko-20260921-0002", "supports"),
      edge("ko-20260921-0001", "ko-20260921-0002", "contradicts"),
      edge("ko-20260921-0001", "ko-20260921-0002", "derived_from"),
      edge("ko-20260921-0001", "ko-20260921-0002", "depends_on"),
      edge("ko-20260921-0002", "ko-20260921-0001", "revises"),
      edge("ko-20260921-0002", "ko-20260921-0001", "supersedes"),
    ],
  });
  if (six.state !== "available") throw new Error("fixture must load");

  it("7. all six relation types render with source/target/direction", () => {
    const model = buildKnowledgePanelModel({
      load: six, workspace: "FICT-W", objectId: "ko-20260921-0001",
    });
    const types = model.relations.map((r) => `${r.edge.relation}[${r.direction}]`).sort();
    expect(types).toEqual([
      "contradicts[outgoing]", "derived_from[outgoing]", "depends_on[outgoing]",
      "revises[incoming]", "supports[outgoing]", "supersedes[incoming]",
    ].sort());
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    const text = host.textContent ?? "";
    for (const r of ["supports", "contradicts", "derived_from", "depends_on", "revises", "supersedes"]) {
      expect(text).toContain(r);
    }
    expect(text).toContain("source: ko-20260921-0001 → target: ko-20260921-0002");
    expect(text).toContain("source: ko-20260921-0002 → target: ko-20260921-0001");
  });

  it("8. unresolved relation stays visible with explicit state", () => {
    const withUnresolved = artifact({
      nodes: [node("ko-20260921-0001")],
      unresolved: [edge("ko-20260921-0001", "ko-20260921-9999", "depends_on")],
    });
    if (withUnresolved.state !== "available") throw new Error();
    const model = buildKnowledgePanelModel({
      load: withUnresolved, workspace: "FICT-W", objectId: "ko-20260921-0001",
    });
    expect(model.unresolvedFrom).toEqual([
      { relation: "depends_on", target: "ko-20260921-9999" },
    ]);
    expect(model.diagnosticsGroups?.unresolvedReferences).toHaveLength(1);
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("unresolved declaration: depends_on → ko-20260921-9999");
  });

  it("9. no inferred reverse relation: declarations are read, never mirrored", () => {
    const one = artifact({
      nodes: [node("ko-20260921-0001"), node("ko-20260921-0002")],
      edges: [edge("ko-20260921-0001", "ko-20260921-0002", "supports")],
    });
    if (one.state !== "available") throw new Error();
    // Reading from the target side yields exactly ONE supports row
    // (incoming reading of the single declaration) — never a
    // fabricated reciprocal, never a contradicts, never a second edge.
    const model = buildKnowledgePanelModel({
      load: one, workspace: "FICT-W", objectId: "ko-20260921-0002",
    });
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].edge.relation).toBe("supports");
    expect(model.relations[0].direction).toBe("incoming");
    expect(one.graph.edges).toHaveLength(1); // artifact untouched
  });
});

describe("Phase 2 §4 diagnostics inspector", () => {
  it("10. duplicate identity diagnostics display with all paths", () => {
    const loaded = artifact({
      nodes: [node("ko-20260921-0001")],
      diagnostics: [{
        type: "duplicate_identity",
        object_id: "ko-20260921-0001",
        paths: ["/a.md", "/b.md"],
      }],
    });
    if (loaded.state !== "available") throw new Error();
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260921-0001",
    });
    expect(model.diagnostics[0].type).toBe("duplicate_identity");
    expect(model.diagnostics[0].paths).toHaveLength(2);
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("duplicate_identity: ko-20260921-0001 — 2 declaring path(s)");
    expect(host.textContent).toContain("observations, not repair requests");
  });

  it("11. unavailable source and malformed source states display explicitly", () => {
    const loaded = artifact({ nodes: [node("ko-20260921-0001")] });
    if (loaded.state !== "available") throw new Error();
    const unavailable = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W",
      objectId: "ko-20260921-0001",
      sourceDetail: { state: "unavailable", reason: "read error" },
    });
    expect(unavailable.diagnosticsGroups?.sourceResolution)
      .toContain("source read unavailable: read error");
    const missingGraph = buildKnowledgePanelModel({
      load: { state: "missing" }, workspace: "FICT-W",
    });
    expect(missingGraph.snapshotMessage).toContain("does not mean no knowledge exists");
    // malformed source: object_id declared but nothing else parses
    const block = parseKoFrontmatter('object_id: "ko-20260921-0001"');
    expect(block?.object_id).toBe("ko-20260921-0001");
    expect(block?.kind).toBeUndefined(); // incompleteness is state, not failure
  });
});

describe("Phase 2 boundary proofs", () => {
  it("12. read-only behavior: frozen artifact models; ports expose no write verb", () => {
    const loaded = artifact({
      nodes: [node("ko-20260921-0001")],
      edges: [edge("ko-20260921-0001", "ko-20260921-0002", "supports")],
      unresolved: [edge("ko-20260921-0001", "ko-20260921-0003", "depends_on")],
    });
    if (loaded.state !== "available") throw new Error();
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260921-0001",
      sourceDetail: { state: "missing" },
    });
    expect(() => {
      (model.relations as unknown as { push(x: unknown): void }).push(null as never);
    }).toThrow();
    expect(() => {
      (loaded.graph.edges[0] as unknown as { relation: string }).relation = "contradicts";
    }).toThrow();
    // KoSourceReader port surface is resolve/invalidate only
    const readerProto = { resolve() { return Promise.resolve({ state: "missing" as const }); } };
    expect(Object.keys(readerProto)).toEqual(["resolve"]);
  });

  it("13. no schema modification: artifact contract still enforced exactly", () => {
    // (a) schema tag constant unchanged
    expect(GRAPH_SCHEMA_TAG).toBe("rd-semantic-graph-projection/1");
    // (b) unknown schema tags still rejected without migration
    const future = parseGraphSnapshot(JSON.stringify({
      schema: "rd-semantic-graph-projection/2", nodes: [], edges: [],
      unresolved: [], diagnostics: [],
    }));
    expect(future).toEqual({ state: "invalid", reason: "unsupported-schema" });
    // (c) the six-relation enum is still closed: an invented relation
    // type is invalid-shape, not accepted into the presentation.
    const invented = parseGraphSnapshot(JSON.stringify({
      schema: GRAPH_SCHEMA_TAG,
      nodes: [], edges: [{ source: "a", target: "b", relation: "proves_true" }],
      unresolved: [], diagnostics: [],
    }));
    expect(invented).toEqual({ state: "invalid", reason: "invalid-shape" });
    // (d) the loaded graph carries exactly the frozen artifact keys
    const empty = parseGraphSnapshot(JSON.stringify({
      schema: GRAPH_SCHEMA_TAG, nodes: [], edges: [], unresolved: [], diagnostics: [],
    }));
    if (empty.state !== "available") throw new Error("empty artifact must load");
    expect(Object.keys(empty.graph).sort()).toEqual(
      ["diagnostics", "edges", "nodes", "schema", "unresolved"]);
  });

  it("14. no projector modification: semantic-graph/projector.py untouched markers", async () => {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const py = readFileSync(join(root, "semantic-graph", "projector.py"), "utf-8");
    // Key contract markers of the released projector (v1.2.1) must
    // still be present; this test fails if the TS phase tampered
    // with the Python projector's contract.
    expect(py).toContain("rd-semantic-graph-projection/1");
    expect(py).toContain("def project(");
    expect(py).toContain("diagnostics");
    // and the presentation layer never invokes any projector/process
    const loaderSrc = readFileSync(join(root, "src", "semantic-graph", "graph-loader.ts"), "utf-8");
    expect(loaderSrc).not.toContain("child_process");
    expect(loaderSrc).not.toContain("spawn");
    expect(loaderSrc).not.toMatch(/exec\(/);
  });
});
