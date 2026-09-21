/** V2 review fix (V2-01) — single graph snapshot authority.
 *
 * Exactly one coordinator per session, created in rd-view-setup and
 * injected into the three shell surfaces (workspace, archive
 * navigation, inspector). It owns:
 *
 * - the current published snapshot (published into the shared
 *   session store via the existing publishGraphLoad path),
 * - in-flight load dedup: a concurrent cold-open of all three
 *   surfaces shares ONE underlying source read,
 * - an explicit monotonically increasing generation per load,
 * - stale completion rejection: an older generation completing
 *   after a newer one can NEVER overwrite it — an explicit
 *   generation comparison, not "last promise wins".
 *
 * No timers, no polling, no requestAnimationFrame, no fake delays,
 * no second index, no persistence. The loader and the store keep
 * their contracts untouched; this class only decides WHICH load
 * result may be published, and when. Every surface renders from
 * the same published snapshot in the store.
 */

import {
  loadGraphFromSource,
  type GraphLoadResult,
  type GraphSource,
} from "../semantic-graph/graph-loader";
import { publishGraphLoad, type RDWorkspaceStore } from "./workspace-state";

export class GraphSnapshotCoordinator {
  /** Monotonically increasing load generation; 0 = never loaded. */
  private generation = 0;
  /** Generation of the snapshot currently published in the store. */
  private published = 0;
  /** The single in-flight load that newer cold-open calls may join. */
  private inFlight:
    { readonly generation: number; readonly promise: Promise<GraphLoadResult> } | null = null;

  constructor(
    private readonly store: RDWorkspaceStore,
    private readonly source: GraphSource,
  ) {}

  /** Generation of the published snapshot (0 when nothing has been
   * published yet). Surfaces render from the store itself; this
   * accessor exists for diagnostics and tests. */
  publishedGeneration(): number {
    return this.published;
  }

  /** Cold-open path: reuse the published snapshot when one exists,
   * join the in-flight load when one is running, otherwise start
   * the next generation. Concurrent callers share ONE source read. */
  ensureLoaded(): Promise<GraphLoadResult> {
    const published = this.store.getState().graphSnapshot;
    if (published !== null) return Promise.resolve(published);
    if (this.inFlight !== null) return this.inFlight.promise;
    return this.startLoad();
  }

  /** Explicit re-read: ALWAYS starts a fresh generation, so every
   * surface switches to the new published snapshot together once
   * the read completes. */
  refresh(): Promise<GraphLoadResult> {
    return this.startLoad();
  }

  private startLoad(): Promise<GraphLoadResult> {
    const generation = ++this.generation;
    const promise = loadGraphFromSource(this.source).then((load) => {
      if (this.inFlight?.generation === generation) this.inFlight = null;
      // Stale completion rejection: only a generation newer than
      // everything published so far may enter the store; an older
      // load completing late is dropped without touching state.
      if (generation > this.published) {
        this.published = generation;
        publishGraphLoad(this.store, load);
      }
      return load;
    });
    this.inFlight = { generation, promise };
    return promise;
  }
}
