import { Plugin, TFile, type WorkspaceLeaf } from "obsidian";
import { RDContextView, RD_CONTEXT_VIEW_TYPE } from "./views/context-view";
import { RDInvestigationView, RD_INVESTIGATION_VIEW_TYPE } from "./views/investigation-view";
import { RDLoopView, RD_LOOP_VIEW_TYPE } from "./views/loop-view";
import { RDGraphIntelligenceView, RD_GRAPH_VIEW_TYPE } from "./views/graph-intelligence-view";
import { RDKnowledgePanelView, RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "./views/knowledge-panel-view";
import { ContextController } from "./context/context-controller";
import { isCandidatePath } from "./scope";
import { ObsidianNavigationPort } from "./platform/obsidian-navigation";
import { RuntimeWiring } from "./runtime/runtime-wiring";
import type { ReadAdapter } from "./platform/obsidian-read-adapter";
import type { WorkspaceLike, VaultLike } from "./runtime/runtime-wiring";
import type { GraphSource } from "./semantic-graph/graph-loader";
import { DEFAULT_SEMANTIC_GRAPH_PATH } from "./semantic-graph/graph-loader";

/** v1.3.1 §1: read-only source over the derived semantic-graph
 * artifact file. adapter.exists/read only — no write verb. */
class ObsidianGraphSourceImpl implements GraphSource {
  constructor(private readonly plugin: Plugin) {}
  async read() {
    const adapter = this.plugin.app.vault.adapter;
    try {
      if (!(await adapter.exists(DEFAULT_SEMANTIC_GRAPH_PATH))) {
        return { state: "missing" as const };
      }
      return { state: "available" as const, text: await adapter.read(DEFAULT_SEMANTIC_GRAPH_PATH) };
    } catch (err) {
      return { state: "unavailable" as const, reason: String(err) };
    }
  }
}

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

    this.registerView(
      RD_CONTEXT_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new RDContextView(leaf, this.controller as ContextController, navigation),
    );
    this.addRibbonIcon("file-search", "Open RD Context", async () => {
      await this.activateView();
    });
    this.addCommand({
      id: "open-rd-context", name: "Open RD Context",
      callback: async () => { await this.activateView(); },
    });

    this.registerView(
      RD_INVESTIGATION_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new RDInvestigationView(leaf, {
          index: (this.wiring as RuntimeWiring).index,
          onIndexCommit: (cb: () => void) =>
            (this.wiring as RuntimeWiring).onIndexCommit(cb),
          navigation,
        }),
    );
    this.addRibbonIcon("layout-list", "Open RD Investigation", async () => {
      await this.activateInvestigationView();
    });
    this.addCommand({
      id: "open-rd-investigation", name: "Open RD Investigation",
      callback: async () => { await this.activateInvestigationView(); },
    });

    this.registerView(
      RD_LOOP_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new RDLoopView(leaf, {
          index: (this.wiring as RuntimeWiring).index,
          onIndexCommit: (cb: () => void) =>
            (this.wiring as RuntimeWiring).onIndexCommit(cb),
          onActiveFile: (cb: (path: string | null) => void) =>
            (this.wiring as RuntimeWiring).onActiveFile(cb),
          activeFileProvider: () => {
            const f = this.app.workspace.getActiveFile();
            return f !== null ? f.path : null;
          },
          navigation,
        }),
    );
    this.addRibbonIcon("iteration-ccw", "Open RD Loop Workspace", async () => {
      await this.activateLoopView();
    });
    this.addCommand({
      id: "open-rd-loop-workspace", name: "Open RD Loop Workspace",
      callback: async () => { await this.activateLoopView(); },
    });

    this.registerView(
      RD_GRAPH_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new RDGraphIntelligenceView(leaf, {
          index: (this.wiring as RuntimeWiring).index,
          onIndexCommit: (cb: () => void) =>
            (this.wiring as RuntimeWiring).onIndexCommit(cb),
          onActiveFile: (cb: (path: string | null) => void) =>
            (this.wiring as RuntimeWiring).onActiveFile(cb),
          activeFileProvider: () => {
            const f = this.app.workspace.getActiveFile();
            return f !== null ? f.path : null;
          },
          navigation,
        }),
    );
    this.addRibbonIcon("git-fork", "Open RD Graph Intelligence", async () => {
      await this.activateGraphView();
    });
    this.addCommand({
      id: "open-rd-graph-intelligence", name: "Open RD Graph Intelligence",
      callback: async () => { await this.activateGraphView(); },
    });

    // v1.3.1 Phase 1: read-only Knowledge Panel over the derived
    // semantic-graph artifact (not the RDIndex assertion layer).
    this.registerView(
      RD_KNOWLEDGE_PANEL_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new RDKnowledgePanelView(leaf, {
          source: new ObsidianGraphSourceImpl(this),
          workspace: "default",
        }),
    );
    this.addRibbonIcon("book-open", "Open RD Knowledge Panel", async () => {
      await this.activateKnowledgePanelView();
    });
    this.addCommand({
      id: "open-rd-knowledge-panel", name: "Open RD Knowledge Panel",
      callback: async () => { await this.activateKnowledgePanelView(); },
    });

    await this.wiring.start();
  }

  onunload(): void {
    this.wiring?.dispose();
    this.wiring = null;
    this.controller = null;
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RD_CONTEXT_VIEW_TYPE);
    const leaf = existing[0] ?? this.app.workspace.getRightLeaf(false);
    if (leaf === null) return;
    await leaf.setViewState({ type: RD_CONTEXT_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  /** v0.4.2 §4: Investigation Dashboard opens as a main-area tab. */
  private async activateInvestigationView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RD_INVESTIGATION_VIEW_TYPE);
    const leaf = existing[0] ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: RD_INVESTIGATION_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  /** v0.4.3 §3: Loop Workspace opens as a main-area tab. */
  private async activateLoopView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RD_LOOP_VIEW_TYPE);
    const leaf = existing[0] ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: RD_LOOP_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  /** v0.4.4 §3: Graph Intelligence opens as a main-area tab. */
  private async activateGraphView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RD_GRAPH_VIEW_TYPE);
    const leaf = existing[0] ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: RD_GRAPH_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  /** v1.3.1 §3: Knowledge Panel opens as a main-area tab. */
  private async activateKnowledgePanelView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RD_KNOWLEDGE_PANEL_VIEW_TYPE);
    const leaf = existing[0] ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: RD_KNOWLEDGE_PANEL_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
