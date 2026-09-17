import type { ProjectionRelationRow } from "../model";

export interface NavigationTarget {
  path: string;
  line?: number;
  subpath?: string;
  sourceRevision?: number;
  sourceLocator?: ProjectionRelationRow["sourceLocator"];
}

export type OpenMode = "normal" | "tab" | "split" | "source";

export interface NavigationPort {
  open(target: NavigationTarget, mode: OpenMode): void;
  activeSurface(): "rd-context" | "editor";
  /** v0.4.4 §17: restrained native Local Graph handoff. Optional so
   * existing NavigationPort test doubles stay valid; the production
   * ObsidianNavigationPort implements it. UI navigation only — no
   * graph renderer internals are touched. */
  openLocalGraph?(path: string): Promise<"OPENED" | "UNAVAILABLE">;
}

/** v0.4.4 §17: verified by read-only inspection of the installed
 * Obsidian 1.13.7 command registry (not guessed). */
export const NATIVE_LOCAL_GRAPH_COMMAND_ID = "graph:open-local";

/** Shared planning logic (unit tested): when Context has focus,
 * navigation routes to an editor leaf; broken targets are refused. */
export function planOpen(
  port: NavigationPort,
  target: NavigationTarget | null,
  mode: OpenMode,
): { target: NavigationTarget; mode: OpenMode; chosenLeaf: "editor" } | null {
  if (target === null || target.path.length === 0) return null;
  port.open(
    target,
    mode === "source" && target.line === undefined ? "normal" : mode,
  );
  return { target, mode, chosenLeaf: "editor" };
}

/** Test adapter: records calls, never opens or creates anything. */
export class FakeNavigator implements NavigationPort {
  readonly calls: Array<{ target: NavigationTarget; mode: OpenMode }> = [];
  private surface: "rd-context" | "editor" = "editor";

  setSurface(surface: "rd-context" | "editor"): void {
    this.surface = surface;
  }

  activeSurface(): "rd-context" | "editor" {
    return this.surface;
  }

  open(target: NavigationTarget, mode: OpenMode): void {
    this.calls.push({ target, mode });
  }
}
