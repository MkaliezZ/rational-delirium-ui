import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { RDInvestigationView } from "../src/views/investigation-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const A = "CASES/A.md", B = "EVIDENCE/B.md", E = "EVIDENCE/E.md";

const note = (path: string, id: string, extra: string[] = []) =>
  fixtureNote({
    path, type: path.startsWith("CASES/") ? "case" : "evidence",
    id, frontmatterExtra: extra,
  });

const hosts: ProductionAcceptanceHost[] = [];
const views: RDInvestigationView[] = [];

async function dashboard(entries: Array<[string, string]>): Promise<{
  host: ProductionAcceptanceHost; view: RDInvestigationView;
}> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  await host.start(entries);
  const view = new RDInvestigationView({} as WorkspaceLeaf, {
    index: host.wiring.index,
    onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
    navigation: host.navigation,
  });
  views.push(view);
  await view.onOpen();
  return { host, view };
}

/** Drive one debounced modify through the REAL wiring event path. */
async function flushModify(host: ProductionAcceptanceHost, path: string): Promise<void> {
  host.vault.fireModify(path);
  host.wiring.scheduler?.flush();
  await new Promise((r) => setTimeout(r, 0));
  await Promise.all(
    host.openSpy.mock.results.map((r) => r.value),
  );
}

async function settleCreate(host: ProductionAcceptanceHost, path: string): Promise<void> {
  host.vault.fireCreate(path);
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

const countText = (view: RDInvestigationView): string[] =>
  [...view.contentEl.querySelectorAll(".rdi-count")].map((el) => el.textContent);

const attentionLines = (view: RDInvestigationView): string[] =>
  [...view.contentEl.querySelectorAll(".rdi-att-line")].map((el) => el.textContent);

describe("dashboard live updates through the existing index event path (§28)", () => {
  it("CREATE: new EVIDENCE object updates Knowledge State, Cases untouched, Recent updated", async () => {
    const { host, view } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    expect(countText(view)).toContain("1EVIDENCE");
    expect(attentionLines(view)).toEqual(["E supports ACTUAL-A"]);

    host.vault.setCurrent(E, note(E, "ACTUAL-E"));
    host.vault.adapter.set(E, note(E, "ACTUAL-E"), 5000); // newest mtime → leads Recent
    await settleCreate(host, E);

    expect(countText(view)).toContain("2EVIDENCE");
    // E resolving flips the broken attention row away
    expect(attentionLines(view)).toEqual([]);
    expect(countText(view)).toContain("0BROKEN");
    // Recent now leads with the freshly created object
    const recentFirst = view.contentEl.querySelector(".rdi-recent-line")?.textContent;
    expect(recentFirst).toContain("ACTUAL-E");
  });

  it("MODIFY: relation state change updates Attention through the debounced scheduler", async () => {
    const { host, view } = await dashboard([
      [A, note(A, "ACTUAL-A", ['supported_by: "[[E]]"'])],
      [E, note(E, "ACTUAL-E")],
    ]);
    expect(attentionLines(view)).toEqual([]);
    expect(countText(view)).toContain("0BROKEN");

    // A edited: supported_by target becomes missing [[F]]
    host.vault.setCurrent(A, note(A, "ACTUAL-A", ['supported_by: "[[F]]"']));
    await flushModify(host, A);

    expect(attentionLines(view)).toEqual(["F supports ACTUAL-A"]);
    expect(countText(view)).toContain("1BROKEN");
  });

  it("DELETE: removing an object updates counts and Attention", async () => {
    const { host, view } = await dashboard([
      [A, note(A, "ACTUAL-A", ['supported_by: "[[E]]"'])],
      [E, note(E, "ACTUAL-E")],
      [B, note(B, "ACTUAL-B")],
    ]);
    expect(countText(view)).toContain("2EVIDENCE");
    expect(attentionLines(view)).toEqual([]);

    host.vault.adapter.dropFile(E);
    host.vault.fireDelete(E);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(countText(view)).toContain("1EVIDENCE");
    expect(attentionLines(view)).toEqual(["E supports ACTUAL-A"]);
    expect(countText(view)).toContain("1BROKEN");
  });

  it("RENAME: projected paths update (case row and attention target)", async () => {
    const { host, view } = await dashboard([
      [A, note(A, "ACTUAL-A", ['contradicted_by: "[[B]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    // resolved contradiction target is clickable through its projected path
    const row = view.contentEl.querySelector<HTMLButtonElement>(".rdi-att");
    expect(row).toBeInstanceOf(HTMLButtonElement);

    host.vault.adapter.moveFile(B, "EVIDENCE/B2.md");
    host.vault.fireRename(B, "EVIDENCE/B2.md");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // raw "B" no longer resolves: the attention row degrades safely
    const after = view.contentEl.querySelector(".rdi-att");
    expect(after?.tagName).toBe("DIV");
    expect(after?.getAttribute("aria-disabled")).toBe("true");
    // rename back restores the resolved target
    host.vault.adapter.moveFile("EVIDENCE/B2.md", B);
    host.vault.fireRename("EVIDENCE/B2.md", B);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const restored = view.contentEl.querySelector(".rdi-att");
    expect(restored?.tagName).toBe("BUTTON");
  });
});
