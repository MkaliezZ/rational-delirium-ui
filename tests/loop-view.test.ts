import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { RDLoopView, RD_LOOP_VIEW_TYPE } from "../src/views/loop-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const L = "LOOPS/L.md", L2 = "LOOPS/L2.md", A = "CASES/A.md";
const B = "EVIDENCE/B.md", H = "HYPOTHESES/H.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDLoopView[] = [];

const typeOf = (path: string) =>
  path.startsWith("CASES/") ? "case"
    : path.startsWith("EVIDENCE/") ? "evidence"
      : path.startsWith("HYPOTHESES/") ? "hypothesis" : "loop";

/** repeats_in / observed_in are BODY predicates; others frontmatter. */
const note = (path: string, id: string, fm: string[] = [], body: string[] = []) =>
  fixtureNote({ path, type: typeOf(path), id, frontmatterExtra: fm, body: body.join("\n") });

async function loopWorkspace(
  entries: Array<[string, string]>,
  active = "CASES/A.md",
): Promise<{ host: ProductionAcceptanceHost; view: RDLoopView }> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  await host.start(entries, active);
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

const sections = (view: RDLoopView): string[] =>
  [...view.contentEl.querySelectorAll(".rdl-section-title")].map((el) => el.textContent);

const rowLines = (view: RDLoopView): string[] =>
  [...view.contentEl.querySelectorAll(".rdl-rel-line")].map((el) => el.textContent);

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

describe("real RDLoopView in tests (§21)", () => {
  it("instantiates the ACTUAL view; active LOOP renders all five areas", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1", ["status: open", "last_verified: 2026-09-01"], ["repeats_in: [[A]]", "observed_in: [[B]]"])],
      [A, note(A, "CASE-1")],
      [B, note(B, "EV-1")],
    ], L);
    expect(view).toBeInstanceOf(RDLoopView);
    expect(view.getViewType()).toBe(RD_LOOP_VIEW_TYPE);
    expect(view.getDisplayText()).toBe("RD Loop Workspace");
    expect(sections(view)).toEqual([
      "Identity", "Recurrences", "Evidence", "Hypotheses", "Related Cases",
    ]);
    expect(view.contentEl.querySelector(".rdl-identity-title")?.textContent)
      .toBe("LOOP-1 — fixture");
    // LOOP-02: canonical fields incl. path visibly rendered
    const meta = view.contentEl.querySelector(".rdl-identity .rdl-meta")?.textContent ?? "";
    expect(meta).toContain("LOOP-1");
    expect(meta).toContain("open");
    expect(meta).toContain(L);
    expect(meta).toContain("verified 2026-09-01");
  });

  it("non-LOOP active file shows the restrained LOOP selector", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1")],
      [A, note(A, "CASE-1")],
    ], A);
    expect(sections(view)).toEqual(["Loops"]);
    const picks = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdl-loop-pick")];
    expect(picks).toHaveLength(1);
    picks[0].click();
    expect(view.selectedLoop).toBe(L);
    expect(sections(view)).toEqual([
      "Identity", "Recurrences", "Evidence", "Hypotheses", "Related Cases",
    ]);
  });

  it("empty states render restrained texts (§19)", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1")],
    ], L);
    const states = [...view.contentEl.querySelectorAll(".rdl-state")].map((e) => e.textContent);
    expect(states).toEqual([
      "No recurrences recorded.", "No connected evidence.",
      "No connected hypotheses.", "No related cases.",
    ]);
  });

  it("no loops at all → No LOOP selected.", async () => {
    const { view } = await loopWorkspace([[A, note(A, "CASE-1")]], A);
    expect(view.contentEl.textContent).toContain("No LOOP selected.");
  });
});

describe("loop workspace follow behavior (§24)", () => {
  it("active LOOP changes update the workspace; non-LOOP retains selection", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]"])],
      [L2, note(L2, "LOOP-2", [], ["repeats_in: [[F]]"])],
      [A, note(A, "CASE-1")],
    ], L);
    expect(view.selectedLoop).toBe(L);
    expect(rowLines(view)).toEqual(["→ repeats_in E"]);

    // active LOOP B → workspace updates
    host.workspace.fireFileOpen(L2);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.selectedLoop).toBe(L2);
    expect(rowLines(view)).toEqual(["→ repeats_in F"]);

    // active non-LOOP → selection retained
    host.workspace.fireFileOpen(A);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.selectedLoop).toBe(L2);
    expect(rowLines(view)).toEqual(["→ repeats_in F"]);
  });
});

describe("loop workspace navigation safety (§15, §23)", () => {
  it("resolved CASE / EVIDENCE / HYPOTHESIS rows navigate through the established port", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", ['related: "[[H]]"'], ["repeats_in: [[A]]", "observed_in: [[B]]"])],
      [A, note(A, "CASE-1")],
      [B, note(B, "EV-1")],
      [H, note(H, "HYP-1")],
    ], L);
    // LOOP-01: 3 normalized relations -> exactly 3 visible rows
    expect(host.wiring.index.relations).toHaveLength(3);
    const rows = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdl-rel")];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.tagName).toBe("BUTTON");
      row.click();
    }
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    // single-owner: observed_in/repeats_in live in Recurrences (key-sorted),
    // related H lives in Hypotheses; Evidence/Cases are truthfully empty.
    const paths = host.openSpy.mock.calls.map((c) => c[0]).map((t) => t.path);
    expect(paths).toEqual([B, A, H]);
    expect(host.vault.writeCalls).toEqual([]);
    const sectionRows = (title: string) => {
      const sec = [...view.contentEl.querySelectorAll(".rdl-section")]
        .find((x) => x.querySelector(".rdl-section-title")?.textContent === title);
      return sec?.querySelectorAll(".rdl-rel").length ?? 0;
    };
    expect(sectionRows("Recurrences")).toBe(2);
    expect(sectionRows("Evidence")).toBe(0);
    expect(sectionRows("Hypotheses")).toBe(1);
    expect(sectionRows("Related Cases")).toBe(0);
  });

  it("BROKEN and AMBIGUOUS rows are inert; E/F stay distinct with raw labels (§14)", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]", "repeats_in: [[F]]", "observed_in: [[C]]"])],
      ["EVIDENCE/C.md", note("EVIDENCE/C.md", "EV-C")],
      ["ARCHIVE/C.md", note("ARCHIVE/C.md", "OTHER-C")],
    ], L);
    const rows = [...view.contentEl.querySelectorAll(".rdl-rel")];
    expect(rows).toHaveLength(3);
    const badges = rows.map((r) => r.querySelector(".rdl-badge")?.textContent);
    expect(badges).toEqual(["AMBIGUOUS", "BROKEN", "BROKEN"]);
    for (const row of rows) {
      expect(row.tagName).toBe("DIV");
      expect(row.getAttribute("aria-disabled")).toBe("true");
      row.dispatchEvent(new Event("click", { bubbles: true }));
    }
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    expect(host.openSpy).not.toHaveBeenCalled();
    expect(host.workspace.opens).toEqual([]);
    expect(host.vault.writeCalls).toEqual([]);
    const labels = rows.map((r) => r.querySelector(".rdl-rel-line")?.textContent);
    expect(labels).toEqual(["→ observed_in C", "→ repeats_in E", "→ repeats_in F"]);
  });
});

describe("loop workspace lifecycle (§26)", () => {
  it("closed view does not rerender; reopen yields one effective subscription", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[E]]"])],
      [A, note(A, "CASE-1")],
    ], L);
    await view.onClose();
    expect(view.contentEl.children.length).toBe(0);

    host.vault.setCurrent(L, note(L, "LOOP-1", [], ["repeats_in: [[F]]"]));
    host.vault.fireModify(L);
    host.wiring.scheduler?.flush();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.children.length).toBe(0);

    // reopen: exactly one effective subscription per stream
    await view.onOpen();
    expect(view.contentEl.querySelectorAll(".rdl-section-title").length).toBeGreaterThan(0);
    host.workspace.fireFileOpen(A); // non-LOOP: retained, no error
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.children.length).toBeGreaterThan(0);
  });
});

describe("loop workspace accessibility smoke (§29)", () => {
  it("interactive rows are real buttons with accessible names and text badges", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1", [], ["repeats_in: [[A]]"])],
      [A, note(A, "CASE-1")],
    ], L);
    const buttons = [...view.contentEl.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const name = btn.getAttribute("aria-label") ?? btn.textContent ?? "";
      expect(name.trim().length).toBeGreaterThan(0);
    }
    const badge = view.contentEl.querySelector(".rdl-badge");
    expect(badge?.textContent).toBe("RESOLVED"); // visible text, not color-only
  });
});

describe("LOOP-02: Identity path rendering (real view)", () => {
  const identityMeta = (view: RDLoopView): string =>
    view.contentEl.querySelector(".rdl-identity .rdl-meta")?.textContent ?? "";

  it("identity shows id, status, path; lastVerified only when available", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1", ["status: open"])],
    ], L);
    const meta = identityMeta(view);
    expect(meta).toContain("LOOP-1");
    expect(meta).toContain("open");
    expect(meta).toContain(L);
    expect(meta).not.toContain("verified");
  });

  it("select/follow LOOP A → LOOP B updates the visible path (same title, different path)", async () => {
    const { host, view } = await loopWorkspace([
      [L, note(L, "Twin Loop", ["status: open"])],
      [L2, note(L2, "Twin Loop", ["status: open"])],
    ], L);
    expect(view.contentEl.querySelector(".rdl-identity-title")?.textContent).toBe("Twin Loop — fixture");
    expect(identityMeta(view)).toContain(L);
    expect(identityMeta(view)).not.toContain(L2);

    host.workspace.fireFileOpen(L2);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.querySelector(".rdl-identity-title")?.textContent).toBe("Twin Loop — fixture");
    expect(identityMeta(view)).toContain(L2);
    expect(identityMeta(view)).not.toContain(L);
  });

  it("selector click also updates the visible path", async () => {
    const { view } = await loopWorkspace([
      [L, note(L, "LOOP-1")],
      [L2, note(L2, "LOOP-2")],
    ], A);
    expect(identityMeta(view)).toBe(""); // selector mode: no identity yet
    const picks = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdl-loop-pick")];
    picks[1].click();
    expect(identityMeta(view)).toContain(L2);
  });
});
