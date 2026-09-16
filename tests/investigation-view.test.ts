import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import {
  RDInvestigationView,
  RD_INVESTIGATION_VIEW_TYPE,
} from "../src/views/investigation-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const A = "CASES/A.md", B = "EVIDENCE/B.md", Amb = "CASES/Amb.md";
const C1 = "EVIDENCE/C.md", C2 = "ARCHIVE/C.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDInvestigationView[] = [];

function note(path: string, id: string, extra: string[] = [], body = "") {
  return fixtureNote({
    path, type: path.startsWith("CASES/") ? "case" : "evidence",
    id, frontmatterExtra: extra, body,
  });
}

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

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

const sections = (view: RDInvestigationView): string[] =>
  [...view.contentEl.querySelectorAll(".rdi-section-title")].map((el) => el.textContent);

async function clickEl(view: RDInvestigationView, selector: string): Promise<void> {
  const el = view.contentEl.querySelector<HTMLElement>(selector);
  if (el === null) throw new Error("missing DOM element: " + selector);
  el.click();
}

function host_openCount(host: ProductionAcceptanceHost): number {
  return host.openSpy.mock.calls.length;
}

describe("real RDInvestigationView in tests (§25)", () => {
  it("instantiates the ACTUAL view with lifecycle and renders all four sections", async () => {
    const { view } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"', '  - "[[F]]"'])],
      [B, note(B, "ACTUAL-B")],
      [Amb, note(Amb, "ACTUAL-AMB", ['supported_by: "[[C]]"'])],
      [C1, note(C1, "ACTUAL-C")],
      [C2, note(C2, "OTHER-C")],
    ]);
    expect(view).toBeInstanceOf(RDInvestigationView);
    expect(view.getViewType()).toBe(RD_INVESTIGATION_VIEW_TYPE);
    expect(view.getDisplayText()).toBe("RD Investigation");
    expect(sections(view)).toEqual([
      "Knowledge State", "Cases", "Attention", "Recent",
    ]);
    expect(view.contentEl.querySelector(".rd-investigation")).not.toBeNull();
  });

  it("Knowledge State counts render as visible text", async () => {
    const { view } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"', "contradicted_by:", '  - "[[B]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    const labels = [...view.contentEl.querySelectorAll(".rdi-count")].map(
      (el) => el.textContent,
    );
    expect(labels).toContain("1CASE");
    expect(labels).toContain("1EVIDENCE");
    expect(labels).toContain("0HYPOTHESIS");
    expect(labels).toContain("0LOOP");
    expect(labels).toContain("1BROKEN");
    expect(labels).toContain("0AMBIGUOUS");
    expect(labels).toContain("1CONTRADICTION");
  });

  it("empty index shows the restrained empty state", async () => {
    const { view } = await dashboard([]);
    expect(sections(view)).toEqual([]);
    expect(view.contentEl.textContent).toContain("No RD objects in the current index.");
  });
});

describe("session-only filters (§13)", () => {
  it("filters change rendered sections and are memory-only state", async () => {
    const { view, host } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    expect(view.currentFilter).toBe("all");
    expect(sections(view)).toEqual(["Knowledge State", "Cases", "Attention", "Recent"]);

    await clickEl(view, '.rdi-filter[aria-label="Filter: Cases"]');
    expect(view.currentFilter).toBe("cases");
    expect(sections(view)).toEqual(["Knowledge State", "Cases"]);

    await clickEl(view, '.rdi-filter[aria-label="Filter: Unresolved"]');
    expect(sections(view)).toEqual(["Knowledge State", "Attention"]);
    expect(view.contentEl.textContent).toContain("E supports ACTUAL-A");

    await clickEl(view, '.rdi-filter[aria-label="Filter: Contradictions"]');
    expect(sections(view)).toEqual(["Knowledge State", "Attention"]);
    expect(view.contentEl.textContent).toContain("Nothing requires attention.");

    await clickEl(view, '.rdi-filter[aria-label="Filter: All"]');
    expect(sections(view)).toEqual(["Knowledge State", "Cases", "Attention", "Recent"]);

    // aria-pressed reflects active filter (§31 keyboard/semantics)
    const pressed = [...view.contentEl.querySelectorAll(".rdi-filter")]
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.map((b) => b.textContent)).toEqual(["All"]);
    // no persistence surface exists anywhere
    expect(host.vault.writeCalls).toEqual([]);
  });
});

describe("cases navigation (§26)", () => {
  it("CASE row click navigates the established path; no file creation", async () => {
    const { view, host } = await dashboard([
      [A, note(A, "ACTUAL-A")],
      [B, note(B, "ACTUAL-B")],
    ]);
    const row = view.contentEl.querySelector<HTMLButtonElement>(".rdi-case");
    expect(row).not.toBeNull();
    row!.click();
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    expect(host.openSpy.mock.calls[0][0]).toMatchObject({ path: A });
    expect(host.workspace.opens).toEqual([A]);
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("recent row click also uses the established navigation path", async () => {
    const { view, host } = await dashboard([
      [A, note(A, "ACTUAL-A")],
    ]);
    const row = view.contentEl.querySelector<HTMLButtonElement>(".rdi-recent");
    row!.click();
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    expect(host.openSpy.mock.calls[0][0]).toMatchObject({ path: A });
    expect(host.vault.writeCalls).toEqual([]);
  });
});

describe("attention navigation safety (§27)", () => {
  it("RESOLVED contradiction target navigates through the established path", async () => {
    const { view, host } = await dashboard([
      [A, note(A, "ACTUAL-A", ['contradicted_by: "[[B]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    const row = view.contentEl.querySelector<HTMLButtonElement>(".rdi-att");
    expect(row?.tagName).toBe("BUTTON");
    expect(row?.getAttribute("aria-label")).toBe("Open ACTUAL-A");
    row!.click();
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    // contradicted_by swaps endpoints: the normalized target is the declarer A
    expect(host.openSpy.mock.calls[0][0]).toMatchObject({ path: A });
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("BROKEN and AMBIGUOUS rows have NO navigation and create nothing", async () => {
    const { view, host } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"'])],
      [Amb, note(Amb, "ACTUAL-AMB", ['supported_by: "[[C]]"'])],
      [C1, note(C1, "ACTUAL-C")],
      [C2, note(C2, "OTHER-C")],
    ]);
    const rows = [...view.contentEl.querySelectorAll(".rdi-att")];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.tagName).toBe("DIV"); // not a button: inert by construction
      expect(row.getAttribute("aria-disabled")).toBe("true");
      row.dispatchEvent(new Event("click", { bubbles: true }));
    }
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    expect(host.openSpy).not.toHaveBeenCalled();
    expect(host.workspace.opens).toEqual([]);
    expect(host.vault.writeCalls).toEqual([]);
    // §31: visible text semantics, not color-only
    const badges = rows.map((r) => r.querySelector(".rdi-badge")?.textContent);
    expect(badges).toEqual(["AMBIGUOUS", "BROKEN"]);
  });

  it("attention keeps RD-05 semantics in the real view: distinct E/F rows with raw labels", async () => {
    const { view } = await dashboard([
      [A, note(A, "ACTUAL-A", ["supported_by:", '  - "[[E]]"', '  - "[[F]]"'])],
    ]);
    const lines = [...view.contentEl.querySelectorAll(".rdi-att-line")].map(
      (el) => el.textContent,
    );
    expect(lines).toEqual(["E supports ACTUAL-A", "F supports ACTUAL-A"]);
  });
});

describe("accessibility smoke (§31)", () => {
  it("interactive rows are real buttons with accessible names", async () => {
    const { view } = await dashboard([
      [A, note(A, "ACTUAL-A", ['contradicted_by: "[[B]]"'])],
      [B, note(B, "ACTUAL-B")],
    ]);
    const buttons = [...view.contentEl.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const name = btn.getAttribute("aria-label") ?? btn.textContent ?? "";
      expect(name.trim().length).toBeGreaterThan(0);
    }
    const caseBtn = view.contentEl.querySelector<HTMLButtonElement>(".rdi-case");
    expect(caseBtn?.getAttribute("aria-label")).toContain("Open case");
  });
});
