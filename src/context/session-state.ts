/** Memory-only session state. NOTHING here may ever be persisted:
 * no Obsidian data-persistence calls, no web storage, no IndexedDB,
 * no frontmatter, no workspace serialization, no Bridge storage. */

export type ContextMode = "FOLLOW" | "PINNED";

export interface SessionState {
  mode: ContextMode;
  pinnedPath: string | null;
  /** Last real Markdown leaf path ever active (FOLLOW anchor). */
  lastMarkdownAnchor: string | null;
  /** True once the pinned target was observed deleted. */
  pinnedDeleted: boolean;
  filter: string | null;
  expandedSections: Set<string>;
  selectedRelationPath: string | null;
}

export function freshSessionState(): SessionState {
  return {
    mode: "FOLLOW",
    pinnedPath: null,
    lastMarkdownAnchor: null,
    pinnedDeleted: false,
    filter: null,
    expandedSections: new Set<string>(),
    selectedRelationPath: null,
  };
}

/** Plugin reload always starts in FOLLOW with no memory. */
export function resetSession(state: SessionState): void {
  const fresh = freshSessionState();
  state.mode = fresh.mode;
  state.pinnedPath = fresh.pinnedPath;
  state.lastMarkdownAnchor = fresh.lastMarkdownAnchor;
  state.pinnedDeleted = fresh.pinnedDeleted;
  state.filter = fresh.filter;
  state.expandedSections = fresh.expandedSections;
  state.selectedRelationPath = fresh.selectedRelationPath;
}
