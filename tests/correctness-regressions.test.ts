import { describe, expect, it, vi } from "vitest";
import { PendingPathScheduler } from "../src/index/update-scheduler";
import { RDIndex } from "../src/index/rd-index";
import { ContextController } from "../src/context/context-controller";
import { parseFrontmatter, splitFrontmatter } from "../src/parsers/frontmatter-parser";
import { extractBodyRelations } from "../src/parsers/body-relations";
import { normalizeAssertion, normalizeRelations } from "../src/index/relation-normalizer";
import { buildProjection } from "../src/context/context-projection";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import type { RDRelation, RDRelationAssertion } from "../src/model";
import { frontmatterLocation } from "../src/parsers/source-location";
import { parseWikilink } from "../src/parsers/link-reference";

// ---------- RD-02: multi-path scheduler ----------

describe("RD-02 multi-path scheduler", () => {
  it("processes both A and B in a single burst", () => {
    const processed: string[] = [];
    const sch = new PendingPathScheduler((p) => { processed.push(p); }, 10, 50);
    sch.schedule("CASES/A.md");
    sch.schedule("CASES/B.md");
    sch.flush();
    expect(processed.sort()).toEqual(["CASES/A.md", "CASES/B.md"]);
  });

  it("same-path burst processes once", () => {
    const processed: string[] = [];
    const sch = new PendingPathScheduler((p) => { processed.push(p); }, 10, 50);
    sch.schedule("CASES/A.md");
    sch.schedule("CASES/A.md");
    sch.schedule("CASES/A.md");
    sch.flush();
    expect(processed.filter((p) => p === "CASES/A.md").length).toBe(1);
  });

  it("dispose cancels pending paths and timers", () => {
    const processed: string[] = [];
    const sch = new PendingPathScheduler((p) => { processed.push(p); }, 10, 50);
    sch.schedule("CASES/A.md");
    sch.dispose();
    sch.flush();
    expect(processed).toEqual([]);
    expect(sch.pendingPaths).toEqual([]);
  });
});

// ---------- RD-03: per-path read generation + tombstones ----------

function deferredRead<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("RD-03 per-path read generation", () => {
  it("NEW read wins when OLD returns first", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "active" }));
    const gates: Array<{ resolve: (v: string) => void }> = [];
    const index = new RDIndex({
      list: () => ["CASES/C.md"],
      read: () => {
        const d = deferredRead<string>();
        gates.push(d);
        return d.promise;
      },
      mtime: () => 1,
    });
    const build = index.build();
    // initial read
    await vi.waitFor(() => expect(gates.length).toBe(1));
    // issue a modify read (new generation) while initial is pending
    const modify = index.applyChange("CASES/C.md", "modify");
    await vi.waitFor(() => expect(gates.length).toBe(2));
    // OLD returns first with WRONG content
    gates[0].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "stale-old" }));
    // NEW returns second with correct content
    gates[1].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "fresh-new" }));
    await Promise.all([build, modify]);
    expect(index.objectAt("CASES/C.md")?.status).toBe("fresh-new");
  });

  it("NEW remains when OLD returns after NEW", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "active" }));
    const gates: Array<{ resolve: (v: string) => void }> = [];
    const index = new RDIndex({
      list: () => ["CASES/C.md"],
      read: () => { const d = deferredRead<string>(); gates.push(d); return d.promise; },
      mtime: () => 1,
    });
    const build = index.build();
    await vi.waitFor(() => expect(gates.length).toBe(1));
    const modify = index.applyChange("CASES/C.md", "modify");
    await vi.waitFor(() => expect(gates.length).toBe(2));
    // NEW returns first
    gates[1].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "newest" }));
    // OLD returns late — must NOT overwrite
    gates[0].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C", status: "oldest" }));
    await Promise.all([build, modify]);
    expect(index.objectAt("CASES/C.md")?.status).toBe("newest");
  });

  it("delete during read discards pending read (no resurrection)", async () => {
    const gates: Array<{ resolve: (v: string) => void }> = [];
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({ path: "CASES/C.md", type: "case", id: "C" }));
    const index = new RDIndex({
      list: () => ["CASES/C.md"],
      read: (p) => { const d = deferredRead<string>(); gates.push(d); return d.promise; },
      mtime: () => 1,
    });
    const build = index.build();
    await vi.waitFor(() => expect(gates.length).toBe(1));
    const del = index.applyDelete("CASES/C.md");
    gates[0].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C" }));
    await Promise.all([build, del]);
    expect(index.objectAt("CASES/C.md")).toBeNull();
    expect(index.isTombstoned("CASES/C.md")).toBe(true);
  });

  it("rename during read: old path pending read discarded", async () => {
    const gates: Array<{ resolve: (v: string) => void }> = [];
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({ path: "CASES/C.md", type: "case", id: "C" }));
    const index = new RDIndex({
      list: () => ["CASES/C.md"],
      read: (p) => { const d = deferredRead<string>(); gates.push(d); return d.promise; },
      mtime: () => 1,
    });
    const build = index.build();
    await vi.waitFor(() => expect(gates.length).toBe(1));
    a.moveFile("CASES/C.md", "ARCHIVE/C.md");
    a.set("ARCHIVE/C.md", fixtureNote({ path: "ARCHIVE/C.md", type: "case", id: "C" }));
    const ren = index.applyRename("CASES/C.md", "ARCHIVE/C.md");
    // old-path read returns late — must not reinsert
    gates[0].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C" }));
    // new-path read resolves too
    await vi.waitFor(() => expect(gates.length).toBeGreaterThanOrEqual(2));
    for (let i = 1; i < gates.length; i++) {
      gates[i].resolve(fixtureNote({ path: "ARCHIVE/C.md", type: "case", id: "C" }));
    }
    await Promise.all([build, ren]);
    expect(index.objectAt("CASES/C.md")).toBeNull();
  });

  it("unload during read discards everything", async () => {
    const gates: Array<{ resolve: (v: string) => void }> = [];
    const index = new RDIndex({
      list: () => ["CASES/C.md"],
      read: () => { const d = deferredRead<string>(); gates.push(d); return d.promise; },
      mtime: () => 1,
    });
    const build = index.build();
    await vi.waitFor(() => expect(gates.length).toBe(1));
    index.dispose();
    gates[0].resolve(fixtureNote({ path: "CASES/C.md", type: "case", id: "C" }));
    await build;
    expect(index.snapshot().objects.length).toBe(0);
  });
});

// ---------- RD-05/09: relation endpoint identity ----------

describe("RD-05/09 relation endpoint identity", () => {
  const CANDIDATES = ["EVIDENCE/named.md", "CASES/CASE-0001.md"];
  const ID_MAP = new Map([["EVIDENCE/named.md", "EVIDENCE-901"]]);

  function makeAssertion(predicate: string, target: string): RDRelationAssertion {
    return {
      predicate: predicate as never,
      link: parseWikilink(target) as never,
      location: frontmatterLocation("CASES/CASE-0001.md", predicate, 1),
    };
  }

  it("resolved endpoint carries path AND real object ID (basename ≠ ID)", () => {
    const n = normalizeAssertion(
      "CASES/CASE-0001.md", "CASE-0001",
      makeAssertion("supports", "named"), CANDIDATES, ID_MAP,
    );
    expect(n.targetPaths).toEqual(["EVIDENCE/named.md"]);
    expect(n.targetId).toBe("EVIDENCE-901");
    expect(n.targetId).not.toBe("named");
  });

  it("duplicate ID across paths: link pointing to exact path keeps that path", () => {
    const cands = ["EVIDENCE/E.md", "ARCHIVE/E.md"];
    const ids = new Map([["EVIDENCE/E.md", "E"], ["ARCHIVE/E.md", "E"]]);
    const n = normalizeAssertion(
      "CASES/CASE-0001.md", "CASE-0001",
      makeAssertion("supports", "EVIDENCE/E"), cands, ids,
    );
    expect(n.targetPaths).toEqual(["EVIDENCE/E.md"]);
  });

  it("bare filename with duplicate ID is AMBIGUOUS", () => {
    const cands = ["EVIDENCE/E.md", "ARCHIVE/E.md"];
    const ids = new Map([["EVIDENCE/E.md", "E"], ["ARCHIVE/E.md", "E"]]);
    const n = normalizeAssertion(
      "CASES/CASE-0001.md", "CASE-0001",
      makeAssertion("supports", "E"), cands, ids,
    );
    expect(n.targetResolution).toBe("AMBIGUOUS");
  });

  it("A related B + B related A merge to one symmetric relation with 2 assertions", () => {
    const a = normalizeAssertion("CASES/A.md", "A", makeAssertion("related", "B"), ["CASES/B.md"], new Map([["CASES/B.md", "B"]]));
    const b = normalizeAssertion("CASES/B.md", "B", makeAssertion("related", "A"), ["CASES/A.md"], new Map([["CASES/A.md", "A"]]));
    const rels = normalizeRelations([a, b]);
    expect(rels.length).toBe(1);
    expect(rels[0].assertions.length).toBe(2);
  });

  it("A supports B + B supports A remain two directional relations", () => {
    const a = normalizeAssertion("CASES/A.md", "A", makeAssertion("supports", "B"), ["CASES/B.md"], new Map([["CASES/B.md", "B"]]));
    const b = normalizeAssertion("CASES/B.md", "B", makeAssertion("supports", "A"), ["CASES/A.md"], new Map([["CASES/A.md", "A"]]));
    const rels = normalizeRelations([a, b]);
    expect(rels.length).toBe(2);
  });
});

// ---------- RD-06: typed context projection ----------

describe("RD-06 typed context projection", () => {
  it("CASE supports HYPOTHESIS goes to Related Hypotheses, not Related Evidence", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C1.md", fixtureNote({
      path: "CASES/C1.md", type: "case", id: "C1",
      frontmatterExtra: ['supports: "[[H1]]"'],
    }));
    a.set("HYPOTHESES/H1.md", fixtureNote({ path: "HYPOTHESES/H1.md", type: "hypothesis", id: "H1" }));
    const index = new RDIndex(a);
    await index.build();
    const obj = index.objectAt("CASES/C1.md");
    expect(obj).not.toBeNull();
    const { outgoing } = index.relationsFor("CASES/C1.md");
    const proj = buildProjection(obj!, outgoing, [], "READY", "FOLLOW", index, "CASES/C1.md");
    const hyp = proj.sections.find((s) => s.title === "Related Hypotheses");
    const ev = proj.sections.find((s) => s.title === "Related Evidence");
    expect(hyp?.rows.length).toBe(1);
    expect(ev?.rows.length ?? 0).toBe(0);
  });

  it("unresolved target goes to Unresolved section", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C2.md", fixtureNote({
      path: "CASES/C2.md", type: "case", id: "C2",
      frontmatterExtra: ['supports: "[[GHOST]]"'],
    }));
    const index = new RDIndex(a);
    await index.build();
    const obj = index.objectAt("CASES/C2.md")!;
    const { outgoing } = index.relationsFor("CASES/C2.md");
    const proj = buildProjection(obj, outgoing, [], "READY", "FOLLOW", index, "CASES/C2.md");
    const unresolved = proj.sections.find((s) => s.key === "unresolved");
    expect(unresolved?.rows.length).toBe(1);
  });
});

// ---------- RD-07: inline exclusion ----------

describe("RD-07 body relation inline exclusion", () => {
  const REL = (body: string) => extractBodyRelations(body, "CASES/C.md", 1);

  it("rejects single-line inline code wrapped declaration", () => {
    expect(REL("`derived_from: [[X]]`\n").assertions.length).toBe(0);
  });

  it("rejects multiline backtick inline code", () => {
    expect(REL("`\nderived_from: [[X]]\n`\n").assertions.length).toBe(0);
  });

  it("rejects double-backtick multiline inline code", () => {
    expect(REL("``\nderived_from: [[X]]\n``\n").assertions.length).toBe(0);
  });

  it("rejects emphasis multiline", () => {
    expect(REL("*derived_from: [[X]]\nstill emphasis*\n").assertions.length).toBe(0);
  });

  it("rejects strong", () => {
    expect(REL("**derived_from: [[X]]**\n").assertions.length).toBe(0);
  });

  it("accepts legal whole-line controls", () => {
    expect(REL("derived_from: [[X]]\n").assertions.length).toBe(1);
    expect(REL("repeats_in: [[Y]]\n").assertions.length).toBe(1);
    expect(REL("observed_in: [[Z]]\n").assertions.length).toBe(1);
  });

  it("rejects leading and trailing prose", () => {
    expect(REL("example derived_from: [[X]]\n").assertions.length).toBe(0);
    expect(REL("derived_from: [[X]] extra\n").assertions.length).toBe(0);
  });

  it("rejects inline HTML", () => {
    expect(REL("<span>derived_from: [[X]]</span>\n").assertions.length).toBe(0);
  });
});

// ---------- RD-08/12: frontmatter fence + strictness ----------

describe("RD-08/12 frontmatter strictness", () => {
  it("rejects ---not-a-delimiter as opening", () => {
    expect(splitFrontmatter("---not-a-delimiter\ntype: case\n---\n")).toBeNull();
  });

  it("rejects ---- as delimiter", () => {
    expect(splitFrontmatter("----\ntype: case\n---\n")).toBeNull();
  });

  it("rejects --- trailing text", () => {
    expect(splitFrontmatter("--- trailing\ntype: case\n---\n")).toBeNull();
  });

  it("accepts strict --- delimiters with LF and CRLF", () => {
    expect(splitFrontmatter("---\ntype: case\n---\n")).not.toBeNull();
    expect(splitFrontmatter("---\r\ntype: case\r\n---\r\n")).not.toBeNull();
  });

  it("accepts UTF-8 BOM + ---", () => {
    const bom = "\uFEFF---\ntype: case\nid: X\n---\n";
    const r = parseFrontmatter(bom, "p");
    expect(r.fields["type"]).toBe("case");
  });

  it("explicitly rejects merge key <<", () => {
    const r = parseFrontmatter("---\ntype: case\nid: X\n<<: {a: 1}\n---\n", "p");
    expect(r.diagnostics.some((d) => d.code === "frontmatter-merge-key")).toBe(true);
  });

  it("rejects bare text relation value (not wikilink)", () => {
    const r = parseFrontmatter("---\ntype: case\nid: X\nsupports: E-1\n---\n", "p");
    expect(r.relations.length).toBe(0);
    expect(r.diagnostics.some((d) => d.code === "frontmatter-relation-type")).toBe(true);
  });

  it("rejects prose as relation value", () => {
    const r = parseFrontmatter("---\ntype: case\nid: X\nsupports: this is prose\n---\n", "p");
    expect(r.relations.length).toBe(0);
  });

  it("conservative field suppression: mixed valid + invalid in one field", () => {
    const r = parseFrontmatter(
      "---\ntype: case\nid: X\nsupports:\n  - \"[[E-1]]\"\n  - 42\n---\n", "p",
    );
    expect(r.relations.length).toBe(0); // whole field suppressed
  });
});

// ---------- RD-11: ordinary links ----------

describe("RD-11 ordinary link extraction", () => {
  const REL = (body: string) => extractBodyRelations(body, "CASES/C.md", 1);

  it("extracts ALL wikilinks on a multi-link line", () => {
    const r = REL("see [[B]] and [[C]] and [[D]]\n");
    expect(r.ordinaryLinks).toContain("B");
    expect(r.ordinaryLinks).toContain("C");
    expect(r.ordinaryLinks).toContain("D");
  });

  it("excludes inline code links", () => {
    const r = REL("`[[X]]`\n");
    expect(r.ordinaryLinks).not.toContain("X");
  });

  it("backlink index built via ordinaryIncoming", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({
      path: "CASES/C.md", type: "case", id: "C",
      body: "see [[EVIDENCE/E]] today",
    }));
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E" }));
    const index = new RDIndex(a);
    await index.build();
    expect(index.ordinaryBacklinksOf("EVIDENCE/E.md")).toContain("CASES/C.md");
  });
});

// ---------- RD-01/04/13: controller publish + tombstone identity ----------

describe("RD-01 reactive publish", () => {
  it("controller state changes notify subscribers", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    let notified = 0;
    c.subscribe(() => { notified += 1; });
    expect(notified).toBe(0);
    await c.onFileOpen("CASES/A.md");
    expect(notified).toBeGreaterThan(0);
    expect(c.phase).toBe("READY");
  });

  it("startup anchor initializes context without tab switch", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.initializeAnchor("CASES/A.md");
    expect(c.phase).toBe("READY");
    expect(c.projection?.object?.id).toBe("A");
  });
});

describe("RD-04 pinned tombstone identity", () => {
  it("pinned deleted → ERROR; path reuse does NOT auto-READY", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    await c.pin();
    expect(c.session.mode).toBe("PINNED");
    // delete
    a.dropFile("CASES/A.md");
    await index.applyDelete("CASES/A.md");
    await c.onFileDeleted("CASES/A.md");
    expect(c.phase).toBe("ERROR");
    expect(c.session.mode).toBe("PINNED");
    expect(c.projection?.pinnedDeleted).toBe(true);
    // path reuse: new different file at same path
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "DIFFERENT" }));
    await index.applyChange("CASES/A.md", "create");
    await c.onFileCreated("CASES/A.md");
    // close/reopen Context
    await c.reattach();
    // must remain ERROR (tombstone holds across reattach)
    expect(c.phase).toBe("ERROR");
    expect(c.projection?.pinnedDeleted).toBe(true);
    // only explicit unpin clears
    await c.unpin();
    expect(c.session.mode).toBe("FOLLOW");
  });

  it("FOLLOW current object deleted → NO_ACTIVE_OBJECT, no stale READY", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    expect(c.phase).toBe("READY");
    a.dropFile("CASES/A.md");
    await index.applyDelete("CASES/A.md");
    await c.onFileDeleted("CASES/A.md");
    expect(c.phase).toBe("NO_ACTIVE_OBJECT");
    expect(c.projection?.object).toBeNull();
  });
});
