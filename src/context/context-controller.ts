import type { RDIndex } from "../index/rd-index";
import {
  freshSessionState,
  resetSession,
  type SessionState,
} from "./session-state";
import type { ContextProjectionData } from "../model";
import { buildProjection } from "./context-projection";

export type ContextPhase =
  | "READY"
  | "NO_ACTIVE_OBJECT"
  | "LOADING"
  | "ERROR";

export type ContextListener = () => void;

/** RC-C (RD-04/RR-01): pinned target identity is separate from the
 * follow anchor identity. Deleting the follow anchor while PINNED
 * only clears the anchor — never the pinned projection. */
interface PinnedTombstone {
  path: string;
  objectId: string;
}

/** FOLLOW/PINNED controller. RC-A (RD-01): after any index commit the
 * controller re-projects the CURRENT target regardless of which path
 * changed — dependency-aware without a dependency graph. */
export class ContextController {
  private readonly index: RDIndex;
  private state: SessionState = freshSessionState();
  private phaseValue: ContextPhase = "NO_ACTIVE_OBJECT";
  private projectionValue: ContextProjectionData | null = null;
  private requestGeneration = 0;
  private unloaded = false;
  private listeners = new Set<ContextListener>();
  private pinnedTombstone: PinnedTombstone | null = null;
  private readonly loader: (path: string) => Promise<void>;

  constructor(
    index: RDIndex,
    loader: (path: string) => Promise<void> = async () => {},
  ) {
    this.index = index;
    this.loader = loader;
  }

  subscribe(listener: ContextListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  unsubscribe(listener: ContextListener): void {
    this.listeners.delete(listener);
  }

  private publish(): void {
    for (const listener of [...this.listeners]) {
      try { listener(); } catch { /* never break */ }
    }
  }

  get session(): Readonly<SessionState> { return this.state; }
  get phase(): ContextPhase { return this.phaseValue; }
  get projection(): ContextProjectionData | null { return this.projectionValue; }
  get generation(): number { return this.requestGeneration; }

  private currentTargetPath(): string | null {
    if (this.state.mode === "PINNED") return this.state.pinnedPath;
    return this.state.lastMarkdownAnchor;
  }

  async onActiveMarkdown(path: string | null): Promise<void> {
    await this.onFileOpen(path);
  }

  async onFileOpen(path: string | null): Promise<void> {
    if (path !== null) this.state.lastMarkdownAnchor = path;
    if (this.state.mode === "PINNED") return;
    await this.resolve(path);
  }

  async onActiveLeafChange(activeIsContextView: boolean): Promise<void> {
    void activeIsContextView;
  }

  async onContextFocus(): Promise<void> {}

  async initializeAnchor(path: string | null): Promise<void> {
    if (path !== null) this.state.lastMarkdownAnchor = path;
    if (this.state.mode === "PINNED" && this.state.pinnedPath) {
      if (this.pinnedTombstone === null) await this.resolve(this.state.pinnedPath);
      return;
    }
    await this.resolve(path);
  }

  async pin(): Promise<void> {
    const current = this.state.lastMarkdownAnchor;
    if (current === null) return;
    this.state.mode = "PINNED";
    this.state.pinnedPath = current;
    this.state.pinnedDeleted = false;
    this.pinnedTombstone = null;
    await this.resolve(current);
  }

  async unpin(): Promise<void> {
    this.state.mode = "FOLLOW";
    this.state.pinnedPath = null;
    this.state.pinnedDeleted = false;
    this.pinnedTombstone = null;
    await this.resolve(this.state.lastMarkdownAnchor);
  }

  async onFileRenamed(oldPath: string, newPath: string): Promise<void> {
    if (this.state.lastMarkdownAnchor === oldPath) {
      this.state.lastMarkdownAnchor = newPath;
    }
    if (this.state.mode === "PINNED" && this.state.pinnedPath === oldPath) {
      this.state.pinnedPath = newPath;
    }
    // RD-01 §4: rename is an index commit → always refresh projection
    await this.refreshCurrentTarget();
  }

  async onFileDeleted(path: string): Promise<void> {
    if (this.state.mode === "PINNED" && this.state.pinnedPath === path) {
      const obj = this.index.objectAt(path);
      this.pinnedTombstone = { path, objectId: obj?.id ?? path };
      this.requestGeneration += 1;
      this.state.pinnedDeleted = true;
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR", indexState: this.index.state, mode: "PINNED",
        pinnedDeleted: true, object: null, sections: [],
      };
      this.publish();
      return;
    }
    if (this.state.lastMarkdownAnchor === path) {
      this.state.lastMarkdownAnchor = null;
      if (this.state.mode === "FOLLOW") {
        this.requestGeneration += 1;
        this.phaseValue = "NO_ACTIVE_OBJECT";
        this.projectionValue = {
          phase: "NO_ACTIVE_OBJECT", indexState: this.index.state,
          mode: "FOLLOW", object: null, sections: [],
        };
        this.publish();
        return;
      }
      // RD-01 §12: mode is PINNED; anchor cleared, but the pinned
      // target's DEPENDENCY (e.g. E) was deleted → must refresh
      // the pinned projection to update stale relations
      await this.refreshCurrentTarget();
      return;
    }
    await this.refreshCurrentTarget();
  }

  async onFileCreated(path: string): Promise<void> {
    if (this.pinnedTombstone !== null && this.pinnedTombstone.path === path) {
      return;
    }
    // FR-02 §10: background create must NEVER become the Markdown anchor.
    // lastMarkdownAnchor only changes via file-open or layout-ready init.
    // Just refresh existing target if needed (a new relation target may
    // have appeared).
    await this.refreshCurrentTarget();
  }

  async onIndexRefreshed(changedPath: string): Promise<void> {
    void changedPath;
    await this.refreshCurrentTarget();
  }

  private async refreshCurrentTarget(): Promise<void> {
    if (this.unloaded) return;
    const target = this.currentTargetPath();
    if (target === null) {
      if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) return;
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT", indexState: this.index.state,
        mode: this.state.mode, object: null, sections: [],
      };
      this.publish();
      return;
    }
    if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) return;
    const object = this.index.objectAt(target);
    // FR-01 §7: current target became non-RD → invalidate projection
    if (object === null) {
      if (this.state.mode === "PINNED") {
        // PINNED target file exists but is no longer a valid RD object
        this.phaseValue = "ERROR";
        this.projectionValue = {
          phase: "ERROR", indexState: this.index.state, mode: "PINNED",
          pinnedDeleted: true, object: null, sections: [],
        };
      } else {
        this.phaseValue = "NO_ACTIVE_OBJECT";
        this.projectionValue = {
          phase: "NO_ACTIVE_OBJECT", indexState: this.index.state,
          mode: "FOLLOW", object: null, sections: [],
        };
      }
      this.publish();
      return;
    }
    const { outgoing, incoming } = this.index.relationsFor(target);
    this.projectionValue = buildProjection(
      object, outgoing, incoming, this.index.state,
      this.state.mode, this.index, target,
    );
    this.phaseValue = "READY";
    this.publish();
  }

  setSectionExpanded(key: string, expanded: boolean): void {
    if (expanded) this.state.expandedSections.add(key);
    else this.state.expandedSections.delete(key);
    this.publish();
  }

  async unload(): Promise<void> {
    this.requestGeneration += 1;
    this.unloaded = true;
    resetSession(this.state);
    this.pinnedTombstone = null;
    this.phaseValue = "NO_ACTIVE_OBJECT";
    this.projectionValue = null;
    this.publish();
    this.listeners.clear();
  }

  async reattach(): Promise<void> {
    if (this.unloaded) return;
    if (this.state.mode === "PINNED" && this.state.pinnedPath) {
      if (this.pinnedTombstone !== null) return;
      await this.resolve(this.state.pinnedPath);
    } else {
      await this.resolve(this.state.lastMarkdownAnchor);
    }
  }

  private async resolve(path: string | null): Promise<void> {
    this.requestGeneration += 1;
    const gen = this.requestGeneration;
    if (this.unloaded) return;
    if (path === null) {
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT", indexState: this.index.state,
        mode: this.state.mode, object: null, sections: [],
      };
      this.publish();
      return;
    }
    this.phaseValue = "LOADING";
    this.publish();
    try {
      await this.loader(path);
      if (gen !== this.requestGeneration || this.unloaded) return;
    } catch {
      if (gen !== this.requestGeneration || this.unloaded) return;
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR", indexState: this.index.state,
        mode: this.state.mode, object: null, sections: [],
      };
      this.publish();
      return;
    }
    if (gen !== this.requestGeneration) return;
    if (this.state.mode === "PINNED" && this.pinnedTombstone !== null) {
      this.phaseValue = "ERROR";
      this.projectionValue = {
        phase: "ERROR", indexState: this.index.state, mode: "PINNED",
        pinnedDeleted: true, object: null, sections: [],
      };
      this.publish();
      return;
    }
    const object = this.index.objectAt(path);
    if (object === null) {
      this.phaseValue = "NO_ACTIVE_OBJECT";
      this.projectionValue = {
        phase: "NO_ACTIVE_OBJECT", indexState: this.index.state,
        mode: this.state.mode, object: null, sections: [],
      };
      this.publish();
      return;
    }
    const { outgoing, incoming } = this.index.relationsFor(path);
    this.projectionValue = buildProjection(
      object, outgoing, incoming, this.index.state,
      this.state.mode, this.index, path,
    );
    this.phaseValue = "READY";
    this.publish();
  }
}
