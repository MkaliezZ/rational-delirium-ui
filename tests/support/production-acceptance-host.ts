import type { App, WorkspaceLeaf } from "obsidian";
import { vi } from "vitest";
import { RDContextView } from "../../src/views/context-view";
import { ObsidianNavigationPort } from "../../src/platform/obsidian-navigation";
import { RuntimeWiring } from "../../src/runtime/runtime-wiring";
import { FakeAdapter } from "./fake-adapter";
import { FakeWorkspace, FakeVault } from "./fake-obsidian-host";
import { MarkdownView, TFile, type FakeMetadata } from "./fake-obsidian-api";

class AcceptanceVault extends FakeVault {
  readonly adapter = new FakeAdapter();
  readonly files = new Map<string, TFile>();
  readonly currentReads: string[] = [];
  readonly writeCalls: string[] = [];
  failRead = false;

  setCurrent(path: string, content: string): void {
    const file = this.files.get(path) ?? new TFile(path);
    file.stat.mtime += 1;
    this.files.set(path, file);
    this.adapter.set(path, content, file.stat.mtime);
  }
  getAbstractFileByPath(path: string): TFile | null { return this.files.get(path) ?? null; }
  async read(file: TFile): Promise<string> {
    this.currentReads.push(file.path);
    if (this.failRead) throw new Error("current read unavailable");
    return await this.adapter.read(file.path);
  }
  create(): never { this.writeCalls.push("create"); throw new Error("knowledge write"); }
  modify(): never { this.writeCalls.push("modify"); throw new Error("knowledge write"); }
  delete(): never { this.writeCalls.push("delete"); throw new Error("knowledge write"); }
}

export interface NavigationStateModel {
  /** GI-RT-01: when true, openFile() resolves while a NATIVE deferred
   * restoration is still pending (restoration applies cursor line 1
   * asynchronously); revealLeaf() awaits that restoration. Opt-in so
   * existing suites keep their exact cursor expectations. */
  deferRestore: boolean;
  /** Optional path the pending restoration swaps the view's file to,
   * modeling a view/file race across the boundary. */
  swapAfterRestore: string | null;
  events: string[];
  restoreGate: Promise<void> | null;
}

class AcceptanceLeaf {
  readonly view: MarkdownView;
  restoreGate: Promise<void> | null = null;
  constructor(
    vault: AcceptanceVault,
    private readonly opens: string[],
    buffers: Map<string, string>,
    private readonly navState: NavigationStateModel,
  ) {
    this.view = new MarkdownView((p) => buffers.get(p) ?? vault.adapter.readSync(p));
  }
  async openFile(file: TFile): Promise<void> {
    this.opens.push(file.path);
    this.view.file = file;
    if (this.navState.deferRestore) {
      // Native restoration is scheduled but NOT awaited by openFile —
      // this reproduces the real Obsidian ordering defect.
      this.restoreGate = (async () => {
        await new Promise((r) => setTimeout(r, 0));
        this.view.cursors.push({ line: 0, ch: 0 }); // native restore: line 1
        if (this.navState.swapAfterRestore !== null) {
          this.view.file = new TFile(this.navState.swapAfterRestore);
        }
        this.navState.events.push("native-restore");
      })();
    }
  }
}

class AcceptanceWorkspace extends FakeWorkspace {
  readonly opens: string[] = [];
  readonly getLeafCalls: Array<boolean | string> = [];
  readonly leaves: AcceptanceLeaf[];
  activeLeaf = { view: { getViewType: () => "rd-context" } };
  constructor(
    private readonly vault: AcceptanceVault,
    private readonly buffers: Map<string, string>,
    private readonly navState: NavigationStateModel,
  ) {
    super();
    this.leaves = [new AcceptanceLeaf(vault, this.opens, buffers, navState)];
  }
  getLeavesOfType(type: string): AcceptanceLeaf[] { return type === "markdown" ? this.leaves : []; }
  getLeaf(mode: boolean | string): AcceptanceLeaf {
    this.getLeafCalls.push(mode);
    const leaf = new AcceptanceLeaf(this.vault, this.opens, this.buffers, this.navState);
    this.leaves.push(leaf);
    return leaf;
  }
  /** GI-RT-01 lifecycle boundary: resolves only after any pending
   * native restoration of THIS leaf has completed. */
  async revealLeaf(leaf: AcceptanceLeaf): Promise<void> {
    this.navState.events.push("reveal-await");
    if (leaf.restoreGate !== null) await leaf.restoreGate;
  }
}

export class ProductionAcceptanceHost {
  readonly vault = new AcceptanceVault();
  readonly buffers = new Map<string, string>();
  /** GI-RT-01 deferred-restoration model (opt-in). */
  readonly navState: NavigationStateModel = {
    deferRestore: false, swapAfterRestore: null, events: [], restoreGate: null,
  };
  readonly workspace = new AcceptanceWorkspace(this.vault, this.buffers, this.navState);
  readonly subpathCalls: Array<{ path: string; subpath: string }> = [];
  private readonly caches = new Map<string, FakeMetadata>();
  readonly app = {
    vault: this.vault,
    workspace: this.workspace,
    metadataCache: { getFileCache: (file: TFile) => this.caches.get(file.path) ?? null },
  };
  readonly navigation = new ObsidianNavigationPort(this.app as unknown as App);
  readonly openSpy = vi.spyOn(this.navigation, "open"); // observes, never replaces production behavior
  readonly wiring = new RuntimeWiring(this.vault.adapter, this.workspace, this.vault, this.navigation);
  readonly view = new RDContextView({} as WorkspaceLeaf, this.wiring.controller, this.navigation);

  async start(entries: Array<[string, string]>, active = "CASES/A.md"): Promise<this> {
    for (const [path, content] of entries) this.vault.setCurrent(path, content);
    this.workspace.activeFile = { path: active };
    await this.wiring.start();
    await this.workspace.fireLayoutReady();
    await this.view.onOpen();
    for (const s of this.wiring.controller.projection?.sections ?? []) {
      this.wiring.controller.setSectionExpanded(s.key, true);
    }
    return this;
  }
  setSubpath(path: string, subpath: string, line: number): void {
    const cache = this.caches.get(path) ?? { path, subpaths: new Map(), calls: this.subpathCalls };
    cache.subpaths.set(subpath, { start: { line, col: 0 }, end: null });
    this.caches.set(path, cache);
  }
  async click(selector: string): Promise<void> {
    const element = this.view.contentEl.querySelector<HTMLButtonElement>(selector);
    if (element === null) throw new Error("missing DOM action: " + selector);
    const before = this.openSpy.mock.results.length;
    element.click();
    for (const result of this.openSpy.mock.results.slice(before)) await result.value;
  }
  get cursors() { return this.workspace.leaves.flatMap((leaf) => leaf.view.cursors); }
  async close(): Promise<void> {
    await this.view.onClose();
    this.view.contentEl.remove();
    this.wiring.dispose();
    this.openSpy.mockRestore();
  }
}
