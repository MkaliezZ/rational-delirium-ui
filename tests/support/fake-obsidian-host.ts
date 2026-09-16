import type { WorkspaceLike, VaultLike } from "../../src/runtime/runtime-wiring";

/** Minimal fake Obsidian host for production integration tests. */
export class FakeWorkspace implements WorkspaceLike {
  activeFile: { path: string } | null = null;
  private fileOpenHandlers: Array<(f: { path: string } | null) => void> = [];
  private leafHandlers: Array<(l: unknown) => void> = [];
  private layoutReadyFns: Array<() => void | Promise<void>> = [];

  on(event: string, cb: never): unknown {
    if (event === "file-open") this.fileOpenHandlers.push(cb as never);
    if (event === "active-leaf-change") this.leafHandlers.push(cb as never);
    return cb;
  }

  onLayoutReady(cb: () => void | Promise<void>): void {
    this.layoutReadyFns.push(cb);
  }

  getActiveFile(): { path: string } | null {
    return this.activeFile;
  }

  // Test helpers to simulate events
  fireFileOpen(path: string | null): void {
    this.activeFile = path !== null ? { path } : null;
    for (const h of this.fileOpenHandlers) h(this.activeFile);
  }

  fireLeafChange(): void {
    for (const h of this.leafHandlers) h({});
  }

  async fireLayoutReady(): Promise<void> {
    for (const cb of this.layoutReadyFns) await cb();
  }
}

export class FakeVault implements VaultLike {
  private createHandlers: Array<(f: { path: string }) => void> = [];
  private modifyHandlers: Array<(f: { path: string }) => void> = [];
  private renameHandlers: Array<(f: { path: string }, old: string) => void> = [];
  private deleteHandlers: Array<(f: { path: string }) => void> = [];

  on(event: string, cb: never): unknown {
    if (event === "create") this.createHandlers.push(cb as never);
    if (event === "modify") this.modifyHandlers.push(cb as never);
    if (event === "rename") this.renameHandlers.push(cb as never);
    if (event === "delete") this.deleteHandlers.push(cb as never);
    return cb;
  }

  fireCreate(path: string): void {
    for (const h of this.createHandlers) h({ path });
  }
  fireModify(path: string): void {
    for (const h of this.modifyHandlers) h({ path });
  }
  fireRename(oldPath: string, newPath: string): void {
    for (const h of this.renameHandlers) h({ path: newPath }, oldPath);
  }
  fireDelete(path: string): void {
    for (const h of this.deleteHandlers) h({ path });
  }
}
