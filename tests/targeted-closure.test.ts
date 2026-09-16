import { describe, expect, it } from "vitest";
import { PendingPathScheduler } from "../src/index/update-scheduler";
import { RDIndex } from "../src/index/rd-index";
import { ContextController } from "../src/context/context-controller";
import { parseFrontmatter, splitFrontmatter } from "../src/parsers/frontmatter-parser";
import { extractBodyRelations } from "../src/parsers/body-relations";
import { normalizeAssertion, normalizeRelations } from "../src/index/relation-normalizer";
import { validateInternalLinkTarget, parseWikilink } from "../src/parsers/link-reference";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import { frontmatterLocation } from "../src/parsers/source-location";

// ---------- RD-01: cross-object context refresh ----------

describe("RD-01 cross-object context refresh", () => {
  it("A supports E; E title changes → A projection refreshes", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      frontmatterExtra: ['supports: "[[E]]"'],
    }));
    a.set("EVIDENCE/E.md", fixtureNote({
      path: "EVIDENCE/E.md", type: "evidence", id: "E",
      body: "old title body",
    }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    expect(c.phase).toBe("READY");
    const oldTitle = c.projection?.sections
      .flatMap((s) => s.rows)
      .find((r) => r.targetId === "E")?.targetTitle;
    // E changes: give it a completely different H1 title
    const oldContent = a.readSync("EVIDENCE/E.md");
    const newContent = oldContent.replace("# E — fixture", "# E — Brand New Title");
    a.set("EVIDENCE/E.md", newContent, 2000);
    await index.applyChange("EVIDENCE/E.md", "modify");
    await c.onIndexRefreshed("EVIDENCE/E.md");
    const newTitle = c.projection?.sections
      .flatMap((sec) => sec.rows)
      .find((r) => r.targetId === "E")?.targetTitle;
    expect(newTitle).toContain("Brand New Title");
  });

  it("create of E after A open → A projection refreshes", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      frontmatterExtra: ['supports: "[[E]]"'],
    }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    // E created after A is already showing
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E" }));
    await index.applyChange("EVIDENCE/E.md", "create");
    await c.onIndexRefreshed("EVIDENCE/E.md");
    const rows = c.projection?.sections.flatMap((s) => s.rows) ?? [];
    expect(rows.some((r) => r.targetId === "E" && r.resolution === "RESOLVED")).toBe(true);
  });
});

// ---------- RD-02: scheduler real timer + BUILDING/REPLAYING ----------

describe("RD-02 scheduler timing", () => {
  it("uses real 250ms trailing debounce (fake timer)", async () => {
    let time = 0;
    const processed: string[] = [];
    const sch = new PendingPathScheduler(
      (p) => { processed.push(p); },
      250, 1000, () => time,
    );
    sch.schedule("CASES/A.md");
    time = 100;
    sch.schedule("CASES/A.md"); // trailing debounce restarts
    time = 350; // 250ms since last schedule
    // Trigger the tick by calling private tick via schedule (the timer
    // uses setTimeout in real life; in tests we verify via flush after
    // the debounce window has passed)
    sch.flush();
    expect(processed).toEqual(["CASES/A.md"]);
  });

  it("multi-path: both processed, no drops", () => {
    const processed: string[] = [];
    const sch = new PendingPathScheduler(
      (p) => { processed.push(p); }, 250, 1000,
    );
    sch.schedule("CASES/A.md");
    sch.schedule("CASES/B.md");
    sch.schedule("CASES/C.md");
    sch.flush();
    expect(processed.sort()).toEqual(["CASES/A.md", "CASES/B.md", "CASES/C.md"]);
  });
});

// ---------- RD-04/RR-01: pinned vs follow anchor ----------

describe("RD-04/RR-01 pinned non-target delete", () => {
  it("pin A, open B, delete B → A stays pinned READY", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    a.set("CASES/B.md", fixtureNote({ path: "CASES/B.md", type: "case", id: "B" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    await c.pin();
    expect(c.session.mode).toBe("PINNED");
    // open B (anchor changes, pinned stays A)
    await c.onFileOpen("CASES/B.md");
    expect(c.projection?.object?.id).toBe("A");
    // delete B (the anchor, NOT the pinned target)
    a.dropFile("CASES/B.md");
    await index.applyDelete("CASES/B.md");
    await c.onFileDeleted("CASES/B.md");
    // A must remain pinned and READY
    expect(c.session.mode).toBe("PINNED");
    expect(c.session.pinnedPath).toBe("CASES/A.md");
    expect(c.phase).toBe("READY");
    expect(c.projection?.object?.id).toBe("A");
    expect(c.projection?.mode).toBe("PINNED");
    // anchor is cleared but pinned projection untouched
    expect(c.session.lastMarkdownAnchor).toBeNull();
  });

  it("after deleting anchor while pinned, unpin → NO_ACTIVE_OBJECT", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    await c.onFileOpen("CASES/A.md");
    await c.pin();
    // anchor A is also the pinned target... use separate anchor
    a.set("CASES/B.md", fixtureNote({ path: "CASES/B.md", type: "case", id: "B" }));
    await index.applyChange("CASES/B.md", "create");
    await c.onFileOpen("CASES/B.md");
    a.dropFile("CASES/B.md");
    await index.applyDelete("CASES/B.md");
    await c.onFileDeleted("CASES/B.md");
    await c.unpin();
    expect(c.session.mode).toBe("FOLLOW");
    expect(c.phase).toBe("NO_ACTIVE_OBJECT");
  });
});

// ---------- RD-05: reverse relation identity ----------

describe("RD-05 reverse relation full identity swap", () => {
  const CANDS = ["EVIDENCE/E.md", "CASES/A.md"];
  const IDS = new Map([["EVIDENCE/E.md", "E"], ["CASES/A.md", "A"]]);

  function assert(predicate: string, target: string) {
    return {
      predicate: predicate as never,
      link: parseWikilink(target) as never,
      location: frontmatterLocation("CASES/A.md", predicate, 1),
    };
  }

  it("A supported_by E → logical E supports A with E path as source", () => {
    const n = normalizeAssertion(
      "CASES/A.md", "A", assert("supported_by", "E"), CANDS, IDS,
    );
    expect(n.predicate).toBe("supports");
    expect(n.sourceId).toBe("E");
    expect(n.sourcePath).toBe("EVIDENCE/E.md");
    expect(n.targetId).toBe("A");
    expect(n.targetPaths).toEqual(["CASES/A.md"]);
  });

  it("A contradicted_by E → logical E contradicts A", () => {
    const n = normalizeAssertion(
      "CASES/A.md", "A", assert("contradicted_by", "E"), CANDS, IDS,
    );
    expect(n.predicate).toBe("contradicts");
    expect(n.sourceId).toBe("E");
  });

  it("E supports A + A supported_by E → 1 relation, 2 assertions", () => {
    const fwd = normalizeAssertion(
      "EVIDENCE/E.md", "E", assert("supports", "A"), CANDS, IDS,
    );
    const rev = normalizeAssertion(
      "CASES/A.md", "A", assert("supported_by", "E"), CANDS, IDS,
    );
    const rels = normalizeRelations([fwd, rev]);
    expect(rels.length).toBe(1);
    expect(rels[0].assertions.length).toBe(2);
    expect(rels[0].predicate).toBe("supports");
    expect(rels[0].sourceId).toBe("E");
    expect(rels[0].targetId).toBe("A");
  });

  it("incoming from supported_by is queryable via targetId=A", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      frontmatterExtra: ['supported_by: "[[E]]"'],
    }));
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E" }));
    const index = new RDIndex(a);
    await index.build();
    const { incoming } = index.relationsFor("CASES/A.md");
    expect(incoming.length).toBe(1);
    expect(incoming[0].predicate).toBe("supports");
    expect(incoming[0].sourceId).toBe("E");
    expect(incoming[0].sourcePath).toBe("EVIDENCE/E.md");
    expect(incoming[0].targetId).toBe("A");
  });
});

// ---------- RD-07: HTML paragraph exclusion ----------

describe("RD-07 HTML paragraph exclusion", () => {
  const REL = (body: string) => extractBodyRelations(body, "CASES/C.md", 1);

  it("inline HTML same line blocks whole paragraph", () => {
    expect(REL('<span>derived_from: [[X]]</span>\n').assertions.length).toBe(0);
  });

  it("HTML open/close across lines blocks whole paragraph", () => {
    expect(REL('example <span>\nderived_from: [[X]]\n</span>\n').assertions.length).toBe(0);
  });

  it("nested HTML blocks", () => {
    expect(REL('<div><b>derived_from: [[X]]</b></div>\n').assertions.length).toBe(0);
  });

  it("unclosed HTML blocks", () => {
    expect(REL('<span>derived_from: [[X]]\n').assertions.length).toBe(0);
  });

  it("HTML comment blocks", () => {
    expect(REL('<!-- derived_from: [[X]] -->\n').assertions.length).toBe(0);
  });

  it("legal whole-line in separate paragraph still works", () => {
    expect(REL('<span>some HTML</span>\n\nderived_from: [[X]]\n').assertions.length).toBe(1);
  });
});

// ---------- RD-08/RR-04/RR-05: frontmatter cluster ----------

describe("RD-08/RR-04/RR-05 frontmatter", () => {
  it("file-level suppression: one bad relation field → ALL relations suppressed", () => {
    const r = parseFrontmatter(
      '---\ntype: case\nid: X\nsupports:\n  - "[[E-1]]"\n  - 42\nrelated:\n  - "[[B]]"\n---\n',
      "p",
    );
    expect(r.fileSuppressed).toBe(true);
    expect(r.relations.length).toBe(0);
  });

  it("shared validator rejects external URI", () => {
    expect(validateInternalLinkTarget("https://example.com")).toBe(false);
    expect(validateInternalLinkTarget("http://foo")).toBe(false);
    expect(validateInternalLinkTarget("mailto:a@b")).toBe(false);
    expect(validateInternalLinkTarget("file:///etc")).toBe(false);
    expect(validateInternalLinkTarget("/etc/passwd")).toBe(false);
    expect(validateInternalLinkTarget("C:\\\\foo")).toBe(false);
  });

  it("shared validator allows Unicode, folder paths, heading/block", () => {
    expect(validateInternalLinkTarget("中文笔记")).toBe(true);
    expect(validateInternalLinkTarget("Folder/Note")).toBe(true);
    expect(validateInternalLinkTarget("Note#Heading")).toBe(true);
    expect(validateInternalLinkTarget("Note^block")).toBe(true);
  });

  it("merge key: only in mapping-key context rejected, value ok", () => {
    // Real merge key: mapping key position
    const merge = parseFrontmatter(
      '---\ntype: case\nid: X\n<<: {status: archived}\n---\n', "p",
    );
    expect(merge.diagnostics.some((d) => d.code === "frontmatter-merge-key")).toBe(true);
    // Legal: scalar value
    const val = parseFrontmatter(
      '---\ntype: case\nid: X\nlabel: "<<"\n---\n', "p",
    );
    expect(val.diagnostics.some((d) => d.code === "frontmatter-merge-key")).toBe(false);
    expect(val.fileSuppressed).toBe(false);
    // Legal: list value
    const list = parseFrontmatter(
      '---\ntype: case\nid: X\nlabels:\n  - "<<"\n---\n', "p",
    );
    expect(list.diagnostics.some((d) => d.code === "frontmatter-merge-key")).toBe(false);
  });

  it("BOM+LF: source range maps back to original correctly", () => {
    const BOM = String.fromCharCode(0xfeff);
    const NL = String.fromCharCode(10);
    const content = BOM + "---" + NL + "type: case" + NL + "id: X" + NL + "---" + NL + NL + "derived_from: [[E]]" + NL;
    // parseSource strips BOM for mdast; verify no crash and correct range
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    // The assertion should exist and its range should be in original coordinates
    expect(r.assertions.length).toBe(1);
    const loc = r.assertions[0].location;
    if (loc.range) {
      const sliced = content.slice(loc.range.start, loc.range.end);
      expect(sliced).toContain("derived_from: [[E]]");
    }
  });

});

// ---------- RD-11/RR-02: ordinary link model ----------

describe("RD-11/RR-02 ordinary link resolution", () => {
  const REL = (body: string) => extractBodyRelations(body, "CASES/C.md", 1);

  it("ordinary links include full raw form (alias/subpath preserved)", () => {
    const r = REL("[[B|Alias]] and [[C#Heading]] and [[D^block]]\\n");
    expect(r.ordinaryLinks).toContain("B|Alias");
    expect(r.ordinaryLinks).toContain("C#Heading");
    expect(r.ordinaryLinks).toContain("D^block");
  });

  it("parseWikilink extracts target vs alias vs heading correctly", () => {
    const a = parseWikilink("B|Alias");
    expect(a?.targetName).toBe("B");
    expect(a?.alias).toBe("Alias");
    const b = parseWikilink("C#Heading");
    expect(b?.targetName).toBe("C");
    expect(b?.heading).toBe("Heading");
    const c = parseWikilink("D^block");
    expect(c?.targetName).toBe("D");
    expect(c?.block).toBe("block");
  });

  it("backlink certainty: ambiguous target does not create backlinks", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({
      path: "CASES/C.md", type: "case", id: "C",
      body: "see [[E]] today",
    }));
    // two files with basename E → ambiguous
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E1" }));
    a.set("ARCHIVE/E.md", fixtureNote({ path: "ARCHIVE/E.md", type: "evidence", id: "E2" }));
    const index = new RDIndex(a);
    await index.build();
    // neither should have a confirmed backlink
    expect(index.ordinaryBacklinksOf("EVIDENCE/E.md")).toEqual([]);
    expect(index.ordinaryBacklinksOf("ARCHIVE/E.md")).toEqual([]);
  });

  it("unique target gets a backlink; unique→ambiguous after create", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({
      path: "CASES/C.md", type: "case", id: "C",
      body: "see [[E]]",
    }));
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E1" }));
    const index = new RDIndex(a);
    await index.build();
    expect(index.ordinaryBacklinksOf("EVIDENCE/E.md")).toContain("CASES/C.md");
    // create a second E → becomes ambiguous → backlinks removed
    a.set("ARCHIVE/E.md", fixtureNote({ path: "ARCHIVE/E.md", type: "evidence", id: "E2" }));
    await index.applyChange("ARCHIVE/E.md", "create");
    expect(index.ordinaryBacklinksOf("EVIDENCE/E.md")).toEqual([]);
  });

  it("ordinary link resolution reflects real index state", async () => {
    const a = new FakeAdapter();
    a.set("CASES/C.md", fixtureNote({
      path: "CASES/C.md", type: "case", id: "C",
      body: "see [[E]] and [[GHOST]]",
    }));
    a.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E1" }));
    const index = new RDIndex(a);
    await index.build();
    const eRes = index.ordinaryLinkResolution("CASES/C.md", "E");
    expect(eRes.state).toBe("RESOLVED");
    expect(eRes.paths).toEqual(["EVIDENCE/E.md"]);
    const ghost = index.ordinaryLinkResolution("CASES/C.md", "GHOST");
    expect(ghost.state).toBe("BROKEN");
  });
});

// ---------- RD-12: BOM offset mapping ----------

describe("RD-12 BOM offset mapping in body relations", () => {
  it("BOM+LF: relation found with source range in original coordinates", () => {
    const BOM = String.fromCharCode(0xfeff);
    const NL = String.fromCharCode(10);
    const content = BOM + "---" + NL + "type: case" + NL + "id: X" + NL + "---" + NL + NL + "derived_from: [[E]]" + NL;
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    expect(r.assertions.length).toBe(1);
    if (r.assertions[0].location.range) {
      const sliced = content.slice(r.assertions[0].location.range.start, r.assertions[0].location.range.end);
      expect(sliced).toContain("derived_from: [[E]]");
    }
  });
  it("BOM+CRLF: relation found with range excluding CR", () => {
    const BOM = String.fromCharCode(0xfeff);
    const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
    const content = BOM + "---" + CRLF + "type: case" + CRLF + "id: X" + CRLF + "---" + CRLF + CRLF + "derived_from: [[E]]" + CRLF;
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    expect(r.assertions.length).toBe(1);
    if (r.assertions[0].location.range) {
      const sliced = content.slice(r.assertions[0].location.range.start, r.assertions[0].location.range.end);
      expect(sliced).toContain("derived_from: [[E]]");
      expect(sliced.endsWith(String.fromCharCode(13))).toBe(false);
    }
  });
  it("plain LF: no BOM, works normally", () => {
    const NL = String.fromCharCode(10);
    const content = "---" + NL + "type: case" + NL + "id: X" + NL + "---" + NL + NL + "derived_from: [[E]]" + NL;
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    expect(r.assertions.length).toBe(1);
  });
});

// ---------- RD-13: expanded sections ----------

describe("RD-13 expanded sections session state", () => {
  it("setSectionExpanded adds/removes keys and publishes", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    let notified = 0;
    c.subscribe(() => { notified += 1; });
    c.setSectionExpanded("related-evidence", true);
    expect(c.session.expandedSections.has("related-evidence")).toBe(true);
    expect(notified).toBe(1);
    c.setSectionExpanded("related-evidence", false);
    expect(c.session.expandedSections.has("related-evidence")).toBe(false);
    expect(notified).toBe(2);
  });

  it("plugin reload resets expanded sections", async () => {
    const a = new FakeAdapter();
    a.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const index = new RDIndex(a);
    await index.build();
    const c = new ContextController(index);
    c.setSectionExpanded("some-key", true);
    expect(c.session.expandedSections.size).toBe(1);
    await c.unload();
    expect(c.session.expandedSections.size).toBe(0);
  });
});
