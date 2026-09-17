/** Shared production runtime wiring (v0.4.1.3 §41).
 * This module IS the production wiring: main.ts instantiates it,
 * tests instantiate the SAME module. No separate test imitation. */
import { RDIndex } from "../index/rd-index";
import { ContextController } from "../context/context-controller";
import { PendingPathScheduler } from "../index/update-scheduler";
import { isCandidatePath } from "../scope";
import type { ReadAdapter } from "../platform/obsidian-read-adapter";
import type { NavigationPort } from "../platform/navigation-core";

export type BuildPhase = "BUILDING" | "REPLAYING" | "LIVE" | "DISPOSED";

/** Minimal workspace contract the wiring needs. */
export interface WorkspaceLike {
  on(event: "file-open", cb: (file: { path: string } | null) => void): unknown;
  on(event: "active-leaf-change", cb: (leaf: unknown) => void): unknown;
  onLayoutReady(cb: () => void | Promise<void>): void;
  getActiveFile(): { path: string } | null;
}
export interface VaultLike {
  on(event: "create" | "modify", cb: (file: { path: string }) => void): unknown;
  on(event: "rename", cb: (file: { path: string }, oldPath: string) => void): unknown;
  on(event: "delete", cb: (file: { path: string }) => void): unknown;
}

export class RuntimeWiring {
  readonly index: RDIndex;
  readonly controller: ContextController;
  scheduler: PendingPathScheduler | null = null;
  buildPhase: BuildPhase = "BUILDING";
  private pendingPaths = new Set<string>();
  private disposed = false;
  private readonly workspace: WorkspaceLike;
  private readonly vault: VaultLike;
  private readonly navigation: NavigationPort;
  private readonly activeFileListeners = new Set<(path: string | null) => void>();

  constructor(
    adapter: ReadAdapter,
    workspace: WorkspaceLike,
    vault: VaultLike,
    navigation: NavigationPort,
  ) {
    this.index = new RDIndex(adapter);
    this.controller = new ContextController(this.index);
    this.workspace = workspace;
    this.vault = vault;
    this.navigation = navigation;
  }

  async start(): Promise<void> {
    this.registerListeners();
    await this.index.build();
    if (this.disposed) return;
    this.buildPhase = "REPLAYING";
    while (this.pendingPaths.size > 0) {
      if (this.disposed) return;
      const batch = [...this.pendingPaths];
      this.pendingPaths.clear();
      for (const path of batch) {
        await this.index.applyChange(path, "modify");
        if (this.disposed) return;
      }
    }
    if (this.disposed) return;
    this.scheduler = new PendingPathScheduler((p) => void this.applyModify(p));
    if (this.pendingPaths.size > 0) {
      for (const p of this.pendingPaths) this.scheduler.schedule(p);
      this.pendingPaths.clear();
    }
    this.buildPhase = "LIVE";
    await this.workspace.onLayoutReady(async () => {
      if (this.disposed) return;
      const active = this.workspace.getActiveFile();
      if (active !== null) {
        await this.controller.initializeAnchor(active.path);
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    this.buildPhase = "DISPOSED";
    this.scheduler?.dispose();
    this.pendingPaths.clear();
    void this.controller.unload();
    this.index.dispose();
    this.scheduler = null;
  }

  /** v0.4.2 §16: Dashboard live-update hookup. Delegates to the ONE
   * shared RDIndex commit notification — no second watcher, no
   * polling, no parallel index. */
  onIndexCommit(listener: () => void): () => void {
    return this.index.subscribe(listener);
  }

  /** v0.4.3 §17: active-file stream for the LOOP Workspace. Fired
   * from the ONE existing workspace file-open registration — this is
   * another listener on the same event, not a second watcher. */
  onActiveFile(listener: (path: string | null) => void): () => void {
    this.activeFileListeners.add(listener);
    return () => { this.activeFileListeners.delete(listener); };
  }

  private notifyActiveFile(path: string | null): void {
    for (const listener of [...this.activeFileListeners]) {
      try { listener(path); } catch { /* never break the wiring */ }
    }
  }

  private registerListeners(): void {
    this.vault.on("create", (file) => {
      if (isCandidatePath(file.path)) this.onPathEvent(file.path, "create");
    });
    this.vault.on("modify", (file) => {
      if (isCandidatePath(file.path)) this.onPathEvent(file.path, "modify");
    });
    this.vault.on("rename", (file, oldPath) => void this.applyRename(oldPath, file.path));
    this.vault.on("delete", (file) => void this.applyDelete(file.path));
    this.workspace.on("file-open", (file) => {
      if (file !== null) void this.controller.onFileOpen(file.path);
      this.notifyActiveFile(file !== null ? file.path : null);
    });
    this.workspace.on("active-leaf-change", () => {
      void this.controller.onActiveLeafChange(false);
    });
  }

  private onPathEvent(path: string, event: "create" | "modify"): void {
    if (this.buildPhase === "BUILDING" || this.buildPhase === "REPLAYING") {
      this.pendingPaths.add(path);
      return;
    }
    if (this.buildPhase !== "LIVE") return;
    if (event === "create") {
      void this.applyCreate(path);
    } else {
      this.scheduler?.schedule(path);
    }
  }

  private async applyCreate(path: string): Promise<void> {
    if (this.disposed) return;
    const token = this.disposed;
    await this.index.applyChange(path, "create");
    if (this.disposed !== token || this.disposed) return;
    await this.controller.onFileCreated(path);
  }
  private async applyModify(path: string): Promise<void> {
    if (this.disposed) return;
    await this.index.applyChange(path, "modify");
    if (this.disposed) return;
    await this.controller.onIndexRefreshed(path);
  }
  private async applyDelete(path: string): Promise<void> {
    if (this.disposed) return;
    await this.index.applyDelete(path);
    if (this.disposed) return;
    await this.controller.onFileDeleted(path);
  }
  private async applyRename(oldPath: string, newPath: string): Promise<void> {
    if (this.disposed) return;
    await this.index.applyRename(oldPath, newPath);
    if (this.disposed) return;
    await this.controller.onFileRenamed(oldPath, newPath);
  }
}
