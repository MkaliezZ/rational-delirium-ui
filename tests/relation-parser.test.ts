import { describe, expect, it } from "vitest";
import { extractBodyRelations } from "../src/parsers/body-relations";
import { parseWikilink } from "../src/parsers/link-reference";

const P = "CASES/CASE-0001.md";
const REL = (body: string) => extractBodyRelations(body, P, 1);

describe("body relation parsing", () => {
  it("parses the three directional predicates", () => {
    const r = REL(
      "derived_from: [[E-1]]\n\nrepeats_in: [[LOOP-9]]\n\nobserved_in: [[CASE-2]]\n",
    );
    expect(r.assertions.map((a) => a.predicate)).toEqual([
      "derived_from",
      "repeats_in",
      "observed_in",
    ]);
  });

  it("handles CRLF content", () => {
    const r = REL("derived_from: [[E-1]]\r\n\r\nplain\r\n");
    expect(r.assertions.length).toBe(1);
    expect(r.assertions[0].location.line).toBe(1);
  });

  it("handles Chinese content", () => {
    const r = REL("这个房间记得你说的话。\n\nobserved_in: [[CASE-中文]]\n");
    expect(r.assertions.length).toBe(1);
    expect(r.assertions[0].link.targetName).toBe("CASE-中文");
  });

  it("wikilink alias does not change identity", () => {
    const link = parseWikilink("E-1|第一份证据");
    expect(link?.targetName).toBe("E-1");
    expect(link?.alias).toBe("第一份证据");
    const r = REL("derived_from: [[E-1|alias here]]\n");
    expect(r.assertions[0].link.targetName).toBe("E-1");
  });

  it("heading and block refs parse", () => {
    expect(parseWikilink("CASE-1#录音")?.heading).toBe("录音");
    expect(parseWikilink("CASE-1^block-id")?.block).toBe("block-id");
    const r = REL("observed_in: [[CASE-1#录音]]\n");
    expect(r.assertions[0].link.heading).toBe("录音");
  });

  it("external URI and absolute paths are never relations", () => {
    expect(parseWikilink("https://evil.example/x")).toBeNull();
    expect(parseWikilink("C:/evil")).toBeNull();
    expect(parseWikilink("/etc/passwd")).toBeNull();
  });
});

describe("mandatory exclusions", () => {
  const CASES: Array<[string, string]> = [
    ["backtick fence", "```\nderived_from: [[E-1]]\n```\n"],
    ["tilde fence", "~~~\nderived_from: [[E-1]]\n~~~\n"],
    ["indented code", "    derived_from: [[E-1]]\n"],
    ["inline code", "`derived_from: [[E-1]]`\n"],
    ["blockquote", "> derived_from: [[E-1]]\n"],
    ["list item", "- derived_from: [[E-1]]\n"],
    ["html", "<div>derived_from: [[E-1]]</div>\n"],
    ["comment", "<!-- derived_from: [[E-1]] -->\n"],
    ["example block", "````\n```\nderived_from: [[E-1]]\n```\n````\n"],
    ["unterminated fence remainder", "```\nnever closed\nstill code derived_from: [[E-1]]\n"],
  ];
  for (const [name, body] of CASES) {
    it(`${name} produces no relation`, () => {
      const r = REL(body);
      expect(r.assertions.length, name).toBe(0);
    });
  }
});
