import { describe, expect, it } from "vitest";
import { RuntimeWiring } from "../src/runtime/runtime-wiring";
import { FakeNavigator } from "../src/platform/navigation-core";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import { FakeWorkspace, FakeVault } from "./support/fake-obsidian-host";
import { extractBodyRelations } from "../src/parsers/body-relations";
import { normalizeAssertion } from "../src/index/relation-normalizer";
import { parseWikilink } from "../src/parsers/link-reference";
import { frontmatterLocation } from "../src/parsers/source-location";

// ---------- RD-02: post-await dispose guard ----------

describe("RD-02 post-await dispose guard", () => {
  it("LIVE modify pending → dispose → no controller call after await", async () => {
    const adapter = new FakeAdapter();
    adapter.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A" }));
    const workspace = new FakeWorkspace();
    const vault = new FakeVault();
    const navigator = new FakeNavigator();
    const wiring = new RuntimeWiring(adapter, workspace, vault, navigator);
    await wiring.start();
    expect(wiring.buildPhase).toBe("LIVE");
    // Fire modify → goes through scheduler → applyModify
    adapter.set("CASES/A.md", fixtureNote({ path: "CASES/A.md", type: "case", id: "A", body: "modified" }), 2000);
    vault.fireModify("CASES/A.md");
    // Dispose while modify is potentially pending
    wiring.dispose();
    expect(wiring.buildPhase).toBe("DISPOSED");
    // Wait for any pending async continuation
    await new Promise((r) => setTimeout(r, 100));
    // Verify: no resurrection
    expect(wiring.buildPhase).toBe("DISPOSED");
    expect(wiring.scheduler).toBeNull();
  });
});

// ---------- RD-05: raw target separate from object ID ----------

describe("RD-05 raw target vs object ID separation", () => {
  const CANDS = ["EVIDENCE/E.md"];
  const NO_ID_MAP = new Map<string, string>(); // empty = no IDs known

  function assert(predicate: string, target: string) {
    return {
      predicate: predicate as never,
      link: parseWikilink(target) as never,
      location: frontmatterLocation("CASES/A.md", predicate, 1),
    };
  }

  it("BROKEN reverse: sourceId empty (not raw target)", () => {
    const n = normalizeAssertion(
      "CASES/A.md", "A", assert("supported_by", "GHOST"), [], NO_ID_MAP,
    );
    expect(n.sourceId).toBe("");
    expect(n.targetResolution).toBe("BROKEN");
    expect(n.targetPaths).toEqual(["CASES/A.md"]); // A preserved
  });

  it("AMBIGUOUS reverse: sourceId empty", () => {
    const cands = ["EVIDENCE/E.md", "ARCHIVE/E.md"];
    const n = normalizeAssertion(
      "CASES/A.md", "A", assert("supported_by", "E"), cands, NO_ID_MAP,
    );
    expect(n.targetResolution).toBe("AMBIGUOUS");
    expect(n.sourceId).toBe("");
    expect(n.targetPaths).toEqual(["CASES/A.md"]);
  });

  it("known declaring endpoint A preserved in all cases", () => {
    for (const target of ["GHOST", "E"]) {
      const cands = target === "E" ? ["EVIDENCE/E.md", "ARCHIVE/E.md"] : [];
      const n = normalizeAssertion(
        "CASES/A.md", "A", assert("contradicted_by", target), cands, NO_ID_MAP,
      );
      expect(n.targetId).toBe("A");
      expect(n.targetPaths).toEqual(["CASES/A.md"]);
    }
  });
});

// ---------- FS-02: HTML comment tags ignored ----------

describe("FS-02 HTML comment semantics", () => {
  const REL = (body: string) => extractBodyRelations(body, "CASES/C.md", 1);

  it("single-line comment with <span> → later relation survives", () => {
    expect(REL("<!-- <span> -->\n\nderived_from: [[E]]\n").assertions.length).toBe(1);
  });

  it("multi-line comment with tags → later relation survives", () => {
    expect(REL("<!--\n<div>\n<span>\n-->\n\nderived_from: [[E]]\n").assertions.length).toBe(1);
  });

  it("relation inside comment → excluded", () => {
    expect(REL("<!--\nderived_from: [[E]]\n-->\n").assertions.length).toBe(0);
  });

  it("real unclosed HTML still excluded", () => {
    expect(REL("<span>\n\nderived_from: [[E]]\n").assertions.length).toBe(0);
  });
});
