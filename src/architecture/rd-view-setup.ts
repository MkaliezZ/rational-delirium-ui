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
import { GraphSnapshotCoordinator } from "./graph-snapshot-coordinator";
import { RDShellController } from "./rd-shell-controller";
import { RDWorkspaceShellView, RD_WORKSPACE_VIEW_TYPE } from "../views/rd-workspace-view";
import { RDContextView, RD_CONTEXT_VIEW_TYPE } from "../views/context-view";
import { RDInvestigationView, RD_INVESTIGATION_VIEW_TYPE } from "../views/investigation-view";
import { RDLoopView, RD_LOOP_VIEW_TYPE } from "../views/loop-view";
import { RDGraphIntelligenceView, RD_GRAPH_VIEW_TYPE } from "../views/graph-intelligence-view";
import { RDKnowledgePanelView, RD_KNOWLEDGE_PANEL_VIEW_TYPE } from "../views/knowledge-panel-view";
import { RDArchiveNavView, RD_ARCHIVE_NAV_VIEW_TYPE } from "../views/archive-nav-view";
import { RDInspectorView, RD_INSPECTOR_VIEW_TYPE } from "../views/inspector-view";
import type { ContextController } from "../context/context-controller";
import type { RDIndex } from "../index/rd-index";
import type { NavigationPort } from "../platform/navigation-core";
import type { GraphSource } from "../semantic-graph/graph-loader";
import type { KoSourceReader } from "../semantic-graph/ko-detail-reader";
import { createDefaultThemeRegistry } from "../themes/rational-archive";
import { RDThemeController } from "../themes/theme-runtime";
import type { CollaborationArtifactSource } from "../collaboration/artifact-reader";
import type { ProposalDecisionPort } from "../collaboration/proposal-decision";
import { CollaborationBrowser } from "../collaboration/collaboration-surface";

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
  readonly collaborationSource: CollaborationArtifactSource;
  readonly decisionPort: ProposalDecisionPort;
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
        sourceReader: services.koSourceReader as KoSourceReader,
        collaborationSource: services.collaborationSource as CollaborationArtifactSource,
        decisionPort: services.decisionPort as ProposalDecisionPort,
        openView: services.openView as (viewType: string) => Promise<void>,
        themeController: services.themeController as RDThemeController,
        browser: services.collaborationBrowser as CollaborationBrowser,
        shellController: services.shellController as RDShellController,
        coordinator: services.graphCoordinator as GraphSnapshotCoordinator,
      }),
  });

  // V2 Phase A: the two dock leaves of the real shell, appended
  // AFTER the existing six registrations (which stay untouched).
  registry.add({
    viewType: RD_ARCHIVE_NAV_VIEW_TYPE,
    displayText: "Open RD Archive Navigation",
    icon: "archive",
    placement: "left",
    commandId: "open-rd-archive-nav",
    commandName: "Open RD Archive Navigation",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDArchiveNavView(leaf, {
        store: services.workspaceStore as RDWorkspaceStore,
        source: services.graphSource as GraphSource,
        coordinator: services.graphCoordinator as GraphSnapshotCoordinator,
        openView: services.openView as (viewType: string) => Promise<void>,
      }),
  });

  registry.add({
    viewType: RD_INSPECTOR_VIEW_TYPE,
    displayText: "Open RD Inspector",
    icon: "panel-right",
    placement: "right",
    commandId: "open-rd-inspector",
    commandName: "Open RD Inspector",
    createView: (leaf: WorkspaceLeaf, services: S): ItemView =>
      new RDInspectorView(leaf, {
        store: services.workspaceStore as RDWorkspaceStore,
        source: services.graphSource as GraphSource,
        coordinator: services.graphCoordinator as GraphSnapshotCoordinator,
        browser: services.collaborationBrowser as CollaborationBrowser,
        shellController: services.shellController as RDShellController,
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
 * session-only UI state store, the shared collaboration browser,
 * the shell controller, and the explicit openView path. No
 * view is activated here — registration never opens anything. */
export function registerRDViews(plugin: Plugin, services: RDServices): RDViewRegistry {
  const registry = buildRDViewRegistry();
  const workspaceStore = new RDWorkspaceStore();
  // V2-01: one graph snapshot coordinator per session — the single
  // load/publish authority shared by the workspace and both docks
  // (cold-open dedup, explicit generations, stale rejection).
  const graphCoordinator = new GraphSnapshotCoordinator(
    workspaceStore, services.graphSource);
  // v1.6.2: single shipped theme; explicit, session-only selection.
  const themeController = new RDThemeController(
    createDefaultThemeRegistry(), "rational-archive");
  // V2: one collaboration browser shared by the workspace view
  // (which drives its explicit refreshes) and the inspector dock
  // (which only subscribes).
  const collaborationBrowser = new CollaborationBrowser();
  // V2 Phase A: the shell controller owns the body scope class and
  // the dock leaves while an RD Workspace leaf is open.
  const shellController = new RDShellController(plugin.app, workspaceStore);
  plugin.register(() => shellController.dispose());
  plugin.register(() => collaborationBrowser.dispose());
  const openView = async (viewType: string): Promise<void> => {
    const reg = registry.get(viewType);
    if (reg === undefined) return;
    await activateRDView(plugin, reg);
  };
  registry.registerAll({
    plugin,
    services: {
      ...services, workspaceStore, openView, themeController,
      collaborationBrowser, shellController, graphCoordinator,
    },
  });
  return registry;
}
