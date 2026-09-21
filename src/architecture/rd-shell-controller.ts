/** V2 Phase A — RD shell controller: the presentation-only owner of
 * the real Obsidian shell integration for the Rational Archive.
 *
 * While an RD Workspace leaf is open, the controller marks the app
 * body with the shell scope class and ensures the two dock leaves
 * exist (archive navigation on the left, inspector on the right).
 * When the workspace closes — or the plugin unloads — the scope
 * class and the dock leaves go away. Pure presentation wiring:
 * no writes, no timers, no polling, no layout resets, no focus
 * theft (dock leaves are created inactive and only the main
 * workspace leaf is ever revealed).
 *
 * Lifecycle: created once in registerRDViews; the workspace view
 * calls attach() from onOpen and release() from onClose; the
 * plugin unload path calls dispose(). All three are idempotent.
 */

import type { App } from "obsidian";
import type { RDWorkspaceStore } from "./workspace-state";
import type { RDWorkspaceShellView } from "../views/rd-workspace-view";
import { RD_WORKSPACE_VIEW_TYPE } from "../views/rd-workspace-view";
import { RD_ARCHIVE_NAV_VIEW_TYPE } from "../views/archive-nav-view";
import { RD_INSPECTOR_VIEW_TYPE } from "../views/inspector-view";

/** Body scope class for the active Rational Archive shell. */
export const RD_SHELL_BODY_CLASS = "rd-rational-archive-shell";

export class RDShellController {
  private attached = false;
  /** The one open workspace view (activateRDView reuses the leaf,
   * so at most one exists). Set on attach, cleared on release. */
  private workspaceView: RDWorkspaceShellView | null = null;

  constructor(
    private readonly app: App,
    private readonly store: RDWorkspaceStore,
  ) {}

  /** Shell active: mark the body scope and ensure both dock leaves
   * exist. Idempotent — repeated attachment never creates duplicate
   * leaves and never steals focus. */
  attach(view: RDWorkspaceShellView): void {
    this.workspaceView = view;
    document.body.classList.add(RD_SHELL_BODY_CLASS);
    if (this.attached) return;
    this.attached = true;
    const workspace = this.app.workspace;
    if (workspace.getLeavesOfType(RD_ARCHIVE_NAV_VIEW_TYPE).length === 0) {
      void workspace.ensureSideLeaf(RD_ARCHIVE_NAV_VIEW_TYPE, "left", { active: false });
    }
    if (workspace.getLeavesOfType(RD_INSPECTOR_VIEW_TYPE).length === 0) {
      void workspace.ensureSideLeaf(RD_INSPECTOR_VIEW_TYPE, "right", { active: false });
    }
  }

  /** Shell inactive: remove the body scope and detach the two dock
   * leaves. Controlled — only the workspace view's own close path
   * (or dispose) calls this. Idempotent. */
  release(): void {
    this.workspaceView = null;
    if (!this.attached) return;
    this.attached = false;
    document.body.classList.remove(RD_SHELL_BODY_CLASS);
    const workspace = this.app.workspace;
    workspace.detachLeavesOfType(RD_ARCHIVE_NAV_VIEW_TYPE);
    workspace.detachLeavesOfType(RD_INSPECTOR_VIEW_TYPE);
  }

  /** Plugin unload path — the idempotent release. */
  dispose(): void {
    this.release();
  }

  /** Inspector review row → open the proposal in the workspace's
   * collaboration surface. Reuses/reveals the existing main
   * workspace leaf (never spawns a duplicate), then delegates to
   * the view's public navigation method. */
  async openProposalInWorkspace(path: string): Promise<void> {
    const view = this.workspaceView;
    if (view === null) return;
    await this.revealWorkspaceLeaf();
    view.openProposalInCollaboration(path);
  }

  /** Inspector contribution row → open the contribution in the
   * workspace's collaboration surface. Same leaf reuse as above. */
  async openContributionInWorkspace(path: string): Promise<void> {
    const view = this.workspaceView;
    if (view === null) return;
    await this.revealWorkspaceLeaf();
    view.openContributionInCollaboration(path);
  }

  private async revealWorkspaceLeaf(): Promise<void> {
    const leaf = this.app.workspace.getLeavesOfType(RD_WORKSPACE_VIEW_TYPE)[0] ?? null;
    if (leaf !== null) await this.app.workspace.revealLeaf(leaf);
  }
}
