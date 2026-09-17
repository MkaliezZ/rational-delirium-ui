import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { RDGraphIntelligenceView } from "../src/views/graph-intelligence-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const A = "CASES/A.md", B = "EVIDENCE/B.md", C = "CASES/C.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDGraphIntelligenceView[] = [];

const typeOf = (path: string) =>
  path.startsWith("CASES/") ? "case" : path.startsWith("EVIDENCE/") ? "evidence" : "loop";

const note = (path: string, id: string, fm: string[] = [], body: string[] = []) =>
  fixtureNote({ path, type: typeOf(path), id, frontmatterExtra: fm, body: body.join("\n") });

async function graphView(entries: Array<[string, string]>): Promise<{
  host: ProductionAcceptanceHost; view: RDGraphIntelligenceView;
}> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  await host.start(entries, A);
  const view = new RDGraphIntelligenceView({} as WorkspaceLeaf, {
    index: host.wiring.index,
    onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
    onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
    activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
    navigation: host.navigation,
  });
  views.push(view);
  await view.onOpen();
  return { host, view };
}

const sections = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-section-title")].map((el) => el.textContent);

const edgeLines = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-rel-line")].map((el) => el.textContent);

const provLines = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-prov-line")].map((el) => el.textContent);

async function flushModify(host: ProductionAcceptanceHost, path: string): Promise<void> {
  host.vault.fireModify(path);
  host.wiring.scheduler?.flush();
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

describe("graph live updates through the shared index path (§30, §16)", () => {
  it("MODIFY: relation declaration change updates the DOM", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);

    host.vault.setCurrent(A, note(A, "CASE-A", ['contradicts: "[[B]]"']));
    await flushModify(host, A);

    expect(edgeLines(view)).toEqual(["→ contradicts EV-B [evidence]"]);
  });

  it("CREATE: previously missing endpoint resolves the edge", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
    ]);
    expect(view.contentEl.querySelector(".rdg-badge")?.textContent).toBe("BROKEN");
    expect(edgeLines(view)).toEqual(["→ supports B"]);

    host.vault.setCurrent(B, note(B, "EV-B"));
    host.vault.fireCreate(B);
    await settle();

    expect(view.contentEl.querySelector(".rdg-badge")?.textContent).toBe("RESOLVED");
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);
  });

  it("DELETE: endpoint removal degrades the edge safely", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);

    host.vault.adapter.dropFile(B);
    host.vault.fireDelete(B);
    await settle();

    expect(edgeLines(view)).toEqual(["→ supports B"]);
    expect(view.contentEl.querySelector(".rdg-rel")?.tagName).toBe("DIV");
  });

  it("RENAME: edge follows the renamed object; declassified root falls back to selector", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);

    host.vault.adapter.moveFile(B, "EVIDENCE/B2.md");
    host.vault.fireRename(B, "EVIDENCE/B2.md");
    await settle();
    expect(edgeLines(view)).toEqual(["→ supports B"]);

    host.vault.adapter.moveFile("EVIDENCE/B2.md", B);
    host.vault.fireRename("EVIDENCE/B2.md", B);
    await settle();
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);

    // deleting the selected object itself falls back to the selector
    host.vault.adapter.dropFile(A);
    host.vault.fireDelete(A);
    await settle();
    expect(view.selected).toBeNull();
    expect(sections(view)).toEqual(["RD Objects"]);
  });

  it("PROVENANCE: added mutual declaration updates provenance without a manual render", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    expect(provLines(view)).toHaveLength(1);

    host.vault.setCurrent(B, note(B, "EV-B", ['supported_by: "[[A]]"']));
    await flushModify(host, B);

    expect(host.wiring.index.relations).toHaveLength(1);
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);
    expect(provLines(view)).toHaveLength(2);
    expect(provLines(view)[1]).toContain("supported_by @ EVIDENCE/B.md");
  });
});
