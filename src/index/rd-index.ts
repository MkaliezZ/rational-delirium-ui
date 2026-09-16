import type {
  IndexState,
  RDObject,
  RDRelation,
  RDRelationAssertion,
} from "../model";
import { isCandidatePath, isForbiddenDataSource } from "../scope";
import { parseObject } from "../parsers/object-parser";
import {
  normalizeAssertion,
  normalizeRelations,
} from "./relation-normalizer";
import { DependencyMap } from "./dependency-map";
import type { ReadAdapter } from "../platform/obsidian-read-adapter";
import { parseWikilink, resolveLink } from "../parsers/link-reference";

interface FileEntry {
  object: RDObject | null;
  assertions: RDRelationAssertion[];
  ordinaryLinks: string[];
  /** Independent per-path read request generation (RD-03). */
  generation: number;
}

/** The ONE shared index. Two-phase build (objects, then relations);
 * incremental invalidation through the dependency map; per-path read
 * generations with delete/rename tombstones discard stale async
 * reads; a lifecycle generation guards plugin unload. Ordinary
 * wikilinks are tracked both directions (RD-11). */
export class RDIndex {
  private readonly adapter: ReadAdapter;
  private readonly files = new Map<string, FileEntry>();
  private readonly depMap = new DependencyMap();
  /** RD-03: per-path latest read token. */
  private readonly readTokens = new Map<string, number>();
  /** RD-03/04: tombstoned path identities (deleted/renamed-away). */
  private readonly tombstones = new Set<string>();
  private stateValue: IndexState = "INDEXING";
  private lifecycle = 0;
  private revisionCounter = 0;
  private readCount = 0;
  private relationsValue: RDRelation[] = [];
  private readonly commitListeners = new Set<() => void>();
  private ordinaryOutgoingValue = new Map<string, string[]>();
  private ordinaryIncomingValue = new Map<string, string[]>();

  constructor(adapter: ReadAdapter) {
    this.adapter = adapter;
  }

  get state(): IndexState {
    return this.stateValue;
  }

  get lifecycleGeneration(): number {
    return this.lifecycle;
  }

  get adapterReads(): number {
    return this.readCount;
  }

  get relations(): RDRelation[] {
    return this.relationsValue;
  }

  /** v0.4.2 §14/§16: read-only commit notification for projections
   * (Investigation Dashboard). Listeners fire after every completed
   * index commit (build/create/modify/delete/rename). Listener errors
   * never break the index. */
  subscribe(listener: () => void): () => void {
    this.commitListeners.add(listener);
    return () => { this.commitListeners.delete(listener); };
  }

  private notifyCommit(): void {
    for (const listener of [...this.commitListeners]) {
      try { listener(); } catch { /* never break the index */ }
    }
  }

  /** Phase 1 + Phase 2 build. */
  async build(): Promise<void> {
    this.stateValue = "INDEXING";
    const lifecycleAtStart = this.lifecycle;
    const paths = this.adapter
      .list()
      .filter((p) => isCandidatePath(p) && !isForbiddenDataSource(p));
    for (const path of paths) {
      await this.loadFile(path, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.stateValue = "READY";
    this.notifyCommit();
  }

  /** Backward-compatible delete alias. */
  async applyDeleteAlias(path: string): Promise<void> {
    await this.applyDelete(path);
  }

  /** Incremental: apply one external file event (create/modify). */
  async applyChange(path: string, event: "create" | "modify"): Promise<void> {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.delete(path); // (re)creation clears any old tombstone
    if (isCandidatePath(path)) {
      await this.loadFile(path, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }

  /** Delete: tombstone the old path identity immediately; any
   * in-flight read for it is discarded on return. */
  async applyDelete(path: string): Promise<void> {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.add(path);
    this.bumpToken(path);
    this.files.delete(path);
    this.depMap.remove(path);
    for (const target of this.depMap.affectedBy(path)) {
      if (target === path || !isCandidatePath(target)) continue;
      await this.loadFile(target, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }

  /** Rename: old path tombstoned, new path loaded, dependents
   * revalidated. */
  async applyRename(oldPath: string, newPath: string): Promise<void> {
    const lifecycleAtStart = this.lifecycle;
    this.tombstones.add(oldPath);
    this.bumpToken(oldPath);
    this.files.delete(oldPath);
    this.depMap.remove(oldPath);
    if (isCandidatePath(newPath)) {
      this.tombstones.delete(newPath);
      await this.loadFile(newPath, lifecycleAtStart);
    }
    for (const target of this.depMap.affectedBy(oldPath)) {
      if (target === oldPath || !isCandidatePath(target)) continue;
      await this.loadFile(target, lifecycleAtStart);
    }
    if (this.lifecycle !== lifecycleAtStart) return;
    this.rebuildRelations();
    this.notifyCommit();
  }

  /** Bump lifecycle generation: all in-flight reads become stale. */
  dispose(): void {
    this.lifecycle += 1;
    this.stateValue = "ERROR";
  }

  snapshot(): {
    objects: RDObject[];
    relations: RDRelation[];
    pathsById: Map<string, string[]>;
  } {
    const objects: RDObject[] = [];
    const pathsById = new Map<string, string[]>();
    for (const [path, entry] of this.files) {
      if (!entry.object) continue;
      objects.push(entry.object);
      if (entry.object.id !== null) {
        const list = pathsById.get(entry.object.id) ?? [];
        list.push(path);
        pathsById.set(entry.object.id, list);
      }
    }
    return { objects, relations: this.relationsValue, pathsById };
  }

  objectAt(path: string): RDObject | null {
    return this.files.get(path)?.object ?? null;
  }

  ordinaryLinksOf(path: string): string[] {
    return this.files.get(path)?.ordinaryLinks ?? [];
  }

  /** RD-11 §32: resolve one ordinary link using the SHARED
   * parseWikilink (not raw targetName). Handles alias, heading,
   * block references correctly. */
  ordinaryLinkResolution(
    _sourcePath: string,
    linkRaw: string,
  ): { state: import("../model").ResolutionState; paths: string[] } {
    const link = parseWikilink(linkRaw);
    if (link === null) {
      return { state: "BROKEN", paths: [] };
    }
    return resolveLink(link, this.candidatePaths());
  }

  /** Ordinary backlinks to a path (other notes' plain wikilinks). */
  ordinaryBacklinksOf(path: string): string[] {
    return this.ordinaryIncomingValue.get(path) ?? [];
  }

  relationsFor(path: string): { outgoing: RDRelation[]; incoming: RDRelation[] } {
    const obj = this.objectAt(path);
    if (!obj || obj.id === null) return { outgoing: [], incoming: [] };
    const outgoing: RDRelation[] = [];
    const incoming: RDRelation[] = [];
    for (const rel of this.relationsValue) {
      if (rel.source.objectId === obj.id && rel.source.path === path) {
        outgoing.push(rel);
      }
      if (rel.target.objectId === obj.id && rel.target.path === path) {
        if (rel.predicate === "related") {
          incoming.push(rel);
        } else if (rel.sourcePath !== path) {
          incoming.push(rel);
        }
      }
    }
    return { outgoing, incoming };
  }

  isTombstoned(path: string): boolean {
    return this.tombstones.has(path);
  }

  private candidatePaths(): string[] {
    return [...this.files.keys()];
  }

  private bumpToken(path: string): number {
    const next = (this.readTokens.get(path) ?? 0) + 1;
    this.readTokens.set(path, next);
    return next;
  }

  private async loadFile(path: string, lifecycleAtStart: number): Promise<void> {
    const token = this.bumpToken(path);
    this.readCount += 1;
    let content: string;
    try {
      content = await this.adapter.read(path);
    } catch {
      return; // disappeared mid-flight; tombstone/delete handles it
    }
    // RD-03 discard conditions: stale token, lifecycle changed, or
    // the path identity was tombstoned for a newer mutation
    if (this.lifecycle !== lifecycleAtStart) return;
    if (this.readTokens.get(path) !== token) return;
    if (this.tombstones.has(path)) return;
    const revision = ++this.revisionCounter;
    const parsed = parseObject(path, content, this.adapter.mtime(path), revision);
    this.files.set(path, {
      object: parsed.object,
      assertions: parsed.assertions,
      ordinaryLinks: parsed.ordinaryLinks,
      generation: revision,
    });
    const refs = parsed.assertions.map((a) => a.link.targetName);
    this.depMap.setDependencies(path, refs);
  }

  private rebuildRelations(): void {
    const candidates = this.candidatePaths();
    const idByPath = new Map<string, string>();
    for (const [path, entry] of this.files) {
      if (entry.object?.id !== null && entry.object !== null) {
        idByPath.set(path, entry.object.id);
      }
    }
    const normalized = [];
    for (const [path, entry] of this.files) {
      const obj = entry.object;
      if (!obj || obj.id === null) continue;
      for (const assertion of entry.assertions) {
        normalized.push(
          normalizeAssertion(path, obj.id, assertion, candidates, idByPath),
        );
      }
    }
    this.relationsValue = normalizeRelations(normalized);
    this.rebuildOrdinaryMaps(candidates);
  }

  private rebuildOrdinaryMaps(candidates: string[]): void {
    this.ordinaryOutgoingValue = new Map();
    this.ordinaryIncomingValue = new Map();
    for (const [path, entry] of this.files) {
      const unique = [...new Set(entry.ordinaryLinks)];
      this.ordinaryOutgoingValue.set(path, unique);
      for (const raw of unique) {
        // RD-11 §32: use the SHARED parseWikilink, not raw targetName
        const link = parseWikilink(raw);
        if (link === null) continue;
        const resolution = resolveLink(link, candidates);
        // §37: only RESOLVED with exactly one path creates a backlink
        if (resolution.state === "RESOLVED" && resolution.paths.length === 1) {
          const target = resolution.paths[0];
          const list = this.ordinaryIncomingValue.get(target) ?? [];
          if (!list.includes(path)) list.push(path);
          this.ordinaryIncomingValue.set(target, list);
        }
      }
    }
  }
}
