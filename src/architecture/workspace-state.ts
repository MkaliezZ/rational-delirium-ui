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
 */

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
}

const INITIAL: RDWorkspaceUIState = Object.freeze({
  workspaceLabel: "default",
  selectedObjectId: null,
  navigation: Object.freeze([]),
  snapshot: Object.freeze({ state: "not_loaded", note: "not loaded yet" }),
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
