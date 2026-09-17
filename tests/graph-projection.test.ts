import { afterEach, describe, expect, it } from "vitest";
import { RDIndex } from "../src/index/rd-index";
import { FakeAdapter } from "./support/fake-adapter";
import { buildGraphProjection, buildSecondHop } from "../src/graph/graph-projection";

const A = "CASES/A.md", B = "EVIDENCE/B.md", H = "HYPOTHESES/H.md";
const L = "LOOPS/L.md", C = "CASES/C.md", C2 = "ARCHIVE/C.md";

const note = (type: string, id: string, fm: string[] = [], body: string[] = []) =>
  ["---", `type: ${type}`, `id: ${id}`, ...fm, "---", "", `# ${id}`, "", ...body, ""].join("\n");

const indices: RDIndex[] = [];
afterEach(() => { for (const i of indices.splice(0)) i.dispose(); });

async function indexWith(entries: Array<[string, string]>): Promise<RDIndex> {
  const adapter = new FakeAdapter();
  for (const [path, content] of entries) adapter.set(path, content, 1000);
  const index = new RDIndex(adapter);
  indices.push(index);
  await index.build();
  return index;
}

const edgeLines = (rows: Array<{ direction: string; predicate: string; otherLabel: string }>) =>
  rows.map((r) => `${r.direction} ${r.predicate} ${r.otherLabel}`);

describe("graph projection — identity & selector (§6, §4)", () => {
  it("identity for all four RD types", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ["status: open"])],
      [B, note("evidence", "EV-B")],
      [H, note("hypothesis", "HYP-H")],
      [L, note("loop", "LOOP-L", ["last_verified: 2026-09-02"])],
    ]);
    const types = new Map<string, string>();
    for (const path of [A, B, H, L]) {
      const p = buildGraphProjection(index, path);
      expect(p.phase).toBe("READY");
      expect(p.selectedObject?.path).toBe(path);
      types.set(path, p.selectedObject!.type);
    }
    expect(Object.fromEntries(types)).toEqual({
      [A]: "case", [B]: "evidence", [H]: "hypothesis", [L]: "loop",
    });
    const pl = buildGraphProjection(index, L);
    expect(pl.selectedObject).toMatchObject({
      id: "LOOP-L", type: "loop", status: "", lastVerified: "2026-09-02", path: L,
    });
    expect(buildGraphProjection(index, null).phase).toBe("NO_OBJECT_SELECTED");
    expect(buildGraphProjection(index, "CASES/gone.md").phase).toBe("NO_SUCH_OBJECT");
    expect(buildGraphProjection(index, "Templates/x.md").phase).toBe("NO_SUCH_OBJECT");
  });
});

describe("graph projection — first hop semantics (§7, §8, §26)", () => {
  it("all six logical predicates render with correct direction and endpoint type", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", [
        'related: "[[B]]"',
        'supports: "[[B]]"',
        'contradicts: "[[B]]"',
      ], ["derived_from: [[C]]", "repeats_in: [[C]]", "observed_in: [[C]]"])],
      [B, note("evidence", "EV-B")],
      [C, note("case", "CASE-C")],
    ]);
    const p = buildGraphProjection(index, A);
    expect(index.relations).toHaveLength(6);
    expect(p.firstHop).toHaveLength(6);
    expect(edgeLines(p.firstHop)).toEqual([
      "outgoing contradicts EV-B",
      "outgoing derived_from CASE-C",
      "outgoing observed_in CASE-C",
      "outgoing related EV-B",
      "outgoing repeats_in CASE-C",
      "outgoing supports EV-B",
    ]);
    const bRow = p.firstHop.find((r) => r.predicate === "supports");
    expect(bRow?.otherType).toBe("evidence");
    const cRow = p.firstHop.find((r) => r.predicate === "repeats_in");
    expect(cRow?.otherType).toBe("case");
  });

  it("incoming relations report the other side with incoming direction", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A")],
      [C, note("case", "CASE-C", ['supports: "[[A]]"'], ["observed_in: [[A]]"])],
      [L, note("loop", "LOOP-L", [], ["repeats_in: [[A]]"])],
    ]);
    const p = buildGraphProjection(index, A);
    expect(p.firstHop).toHaveLength(3);
    expect(edgeLines(p.firstHop)).toEqual([
      "incoming observed_in CASE-C",
      "incoming repeats_in LOOP-L",
      "incoming supports CASE-C",
    ]);
  });

  it("reverse normalizations: supported_by/contradicted_by both directions", async () => {
    // B declares supported_by A → normalized supports A→B
    const index = await indexWith([
      [A, note("case", "CASE-A")],
      [B, note("evidence", "EV-B", ['supported_by: "[[A]]"', 'contradicted_by: "[[A]]"'])],
    ]);
    const pa = buildGraphProjection(index, A);
    expect(edgeLines(pa.firstHop)).toEqual([
      "outgoing contradicts EV-B",
      "outgoing supports EV-B",
    ]);
    const pb = buildGraphProjection(index, B);
    expect(edgeLines(pb.firstHop)).toEqual([
      "incoming contradicts CASE-A",
      "incoming supports CASE-A",
    ]);
  });

  it("mutual declarations normalize to ONE edge with TWO provenance entries (§8, §24)", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'])],
      [B, note("evidence", "EV-B", ['supported_by: "[[A]]"'])],
    ]);
    const p = buildGraphProjection(index, A);
    expect(index.relations).toHaveLength(1);
    expect(p.firstHop).toHaveLength(1);
    expect(p.firstHop[0].predicate).toBe("supports");
    expect(p.firstHop[0].provenance).toHaveLength(2);
    // §24: provenance keeps the DECLARED predicate + declaring path truth
    const prov = p.firstHop[0].provenance.map((x) => `${x.declaredPredicate}@${x.sourcePath}`);
    expect(prov).toEqual(["supports@CASES/A.md", "supported_by@EVIDENCE/B.md"]);
    const raws = p.firstHop[0].provenance.map((x) => x.rawLink);
    expect(raws).toEqual(["B", "A"]);
  });

  it("unresolved identity: E != F distinct; E+E one edge; AMBIGUOUS raw visible", async () => {
    const i1 = await indexWith([
      [A, note("case", "CASE-A", ["supported_by:", '  - "[[E]]"', '  - "[[F]]"'])],
    ]);
    const p1 = buildGraphProjection(i1, A);
    expect(p1.firstHop).toHaveLength(2);
    expect(edgeLines(p1.firstHop)).toEqual(["incoming supports E", "incoming supports F"]);
    expect(p1.firstHop.every((r) => r.resolution === "BROKEN")).toBe(true);

    const i2 = await indexWith([
      [A, note("case", "CASE-A", ["supported_by:", '  - "[[E]]"', '  - "[[E]]"'])],
    ]);
    expect(buildGraphProjection(i2, A).firstHop).toHaveLength(1);

    const i3 = await indexWith([
      [A, note("case", "CASE-A", ['supported_by: "[[C]]"'])],
      [C, note("case", "CASE-C")],
      [C2, note("case", "OTHER-C")],
    ]);
    const p3 = buildGraphProjection(i3, A);
    expect(p3.firstHop).toHaveLength(1);
    expect(p3.firstHop[0].otherLabel).toBe("C");
    expect(p3.firstHop[0].resolution).toBe("AMBIGUOUS");
    expect(p3.firstHop[0].otherType).toBeNull();
  });

  it("same endpoint + different predicate remain distinct edges", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['related: "[[B]]"', 'supports: "[[B]]"', 'contradicts: "[[B]]"'])],
      [B, note("evidence", "EV-B")],
    ]);
    const p = buildGraphProjection(index, A);
    expect(p.firstHop).toHaveLength(3);
    expect(new Set(p.firstHop.map((r) => r.key)).size).toBe(3);
  });

  it("frontmatter/body provenance detail and deterministic order", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'], ["derived_from: [[B]]"])],
      [B, note("evidence", "EV-B")],
    ]);
    const p = buildGraphProjection(index, A);
    const sup = p.firstHop.find((r) => r.predicate === "supports")!;
    expect(sup.provenance[0]).toMatchObject({
      declaredPredicate: "supports",
      sourcePath: A,
      kind: "frontmatter",
      field: "supports",
      line: null,
      rawLink: "B",
    });
    const der = p.firstHop.find((r) => r.predicate === "derived_from")!;
    expect(der.provenance[0]).toMatchObject({
      kind: "body",
      line: 9,
      sourceRevision: expect.any(Number),
    });
    const again = buildGraphProjection(index, A);
    expect(again.firstHop.map((r) => r.key)).toEqual(p.firstHop.map((r) => r.key));
  });

  it("projection purity — index unchanged, deterministic", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'])],
      [B, note("evidence", "EV-B")],
    ]);
    const before = JSON.stringify({ r: index.relations, s: index.snapshot() });
    const p1 = buildGraphProjection(index, A);
    const p2 = buildGraphProjection(index, A);
    expect(p2).toEqual(p1);
    expect(JSON.stringify({ r: index.relations, s: index.snapshot() })).toBe(before);
  });
});

describe("graph projection — second hop (§12-§14)", () => {
  it("second hop shows actual B-edges, excludes root↔B, direction relative to B", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'])],
      [B, note("evidence", "EV-B", [], ["observed_in: [[C]]"]) ],
      [C, note("case", "CASE-C", ['contradicts: "[[B]]"'])],
    ]);
    const second = buildSecondHop(index, B, A);
    expect(second).toHaveLength(2);
    expect(edgeLines(second)).toEqual(["incoming contradicts CASE-C", "outgoing observed_in CASE-C"]);
    // the root↔B relation is NOT repeated
    expect(second.some((r) => r.predicate === "supports" && r.otherLabel === "CASE-A")).toBe(false);
  });

  it("cycle A→B→C→A adds no invented relation", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'])],
      [B, note("evidence", "EV-B", [], ["observed_in: [[C]]"])],
      [C, note("case", "CASE-C", ['related: "[[A]]"'])],
    ]);
    const second = buildSecondHop(index, B, A);
    expect(edgeLines(second)).toEqual(["outgoing observed_in CASE-C"]);
    // First hop keeps ONLY the two actual direct relations (supports B,
    // related C). No transitive composition such as A observed_in C.
    const first = buildGraphProjection(index, A).firstHop;
    expect(edgeLines(first).sort()).toEqual(["incoming related CASE-C", "outgoing supports EV-B"]);
    expect(first.some((r) => r.otherPath === C && r.predicate === "observed_in")).toBe(false);
    expect(first.some((r) => r.otherPath === C && r.predicate === "supports")).toBe(false);
  });

  it("two actual B-C predicates stay two rows; other-root relations excluded per-branch", async () => {
    const index = await indexWith([
      [A, note("case", "CASE-A", ['supports: "[[B]]"'])],
      [B, note("evidence", "EV-B", [], ["observed_in: [[C]]"])],
      [C, note("case", "CASE-C", [], ["repeats_in: [[B]]"])],
    ]);
    const second = buildSecondHop(index, B, A);
    expect(second).toHaveLength(2);
    expect(edgeLines(second)).toEqual(["outgoing observed_in CASE-C", "incoming repeats_in CASE-C"]);
  });
});
