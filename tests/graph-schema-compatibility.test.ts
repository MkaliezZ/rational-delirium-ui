import { describe, expect, it } from "vitest";
import { GRAPH_SCHEMA_TAG, LEGACY_GRAPH_SCHEMA_TAG, parseGraphSnapshot } from "../src/semantic-graph/graph-loader";

const snapshot = (schema: string, relation: string) => JSON.stringify({schema, nodes: [],
  edges: [{source: "A", target: "B", relation}], unresolved: [], diagnostics: []});
describe("versioned graph interchange", () => {
  it("continues to read the original KO-only artifact without changing its schema", () => {
    const loaded = parseGraphSnapshot(snapshot(LEGACY_GRAPH_SCHEMA_TAG, "supports"));
    expect(loaded.state).toBe("available");
    expect(loaded.state === "available" && loaded.graph.schema).toBe(LEGACY_GRAPH_SCHEMA_TAG);
  });
  it("uses v2 for extended legacy relationships without silently changing v1", () => {
    expect(parseGraphSnapshot(snapshot(GRAPH_SCHEMA_TAG, "related")).state).toBe("available");
    expect(parseGraphSnapshot(snapshot(LEGACY_GRAPH_SCHEMA_TAG, "related"))).toEqual({state: "invalid", reason: "invalid-shape"});
    expect(parseGraphSnapshot(snapshot("rd-semantic-graph-projection/9", "supports"))).toEqual({state: "invalid", reason: "unsupported-schema"});
  });
  it("accepts directed supplements only in the extended graph format",()=>{
    expect(parseGraphSnapshot(snapshot(GRAPH_SCHEMA_TAG,"complements")).state).toBe("available");
    expect(parseGraphSnapshot(snapshot(LEGACY_GRAPH_SCHEMA_TAG,"complements")).state).toBe("invalid");
  });
});
