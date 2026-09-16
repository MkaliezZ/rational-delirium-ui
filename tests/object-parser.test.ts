import { describe, expect, it } from "vitest";
import { parseObject } from "../src/parsers/object-parser";

const P = "CASES/CASE-0001.md";

function parse(content: string) {
  return parseObject(P, content, 1000, 1);
}

describe("object/frontmatter parsing", () => {
  it("accepts the four RD types", () => {
    for (const type of ["case", "evidence", "hypothesis", "loop"]) {
      const r = parse(
        `---\ntype: ${type}\nid: X-1\nstatus: active\n---\n\n# X-1\n`,
      );
      expect(r.object?.type).toBe(type);
    }
  });

  it("ARCHIVE retains original object type", () => {
    const r = parse(
      `---\ntype: evidence\nid: E-1\nstatus: archived\n---\n\n# E-1\n`,
    );
    expect(r.object?.type).toBe("evidence");
    expect(r.object?.status).toBe("archived");
  });

  it("missing id is diagnostic-only (never generated)", () => {
    const r = parse(`---\ntype: case\nstatus: active\n---\n\n# t\n`);
    expect(r.object).not.toBeNull();
    expect(r.object?.id).toBeNull();
    expect(r.object?.diagnostics.some((d) => d.code === "missing-id")).toBe(true);
  });

  it("duplicate id is kept one-to-many at index level; parser stays silent", () => {
    const r = parse(`---\ntype: case\nid: DUP\n---\n\n# a\n`);
    expect(r.object?.id).toBe("DUP");
  });

  it("unknown status is a diagnostic", () => {
    const r = parse(`---\ntype: case\nid: C-1\nstatus: frozen-solid\n---\n\n# a\n`);
    expect(r.object?.diagnostics.some((d) => d.code === "unknown-status")).toBe(true);
  });

  it("null dates are acceptable", () => {
    const r = parse(`---\ntype: case\nid: C-1\n---\n\n# a\n`);
    expect(r.object?.created).toBeNull();
    expect(r.object?.lastVerified).toBeNull();
  });

  it("demo marker from tag and proof marker from rd/proof prefix", () => {
    const demo = parse(
      `---\ntype: case\nid: C-1\ntags:\n  - rd/type/case\n  - rd/demo\n---\n\n# a\n`,
    );
    expect(demo.object?.demo).toBe(true);
    expect(demo.object?.proof).toBe(false);
    const proof = parse(
      `---\ntype: case\nid: C-2\ntags:\n  - rd/proof/v9.9.9\n---\n\n# b\n`,
    );
    expect(proof.object?.proof).toBe(true);
  });

  it("invalid YAML fails conservatively", () => {
    const r = parse(`---\ntype: [unclosed\nid: X\n---\n\n# a\n`);
    expect(r.object).toBeNull();
  });

  it("duplicate YAML keys are diagnosed", () => {
    const r = parse(`---\ntype: case\ntype: loop\nid: X\n---\n\n# a\n`);
    expect(r.object).toBeNull();
  });

  it("YAML alias: identity parses, relations suppressed", () => {
    const r = parse(`---\nbase: &a value\ncopy: *a\ntype: case\nid: X\n---\n\n# a\n`);
    expect(r.object).not.toBeNull();
    expect(r.assertions.length).toBe(0);
  });

  it("YAML merge key is diagnosed", () => {
    const r = parse(
      `---\nbase:\n  type: case\nobj:\n  <<: *base\nid: X\n---\n\n# a\n`,
    );
    // either alias rejection or parse failure: both must refuse indexing
    expect(
      r.object === null ||
        r.object.diagnostics.some((d) => d.code.startsWith("frontmatter-")),
    ).toBe(true);
  });

  it("custom YAML tag is diagnosed", () => {
    const r = parse(`---\ntype: !!python/object:evil\ntype2: case\n---\n\n# a\n`);
    expect(r.object).toBeNull();
  });

  it("invalid relation value type is diagnosed", () => {
    const r = parse(
      `---\ntype: case\nid: C-1\nsupports:\n  - 42\n---\n\n# a\n`,
    );
    expect(
      r.object?.diagnostics.some((d) => d.code === "frontmatter-relation-type"),
    ).toBe(true);
  });

  it("accepts single wikilink, list of wikilinks and null", () => {
    const single = parse(
      `---\ntype: case\nid: C-1\nsupports: "[[E-1]]"\n---\n\n# a\n`,
    );
    expect(single.assertions.map((a) => a.predicate)).toEqual(["supports"]);
    const list = parse(
      `---\ntype: case\nid: C-1\nrelated:\n  - "[[E-1]]"\n  - "[[E-2]]"\n---\n\n# a\n`,
    );
    expect(list.assertions.length).toBe(2);
    const empty = parse(`---\ntype: case\nid: C-1\nrelated:\n---\n\n# a\n`);
    expect(empty.assertions.length).toBe(0);
  });
});
