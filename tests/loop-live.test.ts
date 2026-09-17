import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { RDLoopView } from "../src/views/loop-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const L = "LOOPS/L.md", A = "CASES/A.md", E = "EVIDENCE/E.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDLoopView[] = [];

const typeOf = (path: string) =>
  path.startsWith("CASES/") ? "case" : path.startsWith("EVIDENCE/") ? "evidence" : "loop";

/** repeats_in / observed_in are BODY predicates. */
const note = (path: string, id: string, fm: string[] = [], body: string[] = []) =>
  fixtureNote({ path, type: typeOf(path), id, frontmatterExtra: fm, body: body.join("\n") });

async function loopWorkspace(entries: Array<[string, string]>): Promise<{
  host: ProductionAcceptanceHost; view: RDLoopView;
}> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  await host.start(entries, L);
  const view = new RDLoopView({} as WorkspaceLeaf, {
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

const sectionLines = (view: RDLoopView, title: string): string[] => {
  const section = [...view.contentEl.querySelectorAll(".rdl-section")]
    .find((s) => s.querySelector(".rdl-section-title")?.textContent === title);
  return section === undefined
    ? []
    : [...section.querySelectorAll(".rdl-rel-line")].map((el) => el.textContent);
};
const recurrenceLines = (view: RDLoopView): string[] => sectionLines(view, "Recurrences");

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

describe("loop workspace live updates through the shared index path (§25, §18)", () => {
  it("MODIFY: LOOP relation change updates the real view DOM", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[A]]"])],
      [A, note(A, "CASE-1")],
    ]);
    expect(recurrenceLines(view)).toEqual(["→ repeats_in CASE-1"]);

    host.vault.setCurrent(L, note(L, "LOOP-1", [], ["repeats_in: [[F]]"]));
    await flushModify(host, L);

    expect(recurrenceLines(view)).toEqual(["→ repeats_in F"]);
  });

  it("CREATE: a new related object flips a broken recurrence resolved", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]"])],
      [A, note(A, "CASE-1")],
    ]);
    expect(recurrenceLines(view)).toEqual(["→ repeats_in E"]);
    expect(view.contentEl.querySelector(".rdl-badge")?.textContent).toBe("BROKEN");

    host.vault.setCurrent(E, note(E, "EV-1"));
    host.vault.fireCreate(E);
    await settle();

    expect(view.contentEl.querySelector(".rdl-badge")?.textContent).toBe("RESOLVED");
    expect(recurrenceLines(view)).toEqual(["→ repeats_in EV-1"]);
    // typed section picks the new evidence object up
    const evidenceSection = [...view.contentEl.querySelectorAll(".rdl-section")]
      .find((s) => s.querySelector(".rdl-section-title")?.textContent === "Evidence");
    expect(evidenceSection?.querySelector(".rdl-rel-line")?.textContent).toBe("→ repeats_in EV-1");
  });

  it("DELETE: removing the related object degrades the row safely", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]"])],
      [E, note(E, "EV-1")],
    ]);
    expect(recurrenceLines(view)).toEqual(["→ repeats_in EV-1"]);

    host.vault.adapter.dropFile(E);
    host.vault.fireDelete(E);
    await settle();

    expect(recurrenceLines(view)).toEqual(["→ repeats_in E"]);
    expect(view.contentEl.querySelector(".rdl-rel")?.tagName).toBe("DIV");
  });

  it("RENAME: projected path/label follow the renamed object; deleted LOOP falls back to selector", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]"])],
      [E, note(E, "EV-1")],
    ]);
    expect(recurrenceLines(view)).toEqual(["→ repeats_in EV-1"]);

    host.vault.adapter.moveFile(E, "EVIDENCE/E2.md");
    host.vault.fireRename(E, "EVIDENCE/E2.md");
    await settle();
    // raw "E" no longer resolves by name: degraded but distinct
    expect(recurrenceLines(view)).toEqual(["→ repeats_in E"]);
    expect(view.contentEl.querySelector(".rdl-rel")?.getAttribute("aria-disabled")).toBe("true");

    host.vault.adapter.moveFile("EVIDENCE/E2.md", E);
    host.vault.fireRename("EVIDENCE/E2.md", E);
    await settle();
    expect(recurrenceLines(view)).toEqual(["→ repeats_in EV-1"]);

    // deleting the selected LOOP itself falls back to the selector
    host.vault.adapter.dropFile(L);
    host.vault.fireDelete(L);
    await settle();
    expect(view.selectedLoop).toBeNull();
    expect(view.contentEl.textContent).toContain("No LOOP selected.");
  });
});
