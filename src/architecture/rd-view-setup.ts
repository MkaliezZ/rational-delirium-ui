/** v1.6.1 §2 — RD view setup: the single place where RD views are
 * registered (v1.6.0 §5). main.ts calls registerRDViews() and stays
 * a thin composition root; this module owns the registration list,
 * preserving every existing v0.4/v1.3.1 command id, name, icon and
 * placement byte-for-byte while adding the v1.6.1 workspace shell.
 *
 * Registration is separated from both main.ts and the view
 * implementations; adding a future area (v1.6.3) means adding one
 * registration here, not growing main.ts.
 */

import type { ItemView, Plugin, WorkspaceLeaf } from "obsidian";
import { RDViewRegistry, activateRDView } from "./view-registry";
import { RDWorkspaceStore } from "./workspace-state";
import { RDWorkspaceShellView, RD_WORKSPACE_VIEW_TYPE } from "../views/rd-workspace-view";
import { RDContextView, RD_CONTEXT_VIEW_TYPE } from "../views/context-view";
import { RDInvestigationView, RD_INVESTIGATION_VIEW_TYPE } from "../views/investigation-view";
import { RDLoopView, RD_LOOP_VIEW_TYPE } from "../views/loop-view";
import { RDGraphIntelligenceView, RD_GRAPH_VIEW_TYPE } from "../views/graph-intelligence-view";
import { RDKnowledgePanelView, RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "../views/knowledge-panel-view";
import type { ContextController } from "../context/context-controller";
import type { RDIndex } from "../index/rd-index";
import type { NavigationPort } from "../platform/navigation-core";
import type { GraphSource } from "../semantic-graph/graph-loader";
import type { KoSourceReader } from "../semantic-graph/ko-detail-reader";
import { createDefaultThemeRegistry } from "../themes/rational-archive";
import { RDThemeController } from "../themes/theme-runtime";

/** Everything views need, supplied by main.ts. */
export interface RDServices {
  readonly controller: ContextController;
  readonly index: RDIndex;
  readonly onIndexCommit: (cb: () => void) => () => void;
  readonly onActiveFile: (cb: (path: string | null) => void) => () => void;
  readonly activeFileProvider: () => string | null;
  readonly navigation: NavigationPort;
  readonly graphSource: GraphSource;
  readonly koSourceReader: KoSourceReader;
}

type S = Readonly<Record<string, unknown>>;

export function buildRDViewRegistry(): RDViewRegistry {
  const registry = new RDViewRegistry();

  registry.add({
    viewType: RD_CONTEXT_VIEW_TYPE,
    displayText: "Open RD Context",
    icon: "file-search",
    placement: "right",
    commandId: "open-rd-context",
    commandName: "Open RD Context",
    ribbonIcon: "file-search",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDContextView(leaf, services.controller as ContextController,
        services.navigation as NavigationPort),
  });

  registry.add({
    viewType: RD_INVESTIGATION_VIEW_TYPE,
    displayText: "Open RD Investigation",
    icon: "layout-list",
    placement: "main",
    commandId: "open-rd-investigation",
    commandName: "Open RD Investigation",
    ribbonIcon: "layout-list",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDInvestigationView(leaf, viewDeps(services)),
  });

  registry.add({
    viewType: RD_LOOP_VIEW_TYPE,
    displayText: "Open RD Loop Workspace",
    icon: "iteration-ccw",
    placement: "main",
    commandId: "open-rd-loop-workspace",
    commandName: "Open RD Loop Workspace",
    ribbonIcon: "iteration-ccw",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDLoopView(leaf, liveDeps(services)),
  });

  registry.add({
    viewType: RD_GRAPH_VIEW_TYPE,
    displayText: "Open RD Graph Intelligence",
    icon: "git-fork",
    placement: "main",
    commandId: "open-rd-graph-intelligence",
    commandName: "Open RD Graph Intelligence",
    ribbonIcon: "git-fork",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDGraphIntelligenceView(leaf, liveDeps(services)),
  });

  registry.add({
    viewType: RD_KNOWLEDGE_PANEL_VIEW_TYPE,
    displayText: "Open RD Knowledge Panel",
    icon: "book-open",
    placement: "main",
    commandId: "open-rd-knowledge-panel",
    commandName: "Open RD Knowledge Panel",
    ribbonIcon: "book-open",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDKnowledgePanelView(leaf, {
        source: services.graphSource as GraphSource,
        sourceReader: services.koSourceReader as KoSourceReader,
        workspace: "default",
      }),
  });

  registry.add({
    viewType: RD_WORKSPACE_VIEW_TYPE,
    displayText: "Open RD Workspace",
    icon: "library",
    placement: "main",
    commandId: "open-rd-workspace",
    commandName: "Open RD Workspace",
    ribbonIcon: "library",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDWorkspaceShellView(leaf, {
        store: services.workspaceStore as RDWorkspaceStore,
        source: services.graphSource as GraphSource,
        openView: services.openView as (viewType: string) => Promise<void>,
        themeController: services.themeController as RDThemeController,
      }),
  });

  return registry;
}

function viewDeps(services: S) {
  return {
    index: services.index as RDIndex,
    onIndexCommit: services.onIndexCommit as (cb: () => void) => () => void,
    navigation: services.navigation as NavigationPort,
  };
}

function liveDeps(services: S) {
  return {
    ...viewDeps(services),
    onActiveFile: services.onActiveFile as (cb: (path: string | null) => void) => () => void,
    activeFileProvider: services.activeFileProvider as () => string | null,
  };
}

/** Register all RD views onto the plugin. Creates the shared
 * session-only UI state store and the explicit openView path. No
 * view is activated here — registration never opens anything. */
export function registerRDViews(plugin: Plugin, services: RDServices): RDViewRegistry {
  const registry = buildRDViewRegistry();
  const workspaceStore = new RDWorkspaceStore();
  // v1.6.2: single shipped theme; explicit, session-only selection.
  const themeController = new RDThemeController(
    createDefaultThemeRegistry(), "rational-archive");
  const openView = async (viewType: string): Promise<void> => {
    const reg = registry.get(viewType);
    if (reg === undefined) return;
    await activateRDView(plugin, reg);
  };
  registry.registerAll({
    plugin,
    services: { ...services, workspaceStore, openView, themeController },
  });
  return registry;
}
