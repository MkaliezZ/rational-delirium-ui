import { afterEach, describe, expect, it, vi } from "vitest";
import type { App, WorkspaceLeaf } from "obsidian";
import { ObsidianNavigationPort } from "../src/platform/obsidian-navigation";
import { TFile, MarkdownView } from "./support/fake-obsidian-api";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";
import type { WorkspaceLeaf as LeafType } from "obsidian";
import {
  RDGraphIntelligenceView,
} from "../src/views/graph-intelligence-view";

/* ------------------------------------------------------------------ */
/* GI-01 / GI-03: real ObsidianNavigationPort.openLocalGraph behavior */
/* ------------------------------------------------------------------ */

class FakeLeaf {
  view = new MarkdownView(() => "");
  async openFile(file: TFile): Promise<void> {
    (this.view as unknown as { file: TFile | null }).file = file;
  }
}

class FakeGraphApp {
  readonly vault: {
    files: Map<string, TFile>;
    getAbstractFileByPath: (path: string) => TFile | null;
    create: () => never;
  };
  readonly workspace: {
    leaves: FakeLeaf[];
    activeFilePath: string | null;
    getLeaf: (mode: boolean | string) => FakeLeaf | null;
    revealLeaf: (leaf: FakeLeaf) => void;
    getActiveFile: () => { path: string } | null;
    openLinkTextCalls: string[];
    openLinkText: (linktext: string) => Promise<void>;
  };
  readonly commands: { executeCommandById: (id: string) => unknown };
  commandBehavior: () => unknown = () => true;

  constructor() {
    const files = new Map<string, TFile>();
    this.vault = {
      files,
      getAbstractFileByPath: (path: string) => files.get(path) ?? null,
      create: () => { throw new Error("Vault.create must never run"); },
    };
    const leaves: FakeLeaf[] = [];
    let activeFilePath: string | null = null;
    this.workspace = {
      leaves,
      activeFilePath,
      getLeaf: (mode: boolean | string) => {
        void mode;
        const leaf = new FakeLeaf();
        leaves.push(leaf);
        (this.workspace as { activeFilePath: string | null }).activeFilePath = null;
        // openFile binds the view file; the anchor check reads the
        // ACTIVE file, simulated below via activeFilePath writes.
        const orig = leaf.openFile.bind(leaf);
        leaf.openFile = async (file: TFile) => {
          await orig(file);
          (this.workspace as { activeFilePath: string | null }).activeFilePath = file.path;
        };
        return leaf;
      },
      revealLeaf: (leaf: FakeLeaf) => { void leaf; },
      getActiveFile: () =>
        (this.workspace as { activeFilePath: string | null }).activeFilePath !== null
          ? { path: (this.workspace as { activeFilePath: string | null }).activeFilePath as string }
          : null,
      openLinkTextCalls: [],
      openLinkText: (linktext: string) => {
        this.workspace.openLinkTextCalls.push(linktext);
        return Promise.resolve();
      },
    };
    this.commands = {
      executeCommandById: (id: string) => {
        if (id !== "graph:open-local") throw new Error("unknown command " + id);
        return this.commandBehavior();
      },
    };
  }
}

function makePort(): { port: ObsidianNavigationPort; app: FakeGraphApp } {
  const app = new FakeGraphApp();
  const port = new ObsidianNavigationPort(app as unknown as App);
  return { port, app };
}

describe("GI-01: exact TFile anchor (real port)", () => {
  it("SAFE path opens the exact file and dispatches only on success", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/SAFE.md", new TFile("CASES/SAFE.md"));
    app.commandBehavior = () => true;
    await expect(port.openLocalGraph("CASES/SAFE.md")).resolves.toBe("OPENED");
    expect(app.workspace.openLinkTextCalls).toEqual([]); // linktext API never used
  });

  it("`#` in the real filename is never reinterpreted and never creates a note", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/A#variant.md", new TFile("CASES/A#variant.md"));
    app.commandBehavior = () => true;
    await expect(port.openLocalGraph("CASES/A#variant.md")).resolves.toBe("OPENED");
    expect(app.workspace.openLinkTextCalls).toEqual([]);
    expect(app.workspace.leaves[0].view.file?.path).toBe("CASES/A#variant.md");
  });

  it("both A.md and A#variant.md exist: each opens exactly itself", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/A.md", new TFile("CASES/A.md"));
    app.vault.files.set("CASES/A#variant.md", new TFile("CASES/A#variant.md"));
    app.commandBehavior = () => true;
    await expect(port.openLocalGraph("CASES/A#variant.md")).resolves.toBe("OPENED");
    expect(app.workspace.leaves[0].view.file?.path).toBe("CASES/A#variant.md");
    await expect(port.openLocalGraph("CASES/A.md")).resolves.toBe("OPENED");
    expect(app.workspace.leaves[1].view.file?.path).toBe("CASES/A.md");
  });

  it("A.md absent + A#variant.md exists: variant path still exact", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/A#variant.md", new TFile("CASES/A#variant.md"));
    app.commandBehavior = () => true;
    await expect(port.openLocalGraph("CASES/A#variant.md")).resolves.toBe("OPENED");
    expect(app.workspace.leaves[0].view.file?.path).toBe("CASES/A#variant.md");
  });

  it("target deleted between lookup and open degrades to UNAVAILABLE", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/A.md", new TFile("CASES/A.md"));
    app.commandBehavior = () => true;
    // simulate deletion racing the open: getLeaf's openFile fails
    const leaf = app.workspace.getLeaf(false);
    void leaf;
    app.vault.files.delete("CASES/A.md");
    app.workspace.getLeaf = () => {
      throw new Error("leaf unavailable after deletion");
    };
    await expect(port.openLocalGraph("CASES/A.md")).resolves.toBe("UNAVAILABLE");
  });

  it("anchor mismatch (active path differs) returns UNAVAILABLE before dispatch", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/A.md", new TFile("CASES/A.md"));
    let dispatched = false;
    app.commandBehavior = () => { dispatched = true; return true; };
    // sabotage the anchor: openFile leaves active file null (race)
    app.workspace.getLeaf = () => {
      const leaf = new FakeLeaf();
      leaf.openFile = async () => {
        /* active file never set — simulates a lost race */
      };
      return leaf;
    };
    await expect(port.openLocalGraph("CASES/A.md")).resolves.toBe("UNAVAILABLE");
    expect(dispatched).toBe(false);
  });
});

describe("GI-03: command dispatch result handling (real port)", () => {
  it("true → OPENED", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/SAFE.md", new TFile("CASES/SAFE.md"));
    app.commandBehavior = () => true;
    await expect(port.openLocalGraph("CASES/SAFE.md")).resolves.toBe("OPENED");
  });

  it("false → UNAVAILABLE (no throw)", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/SAFE.md", new TFile("CASES/SAFE.md"));
    app.commandBehavior = () => false;
    await expect(port.openLocalGraph("CASES/SAFE.md")).resolves.toBe("UNAVAILABLE");
  });

  it("throw → UNAVAILABLE", async () => {
    const { port, app } = makePort();
    app.vault.files.set("CASES/SAFE.md", new TFile("CASES/SAFE.md"));
    app.commandBehavior = () => { throw new Error("command failed"); };
    await expect(port.openLocalGraph("CASES/SAFE.md")).resolves.toBe("UNAVAILABLE");
  });

  it("missing command surface → UNAVAILABLE", async () => {
    const app = new FakeGraphApp();
    const bare = { vault: app.vault, workspace: app.workspace } as unknown as App;
    const port = new ObsidianNavigationPort(bare);
    app.vault.files.set("CASES/SAFE.md", new TFile("CASES/SAFE.md"));
    await expect(port.openLocalGraph("CASES/SAFE.md")).resolves.toBe("UNAVAILABLE");
  });
});

/* ------------------------------------------------------------------ */
/* GI-02 / GI-04: real view DOM structure, focus, root-bound state    */
/* ------------------------------------------------------------------ */

const A = "CASES/A.md", B = "EVIDENCE/B.md", C = "CASES/C.md";

const hosts: ProductionAcceptanceHost[] = [];
const views: RDGraphIntelligenceView[] = [];

const note = (path: string, id: string, fm: string[] = [], body: string[] = []) =>
  fixtureNote({
    path,
    type: path.startsWith("CASES/") ? "case" : "evidence",
    id, frontmatterExtra: fm, body: body.join("\n"),
  });

afterEach(async () => {
  for (const v of views.splice(0)) await v.onClose();
  for (const h of hosts.splice(0)) await h.close();
});

describe("GI-02: interactive DOM structure (real view)", () => {
  it("no focusable interactive element nests inside another (button button = 0)", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B", [], ["observed_in: [[C]]"])],
      [C, note(C, "CASE-C")],
    ]);
    const view = new RDGraphIntelligenceView({} as LeafType, {
      index: host.wiring.index,
      onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
      activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
      navigation: host.navigation,
    });
    views.push(view);
    await view.onOpen();
    const nested = view.contentEl.querySelectorAll("button button");
    expect(nested.length).toBe(0);
    // endpoint and disclosure are separate reachable siblings
    const row = view.contentEl.querySelector(".rdg-rel")!;
    expect(row.tagName).toBe("DIV");
    expect(row.querySelector(".rdg-endpoint")).toBeInstanceOf(HTMLButtonElement);
    expect(row.querySelector(".rdg-hop-toggle")).toBeInstanceOf(HTMLButtonElement);
    // unresolved rows never gain fake buttons
  });

  it("unresolved rows contain no interactive controls at all", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, note(A, "CASE-A", ['supports: "[[E]]"'])],
    ]);
    const view = new RDGraphIntelligenceView({} as LeafType, {
      index: host.wiring.index,
      onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
      activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
      navigation: host.navigation,
    });
    views.push(view);
    await view.onOpen();
    const row = view.contentEl.querySelector(".rdg-rel")!;
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.querySelectorAll("button").length).toBe(0);
  });

  it("expand/collapse restore focus to the same disclosure toggle; aria-expanded updates; no endpoint navigation", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, note(A, "CASE-A", ['supports: "[[B]]"'])],
      [B, note(B, "EV-B", [], ["observed_in: [[C]]"])],
      [C, note(C, "CASE-C")],
    ]);
    const view = new RDGraphIntelligenceView({} as LeafType, {
      index: host.wiring.index,
      onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
      activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
      navigation: host.navigation,
    });
    views.push(view);
    await view.onOpen();

    const before = host.openSpy.mock.calls.length;
    const toggle = view.contentEl.querySelector<HTMLButtonElement>(".rdg-hop-toggle");
    toggle!.focus();
    expect(document.activeElement).toBe(toggle);
    expect(toggle!.getAttribute("aria-expanded")).toBe("false");

    toggle!.click(); // expand
    await new Promise((r) => setTimeout(r, 10));
    const expandedToggle = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-hop-toggle")]
      .find((t) => t.dataset.neighborPath === B);
    expect(expandedToggle).toBeDefined();
    expect(expandedToggle!.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(expandedToggle); // focus restored

    expandedToggle!.click(); // collapse
    await new Promise((r) => setTimeout(r, 10));
    const collapsedToggle = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdg-hop-toggle")]
      .find((t) => t.dataset.neighborPath === B);
    expect(collapsedToggle!.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(collapsedToggle); // focus restored
    // disclosure never triggered endpoint navigation
    expect(host.openSpy.mock.calls.length).toBe(before);
  });
});

describe("GI-04: root-specific native graph state (real view)", () => {
  function makeView(host: ProductionAcceptanceHost, openLocalGraph: (path: string) => Promise<"OPENED" | "UNAVAILABLE">): RDGraphIntelligenceView {
    const view = new RDGraphIntelligenceView({} as LeafType, {
      index: host.wiring.index,
      onIndexCommit: (cb: () => void) => host.wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => host.wiring.onActiveFile(cb),
      activeFileProvider: () => host.workspace.getActiveFile()?.path ?? null,
      navigation: {
        open: (t: Parameters<typeof host.navigation.open>[0], m: Parameters<typeof host.navigation.open>[1]) => host.navigation.open(t, m),
        activeSurface: () => host.navigation.activeSurface(),
        openLocalGraph,
      },
    });
    views.push(view);
    return view;
  }

  it("unavailable state disappears after switching root (selector + follow)", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, note(A, "CASE-A")],
      [B, note(B, "EV-B")],
    ]);
    const view = makeView(host, () => Promise.resolve("UNAVAILABLE"));
    await view.onOpen();

    view.contentEl.querySelector<HTMLButtonElement>(".rdg-native")!.click();
    await new Promise((r) => setTimeout(r, 10));
    expect(view.contentEl.textContent).toContain("Native Local Graph unavailable.");

    // selector-driven switch to B (same code path as a selector pick)
    view.selectObject(B);
    expect(view.contentEl.textContent).not.toContain("Native Local Graph unavailable.");

    // make B unavailable too, then FOLLOW-driven switch back to A
    view.contentEl.querySelector<HTMLButtonElement>(".rdg-native")!.click();
    await new Promise((r) => setTimeout(r, 10));
    expect(view.contentEl.textContent).toContain("Native Local Graph unavailable.");
    host.workspace.fireFileOpen(A);
    await new Promise((r) => setTimeout(r, 0));
    expect(view.contentEl.textContent).not.toContain("Native Local Graph unavailable.");
  });

  it("stale async result from root A does not overwrite root B state", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, note(A, "CASE-A")],
      [B, note(B, "EV-B")],
    ]);
    let resolveA: (v: "OPENED" | "UNAVAILABLE") => void = () => {};
    const view = makeView(host, (path) =>
      path === A
        ? new Promise<"OPENED" | "UNAVAILABLE">((res) => { resolveA = res; })
        : Promise.resolve("OPENED"));
    await view.onOpen();

    // start pending request on A, then switch to B
    view.contentEl.querySelector<HTMLButtonElement>(".rdg-native")!.click();
    view.selectObject(B);
    expect(view.selected).toBe(B);

    // delayed A result resolves as UNAVAILABLE — must be ignored
    resolveA("UNAVAILABLE");
    await new Promise((r) => setTimeout(r, 10));
    expect(view.contentEl.textContent).not.toContain("Native Local Graph unavailable.");
  });
});
