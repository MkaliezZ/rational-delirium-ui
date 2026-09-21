/** v1.6.1 §2 — RD view registry: registration separated from
 * main.ts and from view implementations (v1.6.0 §5).
 *
 * A registration describes ONE view: its type, display metadata,
 * placement, factory and command surface. RDViewRegistry only
 * records registrations and replays them onto a host; it never
 * imports view classes itself — wiring happens in rd-view-setup.
 * This keeps main.ts a thin composition root and stops it growing
 * monolithically as future areas (v1.6.3) are added.
 */

import type { ItemView, Plugin, WorkspaceLeaf } from "obsidian";

/** Everything a registration needs to construct its view. Supplied
 * by the host (main.ts) — registrations stay free of Obsidian port
 * construction. */
export interface RDViewHostContext {
  readonly plugin: Plugin;
  /** Per-registration view construction input beyond the leaf. */
  readonly services: Readonly<Record<string, unknown>>;
}

export interface RDViewRegistration {
  readonly viewType: string;
  readonly displayText: string;
  readonly icon: string;
  /** "left"/"right" = sidebar dock leaves, "main" = main-area tab. */
  readonly placement: "left" | "right" | "main";
  readonly commandId: string;
  readonly commandName: string;
  /** Ribbon icon text; omit for no ribbon entry point. */
  readonly ribbonIcon?: string;
  readonly createView: (leaf: WorkspaceLeaf, services: Readonly<Record<string, unknown>>) => ItemView;
}

export class RDViewRegistry {
  private readonly registrations: RDViewRegistration[] = [];
  private readonly byType = new Map<string, RDViewRegistration>();

  add(registration: RDViewRegistration): void {
    if (this.byType.has(registration.viewType)) {
      throw new Error(`duplicate RD view type: ${registration.viewType}`);
    }
    this.byType.set(registration.viewType, registration);
    this.registrations.push(registration);
  }

  registrations_(): readonly RDViewRegistration[] {
    return this.registrations;
  }

  get(viewType: string): RDViewRegistration | undefined {
    return this.byType.get(viewType);
  }

  /** Replay all registrations onto the host plugin: view factory,
   * optional ribbon, command with explicit activation (reuse the
   * existing leaf of that type, else open a new one). No view is
   * ever activated automatically by registration. */
  registerAll(ctx: RDViewHostContext): void {
    for (const reg of this.registrations) {
      ctx.plugin.registerView(reg.viewType, (leaf: WorkspaceLeaf) =>
        reg.createView(leaf, ctx.services));
      if (reg.ribbonIcon !== undefined) {
        ctx.plugin.addRibbonIcon(reg.ribbonIcon, reg.displayText, () => {
          void activateRDView(ctx.plugin, reg);
        });
      }
      ctx.plugin.addCommand({
        id: reg.commandId,
        name: reg.commandName,
        callback: () => {
          void activateRDView(ctx.plugin, reg);
        },
      });
    }
  }
}

/** Explicit activation: reuse the existing leaf of this view type
 * when present, otherwise open a placement-appropriate new leaf.
 * This is the only activation path; nothing auto-opens. */
export async function activateRDView(
  plugin: Plugin,
  reg: RDViewRegistration,
): Promise<void> {
  const existing = plugin.app.workspace.getLeavesOfType(reg.viewType);
  const leaf = existing[0] ??
    (reg.placement === "right"
      ? plugin.app.workspace.getRightLeaf(false)
      : reg.placement === "left"
        ? plugin.app.workspace.getLeftLeaf(false)
        : plugin.app.workspace.getLeaf(true));
  if (leaf === null) return;
  await leaf.setViewState({ type: reg.viewType, active: true });
  plugin.app.workspace.revealLeaf(leaf);
}
