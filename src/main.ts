import { Plugin, TFile } from "obsidian";
import { ContextController } from "./context/context-controller";
import { isCandidatePath } from "./scope";
import { ObsidianNavigationPort } from "./platform/obsidian-navigation";
import { RuntimeWiring } from "./runtime/runtime-wiring";
import type { ReadAdapter } from "./platform/obsidian-read-adapter";
import type { WorkspaceLike, VaultLike } from "./runtime/runtime-wiring";
import { registerRDViews } from "./architecture/rd-view-setup";
import { ObsidianGraphSourceImpl, ObsidianKoSourceReaderImpl } from "./architecture/obsidian-graph-ports";

/** Read-only adapter over the real Vault. */
class ObsidianReadAdapterImpl {
  constructor(private readonly plugin: Plugin) {}
  list(): readonly string[] {
    return this.plugin.app.vault
      .getMarkdownFiles().map((f) => f.path)
      .filter((p) => isCandidatePath(p));
  }
  async read(path: string): Promise<string> {
    return await this.plugin.app.vault.adapter.read(path);
  }
  mtime(path: string): number {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file.stat.mtime : 0;
  }
}

/** Thin bridges from Obsidian API to WorkspaceLike/VaultLike. */
class ObsidianWorkspaceBridge implements WorkspaceLike {
  constructor(private readonly plugin: Plugin) {}
  on(event: string, cb: never): unknown {
    return this.plugin.registerEvent(
      this.plugin.app.workspace.on(event as never, cb as never));
  }
  onLayoutReady(cb: () => void | Promise<void>): void {
    this.plugin.app.workspace.onLayoutReady(cb);
  }
  getActiveFile(): { path: string } | null {
    const f = this.plugin.app.workspace.getActiveFile();
    return f instanceof TFile ? { path: f.path } : null;
  }
}

class ObsidianVaultBridge implements VaultLike {
  constructor(private readonly plugin: Plugin) {}
  on(event: string, cb: never): unknown {
    return this.plugin.registerEvent(
      this.plugin.app.vault.on(event as never, cb as never));
  }
}

/** v1.6.1: main.ts is a thin composition root. Runtime lifecycle
 * phases live in RuntimeWiring; view registration lives in
 * architecture/rd-view-setup. */
export default class RationalDeliriumPlugin extends Plugin {
  private wiring: RuntimeWiring | null = null;
  private controller: ContextController | null = null;

  async onload(): Promise<void> {
    const adapter: ReadAdapter = new ObsidianReadAdapterImpl(this);
    const workspace = new ObsidianWorkspaceBridge(this);
    const vault = new ObsidianVaultBridge(this);
    const navigation = new ObsidianNavigationPort(this.app);

    this.wiring = new RuntimeWiring(adapter, workspace, vault, navigation);
    this.controller = this.wiring.controller;

    const wiring = this.wiring;
    registerRDViews(this, {
      controller: this.controller,
      index: wiring.index,
      onIndexCommit: (cb: () => void) => wiring.onIndexCommit(cb),
      onActiveFile: (cb: (path: string | null) => void) => wiring.onActiveFile(cb),
      activeFileProvider: () => {
        const f = this.app.workspace.getActiveFile();
        return f !== null ? f.path : null;
      },
      navigation,
      graphSource: new ObsidianGraphSourceImpl(this),
      koSourceReader: new ObsidianKoSourceReaderImpl(this),
    });

    await this.wiring.start();
  }

  onunload(): void {
    this.wiring?.dispose();
    this.wiring = null;
    this.controller = null;
  }
}
