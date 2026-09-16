import { beforeEach, describe, expect, it } from "vitest";
import { RDIndex } from "../src/index/rd-index";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";

function seededAdapter(): FakeAdapter {
  const a = new FakeAdapter();
  a.set(
    "CASES/CASE-0001.md",
    fixtureNote({
      path: "CASES/CASE-0001.md",
      type: "case",
      id: "CASE-0001",
      status: "active",
      frontmatterExtra: ['supports: "[[EVIDENCE-021]]"', 'contradicts: "[[HYPOTHESIS-003]]"'],
      body: "derived_from: [[EVIDENCE-032]]",
    }),
  );
  a.set(
    "EVIDENCE/EVIDENCE-021.md",
    fixtureNote({ path: "EVIDENCE/EVIDENCE-021.md", type: "evidence", id: "EVIDENCE-021" }),
  );
  a.set(
    "EVIDENCE/EVIDENCE-032.md",
    fixtureNote({ path: "EVIDENCE/EVIDENCE-032.md", type: "evidence", id: "EVIDENCE-032" }),
  );
  a.set(
    "HYPOTHESES/HYPOTHESIS-003.md",
    fixtureNote({ path: "HYPOTHESES/HYPOTHESIS-003.md", type: "hypothesis", id: "HYPOTHESIS-003" }),
  );
  a.set(
    "LOOPS/LOOP-031.md",
    fixtureNote({ path: "LOOPS/LOOP-031.md", type: "loop", id: "LOOP-031" }),
  );
  // out-of-scope noise that must never be read
  a.set("00_HOME/Home.md", "---\ntype: home\n---\n");
  a.set(".astra/audit/x.jsonl", "{}");
  return a;
}

describe("index lifecycle", () => {
  let adapter: FakeAdapter;
  let index: RDIndex;

  beforeEach(async () => {
    adapter = seededAdapter();
    index = new RDIndex(adapter);
    await index.build();
  });

  it("initial build indexes only in-scope candidates", () => {
    const { objects, pathsById } = index.snapshot();
    expect(objects.length).toBe(5);
    expect(pathsById.get("CASE-0001")).toEqual(["CASES/CASE-0001.md"]);
    expect(index.state).toBe("READY");
    expect(adapter.readsOf("00_HOME/Home.md")).toBe(0);
  });

  it("candidate resolution links relations", () => {
    const rels = index.relations;
    expect(rels.some((r) => r.predicate === "supports" && r.targetId === "EVIDENCE-021")).toBe(true);
    expect(rels.some((r) => r.predicate === "derived_from" && r.targetId === "EVIDENCE-032")).toBe(true);
  });

  it("create adds an object", async () => {
    adapter.set(
      "CASES/CASE-0003.md",
      fixtureNote({ path: "CASES/CASE-0003.md", type: "case", id: "CASE-0003" }),
    );
    await index.applyChange("CASES/CASE-0003.md", "create");
    expect(index.snapshot().objects.length).toBe(6);
  });

  it("modify updates content without full rescan", async () => {
    const readsBefore = adapter.reads;
    adapter.set(
      "CASES/CASE-0001.md",
      fixtureNote({
        path: "CASES/CASE-0001.md",
        type: "case",
        id: "CASE-0001",
        body: "observed_in: [[LOOP-031]]",
      }),
      2000,
    );
    await index.applyChange("CASES/CASE-0001.md", "modify");
    expect(index.relations.some((r) => r.predicate === "observed_in")).toBe(true);
    const reread = adapter.reads - readsBefore;
    expect(reread).toBeLessThanOrEqual(2); // self + maybe one dependent; never 5+
    expect(reread).toBe(1);
  });

  it("rename follows path and updates pathsById", async () => {
    adapter.set(
      "CASES/CASE-0001.md",
      fixtureNote({ path: "CASES/CASE-0001.md", type: "case", id: "CASE-0001" }),
    );
    adapter.moveFile("CASES/CASE-0001.md", "ARCHIVE/CASE-0001.md");
    await index.applyRename("CASES/CASE-0001.md", "ARCHIVE/CASE-0001.md");
    const { objects, pathsById } = index.snapshot();
    expect(objects.length).toBe(5);
    expect(pathsById.get("CASE-0001")).toEqual(["ARCHIVE/CASE-0001.md"]);
    expect(index.objectAt("ARCHIVE/CASE-0001.md")?.type).toBe("case");
  });

  it("delete removes object", async () => {
    adapter.dropFile("EVIDENCE/EVIDENCE-021.md");
    await index.applyDelete("EVIDENCE/EVIDENCE-021.md");
    expect(index.snapshot().objects.length).toBe(4);
    expect(index.relations.some((r) => r.targetId === "EVIDENCE-021" && r.targetResolution === "RESOLVED")).toBe(false);
  });

  it("single modify does not reread the whole fixture vault", async () => {
    const before = { ...Object.fromEntries(adapter.readsByPath) };
    adapter.set(
      "LOOPS/LOOP-031.md",
      fixtureNote({ path: "LOOPS/LOOP-031.md", type: "loop", id: "LOOP-031", body: "repeats_in: [[CASE-0001]]" }),
      3000,
    );
    await index.applyChange("LOOPS/LOOP-031.md", "modify");
    const untouched =
      before["EVIDENCE/EVIDENCE-021.md"] === adapter.readsOf("EVIDENCE/EVIDENCE-021.md") &&
      before["HYPOTHESES/HYPOTHESIS-003.md"] === adapter.readsOf("HYPOTHESES/HYPOTHESIS-003.md");
    expect(untouched).toBe(true);
  });

  it("dispose during in-flight read discards stale data", async () => {
    const slow = new FakeAdapter();
    slow.set("CASES/CASE-0009.md", fixtureNote({ path: "CASES/CASE-0009.md", type: "case", id: "CASE-0009" }));
    const slowIndex = new RDIndex({
      list: () => ["CASES/CASE-0009.md"],
      read: (path) =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve(slow.readSync(path)), 30);
        }),
      mtime: () => 1,
    });
    const building = slowIndex.build();
    slowIndex.dispose();
    await building;
    expect(slowIndex.snapshot().objects.length).toBe(0);
  });

  it("duplicate ids keep one-to-many mapping", async () => {
    adapter.set(
      "ARCHIVE/CASE-0001.md",
      fixtureNote({ path: "ARCHIVE/CASE-0001.md", type: "case", id: "CASE-0001" }),
    );
    await index.applyChange("ARCHIVE/CASE-0001.md", "create");
    const { pathsById } = index.snapshot();
    expect((pathsById.get("CASE-0001") ?? []).sort()).toEqual([
      "ARCHIVE/CASE-0001.md",
      "CASES/CASE-0001.md",
    ]);
  });

  it("initial indexing + concurrent modify settles on latest content", async () => {
    const a = new FakeAdapter();
    a.set("CASES/CASE-0005.md", fixtureNote({ path: "CASES/CASE-0005.md", type: "case", id: "CASE-0005", status: "active" }));
    const ix = new RDIndex(a);
    const buildPromise = ix.build();
    a.set(
      "CASES/CASE-0005.md",
      fixtureNote({ path: "CASES/CASE-0005.md", type: "case", id: "CASE-0005", status: "closed" }),
      2000,
    );
    await buildPromise;
    await ix.applyChange("CASES/CASE-0005.md", "modify");
    expect(ix.objectAt("CASES/CASE-0005.md")?.status).toBe("closed");
  });
});
