import { afterEach, describe, expect, it } from "vitest";
import { RDIndex } from "../src/index/rd-index";
import { FakeAdapter } from "./support/fake-adapter";
import {
  buildInvestigationProjection,
  RECENT_LIMIT,
} from "../src/investigation/investigation-projection";

const A = "CASES/A.md", B = "EVIDENCE/B.md", Amb = "CASES/Amb.md";
const C1 = "EVIDENCE/C.md", C2 = "ARCHIVE/C.md";

const note = (type: string, id: string | undefined, extra: string[] = [], body = "") =>
  [
    "---",
    `type: ${type}`,
    ...(id !== undefined ? [`id: ${id}`] : []),
    ...extra,
    "---",
    "",
    `# ${id ?? type} — fixture`,
    "",
    body,
  ].join("\n");

const reverseNote = (predicate: string, targets: string[]) =>
  note("case", "ACTUAL-A", [predicate + ":", ...targets.map((t) => `  - "[[${t}]]"`)]);

const indices: RDIndex[] = [];
afterEach(() => { for (const i of indices.splice(0)) i.dispose(); });

async function indexWith(entries: Array<[string, string]>, mtimes?: Map<string, number>): Promise<RDIndex> {
  const adapter = new FakeAdapter();
  for (const [path, content] of entries) {
    adapter.set(path, content, mtimes?.get(path) ?? 1000);
  }
  const index = new RDIndex(adapter);
  indices.push(index);
  await index.build();
  return index;
}

describe("investigation projection — knowledge counts (§20)", () => {
  it("counts the four canonical object types", async () => {
    const index = await indexWith([
      ["CASES/A.md", note("case", "A1")],
      ["CASES/A2.md", note("case", "A2")],
      ["EVIDENCE/B.md", note("evidence", "B1")],
      ["HYPOTHESES/H.md", note("hypothesis", "H1")],
      ["LOOPS/L.md", note("loop", "L1")],
    ]);
    const p = buildInvestigationProjection(index);
    expect(p.counts).toMatchObject({
      case: 2, evidence: 1, hypothesis: 1, loop: 1,
    });
  });

  it("ARCHIVE is not a fifth object type (archived objects count under their canonical type)", async () => {
    const index = await indexWith([
      ["CASES/A.md", note("case", "A1")],
      ["ARCHIVE/C.md", note("evidence", "C-ARCHIVED", ["status: archived"])],
    ]);
    const p = buildInvestigationProjection(index);
    expect(p.counts).toEqual({
      case: 1, evidence: 1, hypothesis: 0, loop: 0,
      broken: 0, ambiguous: 0, contradiction: 0,
    });
    expect(Object.keys(p.counts).sort()).toEqual(
      ["ambiguous", "broken", "case", "contradiction", "evidence", "hypothesis", "loop"],
    );
  });
});

describe("investigation projection — attention (§21, §22, §23)", () => {
  it("BROKEN, AMBIGUOUS and contradiction relations all appear", async () => {
    const index = await indexWith([
      [A, note("case", "ACTUAL-A", [
        "supported_by:",
        '  - "[[E]]"',
        "contradicted_by:",
        '  - "[[B]]"',
      ])],
      [B, note("evidence", "ACTUAL-B")],
      [Amb, note("case", "ACTUAL-AMB", ['supported_by: "[[C]]"'])],
      [C1, note("evidence", "ACTUAL-C")],
      [C2, note("evidence", "OTHER-C")],
    ]);
    const p = buildInvestigationProjection(index);
    expect(p.counts.broken).toBe(1);
    expect(p.counts.ambiguous).toBe(1);
    expect(p.counts.contradiction).toBe(1);
    const signature = (i: { isContradiction: boolean; resolution: string }) =>
      (i.isContradiction ? "CONTRADICTION+" : "+") + i.resolution;
    expect(p.attention.map(signature).sort()).toEqual([
      "+AMBIGUOUS", "+BROKEN", "CONTRADICTION+RESOLVED",
    ]);
  });

  it("contradiction attention shows even when both endpoints are RESOLVED", async () => {
    const index = await indexWith([
      [A, note("case", "ACTUAL-A", ['contradicted_by: "[[B]]"'])],
      [B, note("evidence", "ACTUAL-B")],
    ]);
    const p = buildInvestigationProjection(index);
    expect(p.counts.contradiction).toBe(1);
    expect(p.counts.broken).toBe(0);
    const item = p.attention.find((i) => i.isContradiction);
    expect(item).toBeDefined();
    expect(item?.resolution).toBe("RESOLVED");
    // contradicted_by swaps endpoints: the declarer (case A) is the
    // logical target of the normalized contradicts relation.
    expect(item).toMatchObject({
      sourceLabel: "ACTUAL-B",
      targetLabel: "ACTUAL-A",
      targetPath: A,
      targetResolution: "RESOLVED",
    });
  });

  it("mandatory RD-05/RA-01 regression: missing E and F stay distinct with raw labels (§22)", async () => {
    const index = await indexWith([
      [A, reverseNote("supported_by", ["E", "F"])],
    ]);
    const p = buildInvestigationProjection(index);
    const broken = p.attention.filter(
      (i) => !i.isContradiction && i.resolution === "BROKEN",
    );
    expect(broken).toHaveLength(2);
    const labels = broken.map((i) => `${i.sourceLabel} ${i.predicate} ${i.targetLabel}`);
    expect(labels).toContain("E supports ACTUAL-A");
    expect(labels).toContain("F supports ACTUAL-A");
    // no blank labels, no merged item
    for (const item of broken) {
      expect(item.sourceLabel.trim().length).toBeGreaterThan(0);
      expect(item.targetLabel.trim().length).toBeGreaterThan(0);
    }
    expect(broken[0].key).not.toBe(broken[1].key);
  });

  it("duplicate equivalent provenance collapses to ONE logical attention item (§23)", async () => {
    const index = await indexWith([
      [A, reverseNote("supported_by", ["E", "E"])],
    ]);
    const index2 = await indexWith([
      [A, reverseNote("supported_by", ["E"])],
    ]);
    const p = buildInvestigationProjection(index);
    const p2 = buildInvestigationProjection(index2);
    expect(index.relations).toHaveLength(1);
    expect(p.attention).toHaveLength(1);
    // the dedup'd item is identical to the single-declaration case
    expect(p.attention[0].key).toBe(p2.attention[0].key);
    expect(p.counts.broken).toBe(1);
  });

  it("counts logical relations, not raw declarations (§9)", async () => {
    const index = await indexWith([
      [A, note("case", "ACTUAL-A", [
        "supported_by:",
        '  - "[[E]]"',
        '  - "[[E]]"',
        "contradicted_by:",
        '  - "[[E]]"',
      ])],
    ]);
    const p = buildInvestigationProjection(index);
    // two logical relations (supports E→A broken, contradicts E→A broken+contradiction)
    expect(p.counts.broken).toBe(2);
    expect(p.counts.contradiction).toBe(1);
    expect(p.attention).toHaveLength(2);
  });
});

describe("investigation projection — cases and recent (§8, §24)", () => {
  it("cases are ordered most recently modified first", async () => {
    const mtimes = new Map([["CASES/new.md", 3000], ["CASES/old.md", 1000], ["CASES/mid.md", 2000]]);
    const index = await indexWith([
      ["CASES/old.md", note("case", "OLD")],
      ["CASES/mid.md", note("case", "MID")],
      ["CASES/new.md", note("case", "NEW")],
    ], mtimes);
    const p = buildInvestigationProjection(index);
    expect(p.cases.map((c) => c.id)).toEqual(["NEW", "MID", "OLD"]);
  });

  it("case rows carry only frozen-model fields", async () => {
    const index = await indexWith([
      [A, reverseNote("supported_by", ["E"])],
      [B, note("evidence", "ACTUAL-B")],
    ]);
    const p = buildInvestigationProjection(index);
    const row = p.cases[0];
    expect(row).toMatchObject({
      path: A, id: "ACTUAL-A", status: "", mtime: 1000,
      relations: { resolved: 0, unresolved: 1, contradiction: 0 },
    });
    expect(Object.keys(row).sort()).toEqual(
      ["id", "mtime", "path", "relations", "status", "title"],
    );
  });

  it("recent: mtime descending, limit respected, deterministic", async () => {
    const entries: Array<[string, string]> = [];
    const mtimes = new Map<string, number>();
    for (let i = 0; i < RECENT_LIMIT + 3; i++) {
      const path = `EVIDENCE/E${String(i).padStart(2, "0")}.md`;
      entries.push([path, note("evidence", `E${i}`)]);
      mtimes.set(path, 100 + i); // E14 newest … E00 oldest; E02..E00 fall off
    }
    const index = await indexWith(entries, mtimes);
    const p1 = buildInvestigationProjection(index);
    const p2 = buildInvestigationProjection(index);
    expect(p1.recent).toHaveLength(RECENT_LIMIT);
    expect(p2.recent).toEqual(p1.recent); // stable
    expect(p1.recent[0].id).toBe("E14");
    expect(p1.recent[RECENT_LIMIT - 1].id).toBe("E3");
    const mtimesList = p1.recent.map((r) => r.mtime);
    expect([...mtimesList].sort((a, b) => b - a)).toEqual(mtimesList);
  });
});

describe("investigation projection — purity (§14)", () => {
  it("does not mutate index state", async () => {
    const index = await indexWith([
      [A, reverseNote("supported_by", ["E", "F"])],
      [B, note("evidence", "ACTUAL-B")],
    ]);
    const before = JSON.stringify({
      relations: index.relations,
      snapshot: index.snapshot(),
    });
    buildInvestigationProjection(index);
    buildInvestigationProjection(index);
    expect(JSON.stringify({ relations: index.relations, snapshot: index.snapshot() })).toBe(before);
  });
});
