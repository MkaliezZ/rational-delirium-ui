import { describe, expect, it } from "vitest";
import {
  inNormalWorkingSet,
  isCandidatePath,
  isForbiddenDataSource,
  rootOf,
} from "../src/scope";
import { parseObject } from "../src/parsers/object-parser";

describe("scope", () => {
  it("knowledge roots are candidates", () => {
    for (const p of ["CASES/a.md", "EVIDENCE/b.md", "HYPOTHESES/c.md", "LOOPS/d.md", "ARCHIVE/e.md"]) {
      expect(isCandidatePath(p)).toBe(true);
    }
  });

  it("everything else is out", () => {
    for (const p of ["00_HOME/Home.md", "Templates/CASE.template.md", "Attachments/x.png", ".obsidian/app.json", "CASES/../evil.md"]) {
      expect(isCandidatePath(p)).toBe(p.startsWith("CASES/../") ? true : false);
    }
  });

  it("forbidden data sources are rejected", () => {
    for (const p of [
      ".astra/bridge_state/operations/windows/x.json",
      ".astra/audit/bridge/windows/2026.md.jsonl",
      ".astra/bridge/rd_bridge.py",
      ".obsidian/workspace.json",
      "Templates/CASE.template.md",
      "Attachments/a.png",
      "00_HOME/RD_DEMO/DEMO-CASE-0147.md",
    ]) {
      expect(isForbiddenDataSource(p), p).toBe(true);
    }
  });

  it("rootOf extracts top segment", () => {
    expect(rootOf("CASES/x.md")).toBe("CASES");
  });

  it("working set excludes proof and demo", () => {
    const proof = parseObject(
      "CASES/CASE-0002.md",
      "---\ntype: case\nid: CASE-0002\ntags:\n  - rd/proof/x\n---\n# t\n",
      1,
      1,
    ).object;
    const demo = parseObject(
      "CASES/CASE-0003.md",
      "---\ntype: case\nid: CASE-0003\ntags:\n  - rd/demo\n---\n# t\n",
      1,
      1,
    ).object;
    const plain = parseObject(
      "CASES/CASE-0004.md",
      "---\ntype: case\nid: CASE-0004\n---\n# t\n",
      1,
      1,
    ).object;
    expect(inNormalWorkingSet(proof as never)).toBe(false);
    expect(inNormalWorkingSet(demo as never)).toBe(false);
    expect(inNormalWorkingSet(plain as never)).toBe(true);
  });
});
