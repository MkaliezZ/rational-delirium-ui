import { afterEach, describe, expect, it } from "vitest";
import { RDIndex } from "../src/index/rd-index";
import { FakeAdapter } from "./support/fake-adapter";
import { buildLoopProjection } from "../src/loop/loop-projection";

const L = "LOOPS/L.md", A = "CASES/A.md", B = "EVIDENCE/B.md";
const H = "HYPOTHESES/H.md", L2 = "LOOPS/L2.md";
const E1 = "EVIDENCE/C.md", E2 = "ARCHIVE/C.md";

/** repeats_in / observed_in / derived_from are BODY predicates;
 * related / supports / supported_by / contradicts / contradicted_by
 * are frontmatter predicates (frozen v0.4 model). */
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

describe("loop projection — identity & selector (§6, §4)", () => {
  it("projects the selected LOOP identity with canonical fields only", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", ["status: open", "last_verified: 2026-09-01"])],
      [L2, note("loop", "LOOP-2")],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.phase).toBe("READY");
    expect(p.selectedLoop).toEqual({
      path: L, id: "LOOP-1", title: "LOOP-1", status: "open",
      lastVerified: "2026-09-01",
    });
    expect(Object.keys(p.selectedLoop!).sort())
      .toEqual(["id", "lastVerified", "path", "status", "title"]);
    expect(p.loops.map((x) => x.id)).toEqual(["LOOP-1", "LOOP-2"]);
  });

  it("no selection → selector phase; vanished/non-loop selection → NO_SUCH_LOOP", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1")],
      [A, note("case", "CASE-1")],
    ]);
    expect(buildLoopProjection(index, null).phase).toBe("NO_LOOP_SELECTED");
    expect(buildLoopProjection(index, "LOOPS/gone.md").phase).toBe("NO_SUCH_LOOP");
    expect(buildLoopProjection(index, A).phase).toBe("NO_SUCH_LOOP");
  });
});

describe("loop projection — relation direction (§12, §22)", () => {
  it("outgoing and incoming repeats_in / observed_in all surface with correct other side", async () => {
    const index = await indexWith([
      // outgoing: L's body declares repeats_in CASE, observed_in EVIDENCE
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[A]]", "observed_in: [[B]]"])],
      [B, note("evidence", "EV-1")],
      // incoming: CASE's body declares repeats_in L; HYPOTHESIS declares observed_in L
      [A, note("case", "CASE-1", [], ["repeats_in: [[L]]"])],
      [H, note("hypothesis", "HYP-1", [], ["observed_in: [[L]]"])],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.recurrences).toHaveLength(4);
    const lines = p.recurrences.map((r) => `${r.direction} ${r.predicate} ${r.otherLabel}`);
    expect(lines).toContain("outgoing repeats_in CASE-1");
    expect(lines).toContain("outgoing observed_in EV-1");
    expect(lines).toContain("incoming repeats_in CASE-1");
    expect(lines).toContain("incoming observed_in HYP-1");
    for (const r of p.recurrences) {
      expect(r.resolution).toBe("RESOLVED");
      expect(r.otherPath).not.toBeNull();
    }
  });

  it("incoming reverse predicate (supported_by) surfaces the declarer correctly", async () => {
    const index = await indexWith([
      // EVIDENCE declares supported_by L → normalized supports L→EVIDENCE (loop as SOURCE)
      [B, note("evidence", "EV-1", ['supported_by: "[[L]]"'])],
      [L, note("loop", "LOOP-1")],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.evidence).toHaveLength(1);
    expect(p.evidence[0].otherLabel).toBe("EV-1");
    expect(p.evidence[0].direction).toBe("outgoing");
    expect(p.evidence[0].predicate).toBe("supports");
  });
});

describe("loop projection — classification (§22)", () => {
  it("classifies CASE / EVIDENCE / HYPOTHESIS endpoints from resolved objects", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [
        'related: "[[A]]"',
        'supports: "[[B]]"',
        'contradicted_by: "[[H]]"',
      ])],
      [A, note("case", "CASE-1")],
      [B, note("evidence", "EV-1")],
      [H, note("hypothesis", "HYP-1")],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.cases.map((r) => r.otherLabel)).toEqual(["CASE-1"]);
    expect(p.evidence.map((r) => r.otherLabel)).toEqual(["EV-1"]);
    expect(p.hypotheses.map((r) => r.otherLabel)).toEqual(["HYP-1"]);
    // related/supports/contradicts are not recurrence predicates
    expect(p.recurrences).toHaveLength(0);
  });

  it("unresolved endpoints are never typed into object sections", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[E]]", "repeats_in: [[F]]"])],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.recurrences).toHaveLength(2);
    expect(p.cases).toHaveLength(0);
    expect(p.evidence).toHaveLength(0);
    expect(p.hypotheses).toHaveLength(0);
  });
});

describe("loop projection — unresolved identity (§14)", () => {
  it("missing E and F stay distinct with raw labels", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[E]]", "repeats_in: [[F]]"])],
    ]);
    const p = buildLoopProjection(index, L);
    const labels = p.recurrences.map((r) => r.otherLabel);
    expect(labels).toEqual(["E", "F"]);
    expect(p.recurrences.every((r) => r.resolution === "BROKEN")).toBe(true);
    expect(p.recurrences[0].key).not.toBe(p.recurrences[1].key);
  });

  it("duplicate E+E declarations collapse to one logical row", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[E]]", "repeats_in: [[E]]"])],
    ]);
    const p = buildLoopProjection(index, L);
    expect(index.relations).toHaveLength(1);
    expect(p.recurrences).toHaveLength(1);
  });

  it("AMBIGUOUS raw label stays visible", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[C]]"])],
      [E1, note("evidence", "EV-C")],
      [E2, note("evidence", "OTHER-C")],
    ]);
    const p = buildLoopProjection(index, L);
    expect(p.recurrences).toHaveLength(1);
    expect(p.recurrences[0].otherLabel).toBe("C");
    expect(p.recurrences[0].resolution).toBe("AMBIGUOUS");
    // ambiguous endpoint is not typed as evidence despite candidates
    expect(p.evidence).toHaveLength(0);
  });
});

describe("loop projection — purity (§11)", () => {
  it("does not mutate index state and is deterministic", async () => {
    const index = await indexWith([
      [L, note("loop", "LOOP-1", [], ["repeats_in: [[A]]", "repeats_in: [[E]]"])],
      [A, note("case", "CASE-1")],
    ]);
    const before = JSON.stringify({ relations: index.relations, snapshot: index.snapshot() });
    const p1 = buildLoopProjection(index, L);
    const p2 = buildLoopProjection(index, L);
    expect(p2).toEqual(p1);
    expect(JSON.stringify({ relations: index.relations, snapshot: index.snapshot() })).toBe(before);
  });
});
