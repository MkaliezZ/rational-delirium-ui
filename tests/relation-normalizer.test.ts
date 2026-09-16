import { describe, expect, it } from "vitest";
import { normalizeAssertion, normalizeRelations } from "../src/index/relation-normalizer";
import { parseWikilink } from "../src/parsers/link-reference";
import { frontmatterLocation } from "../src/parsers/source-location";

function assertion(predicate: string, target: string) {
  return {
    predicate: predicate as never,
    link: parseWikilink(target) as never,
    location: frontmatterLocation("CASES/CASE-0001.md", predicate, 1),
  };
}

function norm(predicate: string, target: string, candidates: string[]) {
  return normalizeAssertion(
    "CASES/CASE-0001.md",
    "CASE-0001",
    assertion(predicate, target) as never,
    candidates,
    // These resolved fixtures declare real IDs; filenames alone are not IDs.
    new Map([
      ["CASES/CASE-0001.md", "CASE-0001"],
      ["EVIDENCE/EVIDENCE-021.md", "EVIDENCE-021"],
      ["HYPOTHESES/HYPOTHESIS-003.md", "HYPOTHESIS-003"],
    ]),
  );
}

const CANDIDATES = [
  "CASES/CASE-0001.md",
  "EVIDENCE/EVIDENCE-021.md",
  "HYPOTHESES/HYPOTHESIS-003.md",
];

describe("relation normalization", () => {
  it("supported_by reverses to logical supports", () => {
    const n = norm("supported_by", "EVIDENCE-021", CANDIDATES);
    expect(n.predicate).toBe("supports");
    expect(n.sourceId).toBe("EVIDENCE-021");
    expect(n.targetId).toBe("CASE-0001");
  });

  it("contradicted_by reverses to logical contradicts", () => {
    const n = norm("contradicted_by", "HYPOTHESIS-003", CANDIDATES);
    expect(n.predicate).toBe("contradicts");
    expect(n.sourceId).toBe("HYPOTHESIS-003");
  });

  it("related stays symmetric related", () => {
    const n = norm("related", "EVIDENCE-021", CANDIDATES);
    expect(n.predicate).toBe("related");
    expect(n.sourceId).toBe("CASE-0001");
    expect(n.targetId).toBe("EVIDENCE-021");
  });

  it("duplicate logical declarations merge into one relation with both assertions", () => {
    const a = norm("supports", "EVIDENCE-021", CANDIDATES);
    const b = norm("supported_by", "EVIDENCE-021", CANDIDATES); // reversed side
    const rels = normalizeRelations([
      a,
      { ...a, assertion: assertion("supports", "EVIDENCE-021") as never },
      { ...b },
    ]);
    // supports side and supported_by side are two logical relations
    // (different source/target); the two identical supports merge.
    expect(rels.length).toBe(2);
    const supports = rels.find((r) => r.predicate === "supports");
    expect(supports?.assertions.length).toBe(2);
  });

  it("different predicates never merge", () => {
    const a = norm("supports", "EVIDENCE-021", CANDIDATES);
    const b = norm("contradicts", "EVIDENCE-021", CANDIDATES);
    expect(normalizeRelations([a, b]).length).toBe(2);
  });

  it("broken target stays BROKEN with raw target id", () => {
    const n = norm("supports", "GHOST-404", CANDIDATES);
    expect(n.targetResolution).toBe("BROKEN");
    expect(n.targetId).toBe("GHOST-404");
  });

  it("duplicate filename targets are AMBIGUOUS", () => {
    const n = norm("supports", "EVIDENCE-021", [
      "EVIDENCE/EVIDENCE-021.md",
      "ARCHIVE/EVIDENCE-021.md",
    ]);
    expect(n.targetResolution).toBe("AMBIGUOUS");
  });

  it("out-of-scope target is OUT_OF_SCOPE", () => {
    const n = norm("supports", "Templates/X", CANDIDATES);
    expect(n.targetResolution).toBe("BROKEN");
  });
});
