import { App, MarkdownView, TFile, WorkspaceLeaf, resolveSubpath } from "obsidian";
import type { NavigationPort, NavigationTarget, OpenMode } from "./navigation-core";
import { NATIVE_LOCAL_GRAPH_COMMAND_ID } from "./navigation-core";
import { parseObject } from "../parsers/object-parser";

/** RD-10/RR-03: production navigation adapter. Primary action opens
 * the TARGET; split uses workspace.getLeaf("split"). Never replaces
 * the Context leaf. Broken/deleted targets are silently refused. */
export class ObsidianNavigationPort implements NavigationPort {
  constructor(private readonly app: App) {}

  activeSurface(): "rd-context" | "editor" {
    const leaf = this.app.workspace.activeLeaf;
    if (leaf === null) return "editor";
    return leaf.view.getViewType() === "rd-context" ? "rd-context" : "editor";
  }

  async open(target: NavigationTarget, mode: OpenMode): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(target.path);
    if (!(file instanceof TFile)) return;
    const leaf = this.pickLeaf(mode);
    if (leaf === null) return;
    try {
      await leaf.openFile(file);
      const view = leaf.view;
      if (!(view instanceof MarkdownView) || view.file?.path !== file.path) return;
      if (mode === "source") {
        // sourceRevision is an index generation, not a filesystem clock.
        // Re-resolve the declaration in CURRENT text on every source click.
        // Missing/ambiguous locators degrade to file-only navigation.
        if (target.sourceRevision === undefined || target.sourceLocator === undefined) return;
        const current = await this.app.vault.read(file);
        if (leaf.view !== view || view.file?.path !== file.path) return;
        // An open editor can contain newer, unsaved text than the Vault read.
        const buffer = view.editor.getValue();
        const content = buffer === current ? current : buffer;
        const assertions = parseObject(file.path, content, file.stat.mtime,
          target.sourceRevision).assertions;
        const locator = target.sourceLocator;
        const matches = assertions.filter((a) => a.location.kind === "body"
          && a.predicate === locator.predicate && a.link.raw === locator.raw);
        if (matches.length === 1 && matches[0].location.line !== undefined) {
          view.editor.setCursor({ line: matches[0].location.line - 1, ch: 0 });
        }
      } else if (target.subpath) {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache === null) return;
        // Obsidian's public resolver uses #^block for block link subpaths.
        const subpath = target.subpath.startsWith("^") ? "#" + target.subpath : target.subpath;
        const resolved = resolveSubpath(cache, subpath);
        if (resolved !== null) {
          view.editor.setCursor({ line: resolved.start.line, ch: resolved.start.col });
        }
      }
    } catch {
      // File disappearance or an unavailable current read must never reuse
      // the old cursor, nor create/repair a file.
    }
  }

  /** v0.4.4 §17 + GI-01/GI-03 repair: restrained native Local Graph
   * handoff. The only structural cast (command registry lookup) lives
   * HERE, runtime shape-guarded, never exposed to projections/views.
   * The requested path is opened as the EXACT TFile via leaf/file
   * APIs — never as linktext, so filesystem paths containing `#`
   * cannot be reinterpreted and no note can ever be created. The
   * command dispatch result must be an explicit success. */
  async openLocalGraph(path: string): Promise<"OPENED" | "UNAVAILABLE"> {
    const commands = (this.app as {
      commands?: { executeCommandById?: (id: string) => unknown };
    }).commands;
    if (commands === undefined || typeof commands.executeCommandById !== "function") {
      return "UNAVAILABLE";
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return "UNAVAILABLE";
    try {
      // GI-01: exact-TFile anchoring via leaf/file APIs only.
      const leaf = this.app.workspace.getLeaf(false);
      if (leaf === null) return "UNAVAILABLE";
      await leaf.openFile(file);
      this.app.workspace.revealLeaf(leaf);
      // GI-01: verify the active markdown path is EXACTLY the request
      // before dispatching; any race/deletion/mismatch degrades.
      const active = this.app.workspace.getActiveFile();
      if (active === null || active.path !== path) return "UNAVAILABLE";
      // GI-03: read the dispatch result; only explicit success opens.
      const result = await commands.executeCommandById(NATIVE_LOCAL_GRAPH_COMMAND_ID);
      if (result !== true) return "UNAVAILABLE";
      return "OPENED";
    } catch {
      return "UNAVAILABLE";
    }
  }

  private pickLeaf(mode: OpenMode): WorkspaceLeaf | null {
    const ws = this.app.workspace;
    const active = ws.activeLeaf;
    const contextFocused =
      active !== null && active.view.getViewType() === "rd-context";
    if (mode === "tab") return ws.getLeaf(true);
    if (mode === "split") return ws.getLeaf("split");
    if (contextFocused) {
      const markdownLeaves = ws.getLeavesOfType("markdown");
      if (markdownLeaves.length > 0) return markdownLeaves[0];
      return ws.getLeaf(false);
    }
    return ws.getLeaf(false);
  }
}
