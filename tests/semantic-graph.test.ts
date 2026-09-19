/** v1.3.1 Phase 1 tests — Semantic Graph Loader, Object Resolver,
 * Knowledge Panel MVP (read-only presentation adapter).
 *
 * Covers the eight required cases plus boundary proofs:
 * read-only (frozen models, input untouched) and no inferred data
 * (similar titles produce zero relations; no score/truth text).
 */

import { describe, expect, it } from "vitest";
import {
  GRAPH_SCHEMA_TAG,
  loadGraphFromSource,
  parseGraphSnapshot,
  type GraphSource,
} from "../src/semantic-graph/graph-loader";
import {
  relationSummary,
  resolveObject,
} from "../src/semantic-graph/object-resolver";
import {
  buildKnowledgePanelModel,
  renderKnowledgePanel,
} from "../src/semantic-graph/knowledge-panel";

const node = (object_id: string, over: Record<string, unknown> = {}) => ({
  object_id,
  kind: "observation",
  status: "candidate",
  title: `Object ${object_id}`,
  predecessor: null,
  successor: null,
  ...over,
});

const edge = (source: string, target: string, relation: string) => ({
  source, target, relation,
});

const artifact = (parts: {
  nodes?: object[];
  edges?: object[];
  unresolved?: object[];
  diagnostics?: object[];
  schema?: string;
}) =>
  JSON.stringify({
    schema: parts.schema ?? GRAPH_SCHEMA_TAG,
    nodes: parts.nodes ?? [],
    edges: parts.edges ?? [],
    unresolved: parts.unresolved ?? [],
    diagnostics: parts.diagnostics ?? [],
  });

const GOOD = artifact({
  nodes: [node("ko-20260919-0001", { status: "active" }), node("ko-20260919-0002")],
  edges: [edge("ko-20260919-0002", "ko-20260919-0001", "revises")],
  unresolved: [edge("ko-20260919-0002", "ko-20260919-9999", "supports")],
  diagnostics: [
    { type: "duplicate_identity", object_id: "ko-20260919-0001", paths: ["/a.md", "/b.md"] },
  ],
});

const source = (text: string): GraphSource => ({
  read: async () => ({ state: "available", text }),
});

describe("v1.3.1 §1 semantic graph loader", () => {
  it("1. loads a valid graph with typed nodes/edges/diagnostics", () => {
    const result = parseGraphSnapshot(GOOD);
    expect(result.state).toBe("available");
    if (result.state !== "available") return;
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(1);
    expect(result.graph.unresolved).toHaveLength(1);
    expect(result.graph.diagnostics).toHaveLength(1);
    expect(result.graph.nodes[0].object_id).toBe("ko-20260919-0001");
    expect(result.graph.nodes[0].predecessor).toBeNull();
    expect(result.graph.edges[0].relation).toBe("revises");
  });

  it("2. missing graph file produces explicit missing state, never an empty graph", async () => {
    const missing: GraphSource = { read: async () => ({ state: "missing" }) };
    const result = await loadGraphFromSource(missing);
    expect(result.state).toBe("missing");
    const model = buildKnowledgePanelModel({ load: result, workspace: "default" });
    expect(model.snapshotState).toBe("unavailable");
    expect(model.snapshotMessage).toContain("does not mean no knowledge exists");
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("missing");
  });

  it("3. malformed JSON and unsupported schema are invalid, never thrown", () => {
    const malformed = parseGraphSnapshot("{ not json");
    expect(malformed).toEqual({ state: "invalid", reason: "malformed-json" });
    const wrongShape = parseGraphSnapshot('{"schema":"x"}');
    expect(wrongShape.state).toBe("invalid");
    const future = parseGraphSnapshot(
      GOOD.replace("rd-semantic-graph-projection/1", "rd-semantic-graph-projection/2"),
    );
    expect(future).toEqual({ state: "invalid", reason: "unsupported-schema" });
    const model = buildKnowledgePanelModel({ load: future, workspace: "default" });
    expect(model.snapshotState).toBe("invalid");
    expect(model.snapshotMessage).toContain("unsupported-schema");
  });
});

describe("v1.3.1 §2 object resolver", () => {
  const graph = parseGraphSnapshot(GOOD);
  if (graph.state !== "available") throw new Error("fixture must load");

  it("4. resolves by exact object_id only", () => {
    const hit = resolveObject(graph.graph, "default", "ko-20260919-0001");
    expect(hit.state).toBe("available");
    // A title-like query must NOT resolve (title matching forbidden).
    const byTitle = resolveObject(graph.graph, "default", "Object ko-20260919-0001");
    expect(byTitle.state).toBe("missing");
  });

  it("5. missing object returns NOT_FOUND", () => {
    expect(resolveObject(graph.graph, "default", "ko-20260919-7777"))
      .toEqual({ state: "missing" });
    const model = buildKnowledgePanelModel({
      load: graph, workspace: "default", objectId: "ko-20260919-7777",
    });
    expect(model.resolveState).toBe("missing");
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("NOT_FOUND (exact object_id match only)");
  });

  it("6. ambiguous object (duplicate ids in a hand-edited artifact) never selects a winner", () => {
    const dup = parseGraphSnapshot(artifact({
      nodes: [node("ko-20260919-0001"), node("ko-20260919-0001", { title: "other" })],
    }));
    if (dup.state !== "available") throw new Error("shape-valid dups must load");
    const result = resolveObject(dup.graph, "default", "ko-20260919-0001");
    expect(result.state).toBe("ambiguous");
    if (result.state === "ambiguous") expect(result.matches).toHaveLength(2);
    const model = buildKnowledgePanelModel({
      load: dup, workspace: "default", objectId: "ko-20260919-0001",
    });
    expect(model.resolveState).toBe("ambiguous");
    expect(model.fields).toHaveLength(0); // no object data shown: no silent selection
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("AMBIGUOUS (2 matches");
  });
});

describe("v1.3.1 §3 knowledge panel", () => {
  const loaded = parseGraphSnapshot(GOOD);
  if (loaded.state !== "available") throw new Error("fixture must load");

  it("7. renders with missing metadata shown honestly as not in snapshot", () => {
    const model = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260919-0002",
    });
    expect(model.resolveState).toBe("available");
    const byLabel = new Map(model.fields.map((f) => [f.label, f]));
    expect(byLabel.get("origin (workspace_context / created_from / creator_role)"))
      .toMatchObject({ state: "not_loaded", text: "not in v1.2.1 snapshot" });
    expect(byLabel.get("provenance (observation / evidence / inference / conclusion)"))
      .toMatchObject({ state: "not_loaded" });
    expect(byLabel.get("validation")?.text)
      .toContain("not established by projection");
    // relation rows: revises edge with available endpoint; unresolved
    // supports declaration surfaced, target missing.
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0]).toMatchObject({
      direction: "outgoing", otherId: "ko-20260919-0001", endpointState: "available",
    });
    expect(model.unresolvedFrom).toEqual([
      { relation: "supports", target: "ko-20260919-9999" },
    ]);
    // diagnostics are scoped to the queried object: -0002 has none;
    // -0001 (queried separately) carries the duplicate_identity one.
    expect(model.diagnostics).toHaveLength(0);
    const modelFor1 = buildKnowledgePanelModel({
      load: loaded, workspace: "FICT-W", objectId: "ko-20260919-0001",
    });
    expect(modelFor1.diagnostics).toHaveLength(1);
    expect(modelFor1.diagnostics[0].type).toBe("duplicate_identity");

    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    const text = host.textContent ?? "";
    expect(text).toContain("ko-20260919-0002");
    expect(text).toContain("declared classification");
    expect(text).toContain("not a validity badge");
    expect(text).toContain("unresolved declaration: supports");
    // banned presentation: no truth/confidence/ranking/correctness
    const banned = ["truth score", "confidence", "ranking", "correctness", "AI judge", "verified-true"];
    for (const b of banned) expect(text.toLowerCase()).not.toContain(b.toLowerCase());
  });

  it("8a. read-only behavior: models are frozen; input text untouched", () => {
    const before = GOOD;
    const result = parseGraphSnapshot(before);
    if (result.state !== "available") throw new Error("fixture must load");
    expect(before).toBe(GOOD); // input string not mutated
    expect(() => {
      (result.graph.nodes as unknown as { push(x: unknown): void }).push(null as never);
    }).toThrow();
    expect(() => {
      (result.graph.nodes[0] as unknown as { title: string }).title = "rewritten";
    }).toThrow();
    expect(() => {
      (result.graph as unknown as { edges: unknown[] }).edges = [];
    }).toThrow();
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.nodes[0].title).toBe("Object ko-20260919-0001");
  });

  it("8b. no inferred data: similar titles produce zero relations", () => {
    const similar = parseGraphSnapshot(artifact({
      nodes: [
        node("ko-20260921-0001", { title: "DS-88 rebuild timing" }),
        node("ko-20260921-0002", { title: "DS-88 rebuild timing (copy)" }),
      ],
    }));
    if (similar.state !== "available") throw new Error("fixture must load");
    expect(similar.graph.edges).toHaveLength(0);
    const summary = relationSummary(similar.graph, "ko-20260921-0001");
    expect(summary.rows).toHaveLength(0);
    expect(summary.unresolvedFrom).toHaveLength(0);
    const model = buildKnowledgePanelModel({
      load: similar, workspace: "FICT-W", objectId: "ko-20260921-0001",
    });
    expect(model.relations).toHaveLength(0);
    const host = document.createElement("div");
    renderKnowledgePanel(host, model);
    expect(host.textContent).toContain("no declared relations in this snapshot");
  });
});
