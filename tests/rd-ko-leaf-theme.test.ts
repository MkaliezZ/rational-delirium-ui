/** V2-05 — RD Knowledge Object markdown presentation isolation.
 *
 * With the Rational Archive shell active, a REAL RD Knowledge
 * Object opened in a markdown leaf must wear the archival
 * material, while ordinary notes and third-party views stay in the
 * host theme (V2-03 preserved). The marker owner is
 * RDKoLeafThemeController (src/architecture/rd-ko-leaf-theme.ts):
 * event-driven only (file-open / active-leaf-change /
 * layout-change / vault modify), per-leaf generation-guarded async
 * reads, plugin-scoped listeners, markers stripped on unload.
 *
 * Covers the task's behaviors A–J.
 */

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RDKoLeafThemeController,
  RD_KO_LEAF_CLASS,
  isKoMarkdownText,
} from "../src/architecture/rd-ko-leaf-theme";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/* ---------- fixtures ---------- */

const KO_TEXT = [
  "---",
  "object_id: ko-20260921-0001",
  "kind: hypothesis",
  "status: active",
  "title: Object A",
  "---",
  "",
  "# Object A",
  "",
  "A declared knowledge object.",
].join("\n");

const KO_TEXT_B = KO_TEXT.replace("ko-20260921-0001", "ko-20260921-0002")
  .replace(/Object A/g, "Object B");

const ORDINARY_TEXT = "# Ordinary Note\n\nThis is not an RD object.\n";

/* ---------- fakes ---------- */

type Handler = (...args: unknown[]) => void;

class FakeLeaf {
  readonly view: { file: { path: string } | null; containerEl: HTMLElement };
  constructor(path: string | null) {
    this.view = {
      file: path === null ? null : { path },
      containerEl: document.createElement("div"),
    };
  }
  get marked(): boolean {
    return this.view.containerEl.classList.contains(RD_KO_LEAF_CLASS);
  }
}

class FakeEventSource {
  readonly handlers = new Map<string, Handler[]>();
  on(event: string, cb: Handler): { source: FakeEventSource; event: string; cb: Handler } {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
    return { source: this, event, cb };
  }
  offref(ref: { source: FakeEventSource; event: string; cb: Handler }): void {
    const list = this.handlers.get(ref.event) ?? [];
    this.handlers.set(ref.event, list.filter((h) => h !== ref.cb));
  }
  fire(event: string, ...args: unknown[]): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(...args);
  }
  handlerCount(event: string): number {
    return (this.handlers.get(event) ?? []).length;
  }
}

class FakeWorkspace extends FakeEventSource {
  readonly leaves: FakeLeaf[] = [];
  private layoutReadyCb: (() => void) | null = null;
  getLeavesOfType(viewType: string): FakeLeaf[] {
    return viewType === "markdown" ? [...this.leaves] : [];
  }
  onLayoutReady(cb: () => void): void {
    this.layoutReadyCb = cb;
  }
  fireLayoutReady(): void {
    this.layoutReadyCb?.();
  }
}

class FakeVault extends FakeEventSource {
  readonly files = new Map<string, string>();
  /** Optional deferred reads for the stale-read race test. */
  pendingRead: { promise: Promise<string>; resolve: (text: string) => void } | null = null;
  async cachedRead(file: { path: string }): Promise<string> {
    if (this.pendingRead !== null) {
      const p = this.pendingRead;
      this.pendingRead = null;
      return await p.promise;
    }
    return this.files.get(file.path) ?? "";
  }
  deferNextRead(): (text: string) => void {
    let resolve!: (text: string) => void;
    const promise = new Promise<string>((res) => { resolve = res; });
    this.pendingRead = { promise, resolve };
    return resolve;
  }
}

class FakePlugin {
  readonly app: { workspace: FakeWorkspace; vault: FakeVault };
  private readonly eventRefs: Array<{ source: FakeEventSource; event: string; cb: Handler }> = [];
  private readonly unloaders: Array<() => void> = [];
  constructor() {
    this.app = { workspace: new FakeWorkspace(), vault: new FakeVault() };
  }
  registerEvent(ref: { source: FakeEventSource; event: string; cb: Handler }): void {
    this.eventRefs.push(ref);
  }
  register(cb: () => void): void {
    this.unloaders.push(cb);
  }
  unload(): void {
    for (const cb of this.unloaders.splice(0)) cb();
    for (const ref of this.eventRefs.splice(0)) ref.source.offref(ref);
  }
}

function makeHost(): {
  plugin: FakePlugin;
  workspace: FakeWorkspace;
  vault: FakeVault;
  controller: RDKoLeafThemeController;
} {
  const plugin = new FakePlugin();
  const controller = new RDKoLeafThemeController(plugin as never);
  plugin.register(() => controller.dispose());
  controller.start();
  return { plugin, workspace: plugin.app.workspace, vault: plugin.app.vault, controller };
}

/* ---------- A: detection reuses the existing KO primitives ---------- */

describe("A — KO identification boundary", () => {
  it("A1. detection composes the existing ko-detail-reader primitives, no new parser", () => {
    const src = readFileSync(join(root, "src", "architecture", "rd-ko-leaf-theme.ts"), "utf-8");
    expect(src).toContain('from "../semantic-graph/ko-detail-reader"');
    expect(src).toContain("extractFrontmatterBlock");
    expect(src).toContain("parseKoFrontmatter");
    // no second frontmatter parser is copied into the controller
    expect(src).not.toMatch(/function parseKoFrontmatter/);
    expect(src).not.toMatch(/startsWith\("---/);
    // no path/filename/title heuristics
    expect(src).not.toMatch(/\.basename|\.extension|\.parent\b|split\("\/"\)/);
  });

  it("A2. a KO fixture note is identified; an ordinary note is not", () => {
    expect(isKoMarkdownText(KO_TEXT)).toBe(true);
    expect(isKoMarkdownText(KO_TEXT_B)).toBe(true);
    expect(isKoMarkdownText(ORDINARY_TEXT)).toBe(false);
    expect(isKoMarkdownText("")).toBe(false);
    // frontmatter without object_id is NOT a KO (parseKoFrontmatter null)
    expect(isKoMarkdownText("---\ntitle: Just a note\n---\n\nbody\n")).toBe(false);
  });
});

/* ---------- B–G: marker lifecycle over real workspace events ---------- */

describe("B–G — marker lifecycle", () => {
  it("B. a markdown leaf showing a KO receives the marker", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("HYPOTHESES/ko-20260921-0001.md", KO_TEXT);
    const leaf = new FakeLeaf("HYPOTHESES/ko-20260921-0001.md");
    workspace.leaves.push(leaf);
    workspace.fire("file-open");
    await controller.refresh();
    expect(leaf.marked).toBe(true);
  });

  it("C. an ordinary markdown leaf does NOT receive the marker", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("NON-RD-SMOKE.md", ORDINARY_TEXT);
    const leaf = new FakeLeaf("NON-RD-SMOKE.md");
    workspace.leaves.push(leaf);
    workspace.fire("file-open");
    await controller.refresh();
    expect(leaf.marked).toBe(false);
  });

  it("D. KO→ordinary (frontmatter edit) removes the marker via vault modify", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("note.md", KO_TEXT);
    const leaf = new FakeLeaf("note.md");
    workspace.leaves.push(leaf);
    await controller.refresh();
    expect(leaf.marked).toBe(true);
    vault.files.set("note.md", ORDINARY_TEXT);
    vault.fire("modify", { path: "note.md" });
    await vi.waitFor(() => expect(leaf.marked).toBe(false));
  });

  it("E. ordinary→KO (object_id added) applies the marker", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("note.md", ORDINARY_TEXT);
    const leaf = new FakeLeaf("note.md");
    workspace.leaves.push(leaf);
    await controller.refresh();
    expect(leaf.marked).toBe(false);
    vault.files.set("note.md", KO_TEXT);
    vault.fire("modify", { path: "note.md" });
    await vi.waitFor(() => expect(leaf.marked).toBe(true));
  });

  it("F. two leaves side by side (KO + ordinary) — only the KO leaf is marked", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("ko.md", KO_TEXT);
    vault.files.set("plain.md", ORDINARY_TEXT);
    const koLeaf = new FakeLeaf("ko.md");
    const plainLeaf = new FakeLeaf("plain.md");
    workspace.leaves.push(koLeaf, plainLeaf);
    workspace.fire("active-leaf-change");
    await controller.refresh();
    expect(koLeaf.marked).toBe(true);
    expect(plainLeaf.marked).toBe(false);
  });

  it("same leaf KO A→KO B keeps the marker", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("a.md", KO_TEXT);
    vault.files.set("b.md", KO_TEXT_B);
    const leaf = new FakeLeaf("a.md");
    workspace.leaves.push(leaf);
    await controller.refresh();
    expect(leaf.marked).toBe(true);
    leaf.view.file = { path: "b.md" };
    workspace.fire("file-open");
    await controller.refresh();
    expect(leaf.marked).toBe(true);
  });

  it("G1. leaf close strips the marker; no stale tracking", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("ko.md", KO_TEXT);
    const leaf = new FakeLeaf("ko.md");
    workspace.leaves.push(leaf);
    await controller.refresh();
    expect(leaf.marked).toBe(true);
    workspace.leaves.splice(workspace.leaves.indexOf(leaf), 1);
    workspace.fire("layout-change");
    await controller.refresh();
    expect(leaf.marked).toBe(false);
  });

  it("G2. plugin unload removes all markers and all listeners", async () => {
    const { plugin, workspace, vault, controller } = makeHost();
    vault.files.set("ko.md", KO_TEXT);
    const leaf = new FakeLeaf("ko.md");
    workspace.leaves.push(leaf);
    await controller.refresh();
    expect(leaf.marked).toBe(true);
    for (const event of ["file-open", "active-leaf-change", "layout-change"]) {
      expect(workspace.handlerCount(event)).toBeGreaterThan(0);
    }
    expect(vault.handlerCount("modify")).toBeGreaterThan(0);
    plugin.unload();
    expect(leaf.marked).toBe(false);
    for (const event of ["file-open", "active-leaf-change", "layout-change"]) {
      expect(workspace.handlerCount(event)).toBe(0);
    }
    expect(vault.handlerCount("modify")).toBe(0);
    // listeners are gone: a later vault event triggers no evaluation
    // (nothing fires the controller's refresh anymore)
    vault.fire("modify", { path: "ko.md" });
    expect(leaf.marked).toBe(false);
  });

  it("a late cachedRead completion cannot mis-mark a leaf (generation guard)", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("note.md", KO_TEXT);
    const leaf = new FakeLeaf("note.md");
    workspace.leaves.push(leaf);
    // first evaluation starts but its read is deferred
    const resolveStale = vault.deferNextRead();
    const stale = controller.refresh();
    // the note turns ordinary and a second evaluation completes
    vault.files.set("note.md", ORDINARY_TEXT);
    await controller.refresh();
    expect(leaf.marked).toBe(false);
    // the stale KO read resolves late — it must be dropped
    resolveStale(KO_TEXT);
    await stale;
    await controller.refresh();
    expect(leaf.marked).toBe(false);
  });

  it("the initial sweep runs on layout ready (restored leaves get marked)", async () => {
    const { workspace, vault, controller } = makeHost();
    vault.files.set("ko.md", KO_TEXT);
    const leaf = new FakeLeaf("ko.md");
    workspace.leaves.push(leaf);
    // no workspace event fired yet — only the restored layout
    workspace.fireLayoutReady();
    await controller.refresh();
    expect(leaf.marked).toBe(true);
  });

  it("no timers or polling inside the controller (event-driven only)", () => {
    const src = readFileSync(join(root, "src", "architecture", "rd-ko-leaf-theme.ts"), "utf-8");
    for (const banned of [
      "setTimeout", "setInterval", "requestAnimationFrame",
      "registerInterval", "MutationObserver",
    ]) {
      expect(src, `controller must not contain ${banned}`).not.toContain(banned);
    }
  });
});

/* ---------- wiring guard: created once in registerRDViews ---------- */

describe("controller wiring", () => {
  it("registerRDViews creates the controller and registers its dispose", () => {
    const src = readFileSync(join(root, "src", "architecture", "rd-view-setup.ts"), "utf-8");
    expect(src).toContain('from "./rd-ko-leaf-theme"');
    expect(src).toMatch(/new RDKoLeafThemeController\(plugin\)/);
    expect(src).toMatch(/plugin\.register\(\(\) => koLeafTheme\.dispose\(\)\)/);
    expect(src).toContain("koLeafTheme.start()");
  });
});

/* ---------- H–J: stylesheet boundary ---------- */

function parseRules(source: string): { selector: string; body: string }[] {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "")
    .replace(/@keyframes[^{]*\{/g, "")
    .replace(/@supports[^{]*\{/g, "");
  const rules: { selector: string; body: string }[] = [];
  for (const chunk of cleaned.split("}")) {
    const idx = chunk.indexOf("{");
    if (idx === -1) continue;
    const selector = chunk.slice(0, idx).trim();
    const body = chunk.slice(idx + 1);
    if (selector === "" || selector.startsWith("@")) continue;
    if (selector === "from" || selector === "to" || /^\d+(\.\d+)?%$/.test(selector)) continue;
    for (const part of selector.split(",")) {
      const s = part.trim();
      if (s !== "") rules.push({ selector: s, body });
    }
  }
  return rules;
}

const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");
const rules = parseRules(css);

const MARKDOWN_EDITOR_CLASSES = [
  ".markdown-preview-view", ".markdown-source-view", ".markdown-reading-view",
  ".cm-editor", ".cm-content", ".cm-line", ".metadata-container",
  ".metadata-property", ".markdown-rendered",
];

describe("H — every markdown/editor-targeting rule carries the marker", () => {
  it("H1. any rule touching markdown/editor classes is gated on .rd-ko-leaf", () => {
    for (const rule of rules) {
      if (!rule.selector.startsWith("body.rd-rational-archive-shell")) continue;
      for (const cls of MARKDOWN_EDITOR_CLASSES) {
        if (!rule.selector.includes(cls)) continue;
        expect(
          rule.selector.includes(`.${RD_KO_LEAF_CLASS}`),
          `${rule.selector} touches ${cls} without the marker`,
        ).toBe(true);
      }
    }
  });

  it("H2. the marker variable block exists and covers the required surfaces", () => {
    const marker = rules.filter(
      (r) => r.selector === `body.rd-rational-archive-shell .${RD_KO_LEAF_CLASS}`,
    );
    expect(marker.length).toBeGreaterThan(0);
    const body = marker.map((r) => r.body).join("\n");
    for (const wanted of [
      "--background-primary:", "--background-secondary:", "--text-normal:",
      "--text-muted:", "--text-faint:", "--h1-color:", "--link-color:",
      "--code-background:", "--hr-color:", "--metadata-label-text-color:",
      "--metadata-input-text-color:", "--blockquote-border-color:",
    ]) {
      expect(body, `marker block must define ${wanted}`).toContain(wanted);
    }
    // every value rides an RD token — no new hard-coded structural color
    expect(body).not.toMatch(/#[0-9A-Fa-f]{6}(?![\s;]*\))/);
  });

  it("H3. the marker block defines NO generic interaction variables (V2-03 stays intact)", () => {
    const marker = rules.filter(
      (r) => r.selector === `body.rd-rational-archive-shell .${RD_KO_LEAF_CLASS}`,
    );
    const body = marker.map((r) => r.body).join("\n");
    for (const banned of [
      "--icon-color:", "--icon-color-hover:", "--interactive-normal:",
      "--interactive-hover:", "--background-modifier-hover:",
      "--background-modifier-active:", "--nav-item-background",
    ]) {
      expect(body, `marker block must not define ${banned}`).not.toContain(banned);
    }
  });
});

describe("I — no forbidden global markdown/workspace selector reintroduced", () => {
  it("I1. shell rules never target markdown/editor classes without the marker root", () => {
    for (const banned of MARKDOWN_EDITOR_CLASSES) {
      for (const rule of rules) {
        if (rule.selector.includes(banned)) {
          expect(rule.selector).toContain(`body.rd-rational-archive-shell .${RD_KO_LEAF_CLASS}`);
        }
      }
    }
  });

  it("I2. no markdown/editor variables are injected on the workspace frame", () => {
    for (const rule of rules) {
      const onFrame = rule.selector === "body.rd-rational-archive-shell .workspace"
        || rule.selector.startsWith("body.rd-rational-archive-shell .workspace ")
        || rule.selector.includes(".workspace-split");
      if (!onFrame) continue;
      for (const v of ["--background-primary:", "--text-normal:", "--metadata-", "--code-background:"]) {
        expect(rule.body.includes(v), `${rule.selector} injects ${v}`).toBe(false);
      }
    }
  });

  it("I3. every new selector stays rooted at the shell body scope", () => {
    const koRules = rules.filter((r) => r.selector.includes(RD_KO_LEAF_CLASS));
    expect(koRules.length).toBeGreaterThan(0);
    for (const rule of koRules) {
      expect(rule.selector.startsWith("body.rd-rational-archive-shell")).toBe(true);
    }
  });
});

describe("J — V2-03 negative isolation rules still present", () => {
  it("J1. generic interaction variables remain confined to chrome containers", () => {
    const GENERIC = [
      "--icon-color:", "--icon-color-hover:", "--interactive-normal:",
      "--interactive-hover:", "--background-modifier-hover:",
      "--background-modifier-active:",
    ];
    const CHROME = [
      "body.rd-rational-archive-shell .workspace-ribbon",
      "body.rd-rational-archive-shell .workspace-tab-header-container",
      "body.rd-rational-archive-shell .view-header",
      "body.rd-rational-archive-shell .status-bar",
      "body.rd-rational-archive-shell .sidebar-toggle-button",
    ];
    for (const rule of rules) {
      if (!GENERIC.some((v) => rule.body.includes(v))) continue;
      if (!rule.selector.startsWith("body.rd-rational-archive-shell")) continue;
      expect(
        CHROME.some((p) => rule.selector.startsWith(p)),
        `${rule.selector} still confined to chrome`,
      ).toBe(true);
    }
  });

  it("J2. the V2-03 shell-css-isolation test file is untouched", () => {
    const src = readFileSync(join(root, "tests", "shell-css-isolation.test.ts"), "utf-8");
    expect(src).toContain("V2-03 — shell CSS isolation");
    expect(src).toContain("non-RD editor / properties / file-explorer / third-party classes are never targeted");
    expect(css).not.toContain("--nav-item-background-hover");
    expect(css).not.toContain("--nav-item-background-selected");
  });
});
