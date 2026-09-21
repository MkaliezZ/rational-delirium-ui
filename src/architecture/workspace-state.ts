/** v1.6.1 §3 — RD workspace UI state foundation.
 *
 * This store holds UI state ONLY: which logical workspace label the
 * shell shows, which object id the user is inspecting, the UI
 * navigation trail, and the availability of the derived snapshot.
 * It is session-only in-memory presentation bookkeeping.
 *
 * It is NOT knowledge state, lifecycle state or authority state:
 * it has no vault access, no write verb, no lifecycle transition,
 * and nothing here can promote, adopt or mutate anything. Emitted
 * states are deeply frozen read models.
 *
 * V2 shell (Phase A): the store also carries the one published
 * graph snapshot read model and the desk mode, so the dock leaves
 * (archive navigation, inspector) and the central workspace all
 * render from the SAME session state — no second index, no
 * per-view copy.
 */

import type { GraphLoadResult } from "../semantic-graph/graph-loader";

export type RDAvailabilityState =
  | "available"
  | "missing"
  | "ambiguous"
  | "unavailable"
  | "invalid"
  | "not_loaded";

export interface RDSnapshotAvailability {
  readonly state: RDAvailabilityState;
  readonly note: string;
}

export interface RDWorkspaceUIState {
  readonly workspaceLabel: string;
  readonly selectedObjectId: string | null;
  /** UI navigation trail of visited object ids (most recent last).
   * A presentation breadcrumb — it records where the USER walked,
   * not any knowledge lineage. */
  readonly navigation: readonly string[];
  readonly snapshot: RDSnapshotAvailability;
  /** Which surface the desk center shows. Pure presentation; the
   * collaboration surface is read-only either way. */
  readonly workspaceMode: RDWorkspaceMode;
  /** The one published result of an explicit snapshot read. Shared
   * by every shell view; null until the first read lands. Already
   * a frozen read model from the loader. */
  readonly graphSnapshot: GraphLoadResult | null;
}

/** Desk center mode — investigation dossier or the read-only
 * collaboration surface. */
export type RDWorkspaceMode = "investigation" | "collaboration";

const INITIAL: RDWorkspaceUIState = Object.freeze({
  workspaceLabel: "default",
  selectedObjectId: null,
  navigation: Object.freeze([]),
  snapshot: Object.freeze({ state: "not_loaded", note: "not loaded yet" }),
  workspaceMode: "investigation",
  graphSnapshot: null,
});

type Listener = (state: RDWorkspaceUIState) => void;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

export class RDWorkspaceStore {
  private state: RDWorkspaceUIState = INITIAL;
  private readonly listeners = new Set<Listener>();
  private disposed = false;

  getState(): RDWorkspaceUIState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** UI pointer to the object being inspected. Setting it does not
   * read, validate, resolve or change any knowledge object. */
  setSelectedObject(objectId: string | null): void {
    this.update({
      selectedObjectId: objectId,
      navigation: objectId === null
        ? this.state.navigation
        : [...this.state.navigation, objectId],
    });
  }

  /** Step back along the UI trail; returns to no selection when the
   * trail is exhausted. */
  back(): void {
    if (this.state.navigation.length === 0) {
      this.update({ selectedObjectId: null });
      return;
    }
    const navigation = this.state.navigation.slice(0, -1);
    this.update({
      navigation,
      selectedObjectId: navigation.length > 0 ? navigation[navigation.length - 1] : null,
    });
  }

  /** Display label of the selected logical workspace. Switching it
   * clears the pending inspection context (v1.6.0 §5: explicit
   * workspace switching clears context; no cross-workspace
   * substitution). */
  setWorkspaceLabel(label: string): void {
    this.update({
      workspaceLabel: label,
      selectedObjectId: null,
      navigation: [],
    });
  }

  /** Availability of the derived snapshot, as last observed by an
   * explicit read. Presentation state only — never a claim about
   * knowledge validity. */
  setSnapshotAvailability(snapshot: RDSnapshotAvailability): void {
    this.update({ snapshot });
  }

  /** Publish the result of one explicit snapshot read so every
   * shell view renders the same data. The read model is frozen by
   * the loader; the store never mutates it. */
  setGraphSnapshot(graphSnapshot: GraphLoadResult | null): void {
    this.update({ graphSnapshot });
  }

  /** Switch the desk center between the dossier and the read-only
   * collaboration surface. Explicit user navigation only. */
  setWorkspaceMode(workspaceMode: RDWorkspaceMode): void {
    this.update({ workspaceMode });
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private update(patch: Partial<RDWorkspaceUIState>): void {
    if (this.disposed) return;
    this.state = deepFreeze({ ...this.state, ...patch });
    for (const listener of [...this.listeners]) listener(this.state);
  }
}

/** Publish one explicit snapshot read into the shared store: the
 * frozen read model plus its honest availability note. Every view
 * that performs an explicit read publishes through this single
 * path so the wording — including the "missing artifact does not
 * mean no knowledge exists" honesty — stays identical no matter
 * which view happened to read first. */
export function publishGraphLoad(store: RDWorkspaceStore, load: GraphLoadResult): void {
  store.setGraphSnapshot(load);
  if (load.state === "available") {
    store.setSnapshotAvailability({
      state: "available",
      note:
        `${load.graph.nodes.length} objects, ${load.graph.edges.length} declared relations ` +
        "(freshness unverified)",
    });
  } else if (load.state === "missing") {
    store.setSnapshotAvailability({
      state: "missing",
      note: "Graph artifact missing — this does not mean no knowledge exists.",
    });
  } else if (load.state === "invalid") {
    store.setSnapshotAvailability({
      state: "invalid",
      note: `Graph artifact invalid (${load.reason}).`,
    });
  } else {
    store.setSnapshotAvailability({
      state: "unavailable",
      note: `Graph artifact unavailable (${load.reason}).`,
    });
  }
}
