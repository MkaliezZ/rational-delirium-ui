import { afterEach, describe, expect, it } from "vitest";
import { RDIndex } from "../src/index/rd-index";
import { ContextController } from "../src/context/context-controller";
import { RDContextView } from "../src/views/context-view";
import { ObsidianNavigationPort } from "../src/platform/obsidian-navigation";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const A = "CASES/A.md", E = "EVIDENCE/E.md", B = "EVIDENCE/B.md";
const hosts: ProductionAcceptanceHost[] = [];
afterEach(async () => { for (const h of hosts.splice(0)) await h.close(); });

async function host(entries: Array<[string, string]>) {
  const h = new ProductionAcceptanceHost();
  hosts.push(h);
  await h.start(entries);
  expect(h.wiring.index).toBeInstanceOf(RDIndex);
  expect(h.wiring.controller).toBeInstanceOf(ContextController);
  expect(h.view).toBeInstanceOf(RDContextView);
  expect(h.navigation).toBeInstanceOf(ObsidianNavigationPort);
  expect(h.wiring.buildPhase).toBe("LIVE");
  return h;
}
const note = (path: string, id: string | undefined, extra: string[] = [], body = "") =>
  fixtureNote({ path, type: path.startsWith("CASES/") ? "case" : "evidence", id, frontmatterExtra: extra, body });
const reverseNote = (predicate: string, targets: string[]) => note(A, "ACTUAL-A",
  [predicate + ":", ...targets.map((t) => '  - "[[' + t + ']]"')]);
function unresolvedRows(h: ProductionAcceptanceHost): HTMLButtonElement[] {
  const section = [...h.view.contentEl.querySelectorAll(".rdc-section")]
    .find((el) => el.querySelector(".rdc-section-title")?.textContent === "Unresolved");
  return [...(section?.querySelectorAll<HTMLButtonElement>(".rdc-rel") ?? [])];
}

describe("production runtime blocker acceptance", () => {
  it.each(["supported_by", "contradicted_by"])(
    "keeps nullable reverse identity and raw Context labels (%s)", async (predicate) => {
      for (const state of ["unique", "missing", "ambiguous", "no-id"]) {
        const entries: Array<[string, string]> = [[A, reverseNote(predicate, ["E"])]];
        if (state === "unique" || state === "ambiguous") entries.push([E, note(E, "ACTUAL-E")]);
        if (state === "ambiguous") entries.push(["ARCHIVE/E.md", note("ARCHIVE/E.md", "OTHER-E")]);
        if (state === "no-id") entries.push([E, note(E, undefined)]);
        const h = await host(entries);
        const rel = h.wiring.index.relations[0];
        const resolved = state === "unique" || state === "no-id";
        expect(rel.source).toEqual({
          objectId: state === "unique" ? "ACTUAL-E" : null,
          raw: "E", path: resolved ? E : null,
          resolution: resolved ? "RESOLVED" : state === "missing" ? "BROKEN" : "AMBIGUOUS",
        });
        expect(rel.target).toMatchObject({ objectId: "ACTUAL-A", path: A });
        expect(rel.sourceId).toBe(state === "unique" ? "ACTUAL-E" : "");
        expect(rel.assertions[0].location.path).toBe(A);
        const row = h.view.contentEl.querySelector<HTMLButtonElement>(".rdc-rel")!;
        expect(row.textContent).toContain(state === "unique" ? "ACTUAL-E" : " E");
        expect(row.querySelector(".rdc-badge")?.textContent).toBe(rel.source.resolution);
        expect(h.vault.writeCalls).toEqual([]);
      }
    });

  it.each(["supported_by", "contradicted_by"])(
    "keeps E and F as distinct unresolved production relations and DOM rows (%s)", async (predicate) => {
      const h = await host([[A, reverseNote(predicate, ["E", "F"])]]);
      const relations = h.wiring.index.relations;
      expect(relations).toHaveLength(2);
      expect(relations.map((rel) => rel.source.raw)).toEqual(["E", "F"]);
      for (const rel of relations) {
        expect(rel.source.objectId).toBeNull();
        expect(rel.source.path).toBeNull();
        expect(rel.target.objectId).toBe("ACTUAL-A");
        expect(rel.assertions).toHaveLength(1);
      }
      const rows = unresolvedRows(h);
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain(" E");
      expect(rows[1].textContent).toContain(" F");
      for (const row of rows) expect(row.querySelector(".rdc-badge")?.textContent).toBe("BROKEN");
    });

  it.each(["supported_by", "contradicted_by"])(
    "deduplicates E and E with both assertions through production Context (%s)", async (predicate) => {
      const h = await host([[A, reverseNote(predicate, ["E", "E"])]]);
      expect(h.wiring.index.relations).toHaveLength(1);
      expect(h.wiring.index.relations[0].assertions).toHaveLength(2);
      expect(h.wiring.index.relations[0].source.objectId).toBeNull();
      expect(unresolvedRows(h)).toHaveLength(1);
      expect(unresolvedRows(h)[0].textContent).toContain(" E");
    });

  it("preserves symmetric A related B and B related A in the production index", async () => {
    const h = await host([[A, note(A, "ACTUAL-A", ['related: "[[B]]"'])],
      [B, note(B, "ACTUAL-B", ['related: "[[A]]"'])]]);
    expect(h.wiring.index.relations).toHaveLength(1);
    expect(h.wiring.index.relations[0].assertions).toHaveLength(2);
  });

  const source = "---\ntype: case\nid: ACTUAL-A\n---\n\n# A\n\nderived_from: [[B]]\n";
  const sourceAction = '.rdc-src[aria-label="Jump to source line 8"]';
  it("rejects stale source cursor before index refresh through production navigation", async () => {
    const h = await host([[A, source], [B, note(B, "ACTUAL-B")]]);
    const projection = h.wiring.controller.projection;
    const revision = projection!.sections.flatMap((s) => s.rows).find((r) => r.sourceLine === 8)!.sourceRevision;
    h.vault.setCurrent(A, source.replace("derived_from:", "one\ntwo\nthree\nderived_from:"));
    await h.click(sourceAction);
    expect(h.wiring.controller.projection).toBe(projection); // no index refresh
    expect(h.openSpy.mock.calls[0][0]).toMatchObject({ path: A, line: 8, sourceRevision: revision,
      sourceLocator: { predicate: "derived_from", raw: "B" } });
    expect(h.vault.currentReads).toEqual([A]);
    expect(h.workspace.opens).toEqual([A]);
    expect(h.cursors).toEqual([{ line: 10, ch: 0 }]);
    expect(h.cursors).not.toContainEqual({ line: 7, ch: 0 });
  });

  it("validates unchanged source before positioning its current declaration", async () => {
    const h = await host([[A, source], [B, note(B, "ACTUAL-B")]]);
    await h.click(sourceAction);
    expect(h.vault.currentReads).toEqual([A]);
    expect(h.cursors).toEqual([{ line: 7, ch: 0 }]);
  });

  it("uses the current editor buffer when newer than the source file read", async () => {
    const h = await host([[A, source], [B, note(B, "ACTUAL-B")]]);
    h.buffers.set(A, source.replace("derived_from:", "one\ntwo\nthree\nderived_from:"));
    await h.click(sourceAction);
    expect(h.vault.currentReads).toEqual([A]);
    expect(h.cursors).toEqual([{ line: 10, ch: 0 }]);
  });

  it.each(["removed", "ambiguous", "read-failure"])(
    "opens source without a guessed cursor when current declaration is %s", async (state) => {
      const h = await host([[A, source], [B, note(B, "ACTUAL-B")]]);
      if (state === "removed") h.vault.setCurrent(A, source.replace("derived_from: [[B]]", "no declaration"));
      if (state === "ambiguous") h.vault.setCurrent(A, source + "\nderived_from: [[B]]\n");
      if (state === "read-failure") h.vault.failRead = true;
      await h.click(sourceAction);
      expect(h.vault.currentReads).toEqual([A]);
      expect(h.workspace.opens).toEqual([A]);
      expect(h.cursors).toEqual([]);
    });

  it.each([
    { raw: "B", alias: null, subpath: null, api: null },
    { raw: "B|Alias", alias: "Alias", subpath: null, api: null },
    { raw: "B#Heading", alias: null, subpath: "#Heading", api: "#Heading" },
    { raw: "B^block", alias: null, subpath: "^block", api: "#^block" },
    { raw: "B#Heading|Alias", alias: "Alias", subpath: "#Heading", api: "#Heading" },
  ])("preserves decorated link through ContextView and production navigation ($raw)", async ({ raw, alias, subpath, api }) => {
    const h = await host([[A, note(A, "ACTUAL-A", [], "[[" + raw + "]]" )],
      [B, note(B, "ACTUAL-B", [], "## Heading\nblock text ^block")]]);
    h.setSubpath(B, "#Heading", 7);
    h.setSubpath(B, "#^block", 8);
    const row = h.wiring.controller.projection!.sections.flatMap((s) => s.rows)[0];
    expect(row).toMatchObject({ targetId: "B", alias, subpath, targetPath: B, resolution: "RESOLVED" });
    expect(h.view.contentEl.querySelector(".rdc-rel")!.textContent).toContain(alias ?? " B");
    await h.click(".rdc-rel");
    expect(h.openSpy.mock.calls[0][0]).toEqual(subpath === null ? { path: B } : { path: B, subpath });
    expect(h.workspace.opens).toEqual([B]);
    expect(h.subpathCalls).toEqual(api === null ? [] : [{ path: B, subpath: api }]);
    expect(h.cursors).toEqual(api === null ? [] : [{ line: api === "#Heading" ? 7 : 8, ch: 0 }]);
    expect(h.vault.writeCalls).toEqual([]);
  });

  it.each([
    { selector: ".rdc-rel", mode: null, path: B },
    { selector: ".rdc-act-tab", mode: true, path: B },
    { selector: ".rdc-act-split", mode: "split", path: B },
    { selector: ".rdc-src", mode: null, path: A },
  ])("preserves production file/tab/split/frontmatter navigation ($selector)", async ({ selector, mode, path }) => {
    const h = await host([[A, note(A, "ACTUAL-A", ['supports: "[[B]]"'])], [B, note(B, "ACTUAL-B")]]);
    await h.click(selector);
    expect(h.workspace.opens).toEqual([path]);
    expect(h.workspace.getLeafCalls).toEqual(mode === null ? [] : [mode]);
    expect(h.cursors).toEqual([]);
  });

  it.each(["BROKEN", "AMBIGUOUS", "DELETED"])(
    "refuses deterministic target navigation without creating files (%s)", async (state) => {
      const entries: Array<[string, string]> = [[A, note(A, "ACTUAL-A", [], "[[B#Heading]]")]];
      if (state !== "BROKEN") entries.push([B, note(B, "ACTUAL-B")]);
      if (state === "AMBIGUOUS") entries.push(["ARCHIVE/B.md", note("ARCHIVE/B.md", "OTHER-B")]);
      const h = await host(entries);
      if (state === "DELETED") h.vault.files.delete(B);
      const count = h.vault.files.size;
      await h.click(".rdc-rel");
      expect(h.workspace.opens).toEqual([]);
      expect(h.subpathCalls).toEqual([]);
      expect(h.vault.writeCalls).toEqual([]);
      expect(h.vault.files.size).toBe(count);
    });
});
