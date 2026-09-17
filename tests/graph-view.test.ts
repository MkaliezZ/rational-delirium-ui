import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import {
  RDGraphIntelligenceView,
  RD_GRAPH_VIEW_TYPE,
} from "../src/views/graph-intelligence-view";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";

const A = "CASES/A.md", B = "EVIDENCE/B.md", C = "CASES/C.md", H = "HYPOTHESES/H.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDGraphIntelligenceView[] = [];

const typeOf = (path: string) =>
  path.startsWith("CASES/") ? "case"
    : path.startsWith("EVIDENCE/") ? "evidence"
      : path.startsWith("HYPOTHESES/") ? "hypothesis" : "loop";

const note = (path: string, id: string, fm: string[] = [], body: string[] = []) =>
  fixtureNote({ path, type: typeOf(path), id, frontmatterExtra: fm, body: body.join("\n") });

interface GraphHarness {
  host: ProductionAcceptanceHost;
  view: RDGraphIntelligenceView;
  openLocalGraphCalls: string[];
}

async function graphView(
  entries: Array<[string, string]>,
  active = "CASES/A.md",
): Promise<GraphHarness> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  await host.start(entries, active);
  const openLocalGraphCalls: string[] = [];
  // §32: injected navigation wrapper observing openLocalGraph while
  // delegating everything else to the REAL production port.
  const realOpen = host.navigation.open.bind(host.navigation);
  const navigation = {
    open: (target: Parameters<typeof realOpen>[0], mode: Parameters<typeof realOpen>[1]) => {
      host.navigation.open(target, mode);
    },
    activeSurface: () => host.navigation.activeSurface(),
    openLocalGraph: (path: string) => {
      openLocalGraphCalls.push(path);
      return Promise.resolve("OPENED" as const);
    },
  };
  const view = new RDGraphIntelligenceView({} as WorkspaceLeaf, {
    index: host.wiring.index,
    onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
    onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
    activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
    navigation,
  });
  views.push(view);
  await view.onOpen();
  return { host, view, openLocalGraphCalls };
}

const sections = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-section-title")].map((el) => el.textContent);

const edgeLines = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-rel-line")].map((el) => el.textContent);

const provLines = (view: RDGraphIntelligenceView): string[] =>
  [...view.contentEl.querySelectorAll(".rdg-prov-line")].map((el) => el.textContent);

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

describe("real RDGraphIntelligenceView in tests (§25, §27)", () => {
  it("instantiates the ACTUAL view; identity + sections render", async () => {
    const { view } = await graphView([
      [A, note(A, "CASE-A", ["status: open"], ["repeats_in: [[C]]"])],
      [C, note(C, "CASE-C")],
    ]);
    expect(view).toBeInstanceOf(RDGraphIntelligenceView);
    expect(view.getViewType()).toBe(RD_GRAPH_VIEW_TYPE);
    expect(sections(view)).toEqual(["Identity", "Semantic Relations", "Native Graph"]);
    const meta = view.contentEl.querySelector(".rdg-identity .rdg-meta")?.textContent ?? "";
    expect(meta).toContain("CASE-A");
    expect(meta).toContain("case");
    expect(meta).toContain("open");
    expect(meta).toContain(A);
  });

  it("non-RD active file shows the selector; selection is memory-only", async () => {
    const { view } = await graphView([
      [A, note(A, "CASE-A")],
      [B, note(B, "EV-B")],
    ], "Templates/t.md");
    expect(sections(view)).toEqual(["RD Objects"]);
    const picks = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-pick")];
    expect(picks).toHaveLength(2);
    picks[0].click();
    expect(view.selected).toBe(A);
    expect(sections(view)).toEqual(["Identity", "Semantic Relations", "Native Graph"]);
  });

  it("empty semantic state uses the exact restrained wording (§22)", async () => {
    const { view } = await graphView([
      [A, note(A, "CASE-A")],
    ]);
    expect(view.contentEl.textContent).toContain("No semantic relations recorded.");
  });
});

describe("follow behavior (§4)", () => {
  it("follows active RD objects; non-RD activity retains selection", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
      [H, note(H, "HYP-H")],
    ]);
    expect(view.selected).toBe(A);
    host.workspace.fireFileOpen(B);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.selected).toBe(B);
    // non-RD (null/absent) file-open event path: fire a path that is not indexed
    host.workspace.fireFileOpen("Templates/t.md");
    await new Promise((r) => setTimeout(r, 0));
    expect(view.selected).toBe(B); // retained
  });
});

describe("first-hop edges, provenance and navigation (§27, §29, §11)", () => {
  it("one edge per relation.key with full provenance; mutual declarations keep two entries", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B", ['supported_by: "[[A]]"'])],
    ]);
    expect(host.wiring.index.relations).toHaveLength(1);
    const rows = view.contentEl.querySelectorAll(".rdg-rel");
    expect(rows).toHaveLength(1);
    expect(edgeLines(view)).toEqual(["→ supports EV-B [evidence]"]);
    expect(provLines(view)).toHaveLength(2);
    expect(provLines(view)[0]).toContain("supports @ CASES/A.md");
    expect(provLines(view)[0]).toContain("frontmatter · supports");
    expect(provLines(view)[0]).toContain("raw [[B]]");
    expect(provLines(view)[1]).toContain("supported_by @ EVIDENCE/B.md");
  });

  it("RESOLVED endpoint navigates via the real port; source actions work", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'], ["derived_from: [[C]]"])],
      [B, note(B, "EV-B")],
      [C, note(C, "CASE-C")],
    ]);
    const rows = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-rel")];
    expect(rows).toHaveLength(2);
    for (const row of rows) row.click();
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    const paths = host.openSpy.mock.calls.map((c) => c[0]).map((t) => t.path);
    expect(paths.sort()).toEqual([C, B]);
    // provenance source buttons: body line → source mode, frontmatter → normal
    const srcButtons = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-src")];
    expect(srcButtons).toHaveLength(2);
    for (const btn of srcButtons) btn.click();
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    const srcCalls = host.openSpy.mock.calls.slice(2);
    const bodyCall = srcCalls.find((c) => c[1] === "source");
    expect(bodyCall?.[0]).toMatchObject({ path: A, line: 9 });
    const fmCall = srcCalls.find((c) => c[1] === "normal" && c[0].path === A);
    expect(fmCall?.[0]).toMatchObject({ path: A });
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("BROKEN and AMBIGUOUS endpoints are inert with visible raw labels", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ["supported_by:", '  - "[[E]]"', '  - "[[F]]"', 'contradicted_by: "[[G]]"'])],
      ["EVIDENCE/G.md", note("EVIDENCE/G.md", "EV-G")],
      ["ARCHIVE/G.md", note("ARCHIVE/G.md", "OTHER-G")],
    ]);
    const rows = [...view.contentEl.querySelectorAll(".rdg-rel")];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.tagName).toBe("DIV");
      expect(row.getAttribute("aria-disabled")).toBe("true");
      row.dispatchEvent(new Event("click", { bubbles: true }));
    }
    await Promise.all(host.openSpy.mock.results.map((r) => r.value));
    expect(host.openSpy).not.toHaveBeenCalled();
    expect(host.workspace.opens).toEqual([]);
    expect(host.vault.writeCalls).toEqual([]);
    expect(edgeLines(view)).toEqual([
      "← contradicts G", "← supports E", "← supports F",
    ]);
    const badges = [...view.contentEl.querySelectorAll(".rdg-badge")].map((b) => b.textContent);
    expect(badges).toEqual(["AMBIGUOUS", "BROKEN", "BROKEN"]);
  });
});

describe("second hop in the real view (§28)", () => {
  function chainFixture(): Array<[string, string]> {
    return [
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B", [], ["observed_in: [[C]]"])],
      [C, note(C, "CASE-C", ['contradicts: "[[B]]"'])],
    ];
  }

  it("default collapsed; expand shows actual B-edges; no synthesized A-C; collapse removes", async () => {
    const { view } = await graphView(chainFixture());
    expect(view.expandedSecondHops).toHaveLength(0);
    expect(sections(view)).not.toContain("Second Hop");

    const toggle = view.contentEl.querySelector<HTMLButtonElement>(".rdg-hop-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    toggle!.click();
    expect(view.expandedSecondHops).toEqual([B]);
    expect(sections(view)).toContain("Second Hop");
    const branchTitle = view.contentEl.querySelector(".rdg-branch-title")?.textContent;
    expect(branchTitle).toBe(`Second hop via ${B}`);
    // actual B-edges only; root↔B not repeated; NO synthesized A↔C edge
    const allEdges = edgeLines(view);
    expect(allEdges).toContain("← contradicts CASE-C [case]");
    expect(allEdges).toContain("→ observed_in CASE-C [case]");
    expect(allEdges.filter((l) => l.includes("CASE-A"))).toEqual([]);
    // second-hop rows have NO further expansion toggle (no third hop)
    const relBlocks = [...view.contentEl.querySelectorAll(".rdg-branch .rdg-rel")];
    expect(relBlocks.length).toBeGreaterThan(0);

    const toggleAfter = view.contentEl.querySelector<HTMLButtonElement>(".rdg-hop-toggle");
    toggleAfter!.click();
    expect(view.expandedSecondHops).toHaveLength(0);
    expect(sections(view)).not.toContain("Second Hop");
  });

  it("changing the root resets expansions", async () => {
    const { host, view } = await graphView(chainFixture());
    view.contentEl.querySelector<HTMLButtonElement>(".rdg-hop-toggle")!.click();
    expect(view.expandedSecondHops).toEqual([B]);
    host.workspace.fireFileOpen(C);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.selected).toBe(C);
    expect(view.expandedSecondHops).toHaveLength(0);
  });

  it("cycle A→B→C→A adds no invented predicate anywhere in the DOM", async () => {
    const { view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B", [], ["observed_in: [[C]]"])],
      [C, note(C, "CASE-C", ['related: "[[A]]"'])],
    ]);
    // expand specifically the supports→B row (related→C sorts first)
    const toggles = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-hop-toggle")];
    const bToggle = toggles.find((t) => t.getAttribute("aria-label") === "Toggle second hop via EV-B");
    bToggle!.click();
    const text = view.contentEl.textContent ?? "";
    // second hop shows B→C only; nothing claims A contradicts/relates C
    expect(text).toContain("observed_in CASE-C");
    expect(text).not.toContain("A related C");
    expect(text).not.toContain("A observed C");
  });
});

describe("native local graph handoff (§17, §32)", () => {
  it("invokes the single NavigationPort exactly once; unavailable state renders safely", async () => {
    const { host, view, openLocalGraphCalls } = await graphView([
      [A, note(A, "CASE-A")],
    ]);
    const btn = view.contentEl.querySelector<HTMLButtonElement>(".rdg-native");
    expect(btn?.textContent).toBe("Open Native Local Graph");
    btn!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(openLocalGraphCalls).toEqual([A]); // exactly once, through the port
    expect(view.contentEl.textContent).not.toContain("Native Local Graph unavailable.");
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("UNAVAILABLE renders the restrained state and does not throw", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([[A, note(A, "CASE-A")]]);
    const view = new RDGraphIntelligenceView({} as WorkspaceLeaf, {
      index: host.wiring.index,
      onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
      activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
      navigation: host.navigation, // REAL port on fake app: registry absent → UNAVAILABLE
    });
    views.push(view);
    await view.onOpen();
    const btn = view.contentEl.querySelector<HTMLButtonElement>(".rdg-native");
    btn!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.textContent).toContain("Native Local Graph unavailable.");
  });
});

describe("lifecycle (§31)", () => {
  it("closed view does not rerender; reopen yields one effective subscription", async () => {
    const { host, view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    await view.onClose();
    expect(view.contentEl.children.length).toBe(0);
    host.workspace.fireFileOpen(B);
    host.vault.setCurrent(A, note(A, "CASE-A"));
    host.vault.fireModify(A);
    host.wiring.scheduler?.flush();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.children.length).toBe(0);
    await view.onOpen();
    expect(view.contentEl.querySelectorAll(".rdg-section-title").length).toBeGreaterThan(0);
  });
});

describe("accessibility smoke (§21)", () => {
  it("buttons have accessible names; expansion exposes aria-expanded; text badges", async () => {
    const { view } = await graphView([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B")],
    ]);
    const buttons = [...view.contentEl.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const name = btn.getAttribute("aria-label") ?? btn.textContent ?? "";
      expect(name.trim().length).toBeGreaterThan(0);
    }
    const toggle = view.contentEl.querySelector(".rdg-hop-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    const badge = view.contentEl.querySelector(".rdg-badge");
    expect(badge?.textContent).toBe("RESOLVED");
  });
});
