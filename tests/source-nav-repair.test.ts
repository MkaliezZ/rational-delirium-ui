import { afterEach, describe, expect, it } from "vitest";
import { ProductionAcceptanceHost } from "./support/production-acceptance-host";
import { fixtureNote } from "./support/fake-adapter";
import { RDContextView } from "../src/views/context-view";
import { ObsidianNavigationPort } from "../src/platform/obsidian-navigation";
import { RuntimeWiring } from "../src/runtime/runtime-wiring";
import type { App } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";

/**
 * GI-RT-01 deterministic regression: the plugin source cursor must be
 * applied AFTER the native reveal/restoration boundary, never before.
 * The host models: openFile() resolves while native restoration is
 * still pending (it later applies cursor line 1); revealLeaf() awaits
 * that restoration — the documented Obsidian lifecycle contract.
 */

const A = "CASES/A.md", B = "EVIDENCE/B.md";

const note = (path: string, id: string, body = "") =>
  fixtureNote({ path, type: path.startsWith("CASES/") ? "case" : "evidence", id, body });

const bodyNote = (id: string, body: string) =>
  "---\ntype: case\nid: " + id + "\n---\n\n# " + id + "\n\n" + body + "\n";

const hosts: ProductionAcceptanceHost[] = [];
const ports: ObsidianNavigationPort[] = [];

async function deferredHost(entries: Array<[string, string]>, active = A): Promise<{
  host: ProductionAcceptanceHost; port: ObsidianNavigationPort;
}> {
  const host = new ProductionAcceptanceHost();
  hosts.push(host);
  for (const [path, content] of entries) host.vault.setCurrent(path, content);
  host.workspace.activeFile = { path: active };
  host.navState.deferRestore = true;
  const port = new ObsidianNavigationPort(host.app as unknown as App);
  ports.push(port);
  return { host, port };
}

afterEach(() => { for (const h of hosts.splice(0)) h.wiring.dispose(); });

const SOURCE_A = {
  path: A,
  line: 8,
  sourceRevision: 1,
  sourceLocator: { predicate: "derived_from" as const, raw: "B" },
};

describe("GI-RT-01: source cursor ordering across the reveal boundary", () => {
  it("A. first open: native restore (line 1) settles FIRST, plugin cursor LAST", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "derived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ], B); // A not currently active
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));

    const leaf = host.workspace.leaves[0];
    // ordering proof: native restoration cursor, then plugin cursor
    expect(leaf.view.cursors).toEqual([
      { line: 0, ch: 0 },   // native editor-state restoration (line 1)
      { line: 7, ch: 0 },   // plugin stable source cursor (line 8, 0-based 7)
    ]);
    expect(host.navState.events).toEqual(["reveal-await", "native-restore"]);
    expect(leaf.view.cursors[leaf.view.cursors.length - 1].line).toBe(7);
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("B. already-open source file: same stable final cursor", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "derived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ], A); // A already active
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));
    const leaf = host.workspace.leaves[0];
    const last = leaf.view.cursors[leaf.view.cursors.length - 1];
    expect(last).toEqual({ line: 7, ch: 0 });
    expect(leaf.view.cursors[0]).toEqual({ line: 0, ch: 0 }); // native first
  });

  it("C. relocated assertion: CURRENT text wins (line 10 → line 13)", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "one\ntwo\nthree\nderived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ], B);
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));
    const leaf = host.workspace.leaves[0];
    const last = leaf.view.cursors[leaf.view.cursors.length - 1];
    expect(last).toEqual({ line: 10, ch: 0 }); // current line 11 (1-based), 0-based 10
    expect(leaf.view.cursors[0]).toEqual({ line: 0, ch: 0 });
  });

  it("D. missing locator: file opens, NO guessed plugin cursor", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "no declaration here")],
      [B, note(B, "ACTUAL-B")],
    ], B);
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));
    const leaf = host.workspace.leaves[0];
    expect(leaf.view.file?.path).toBe(A);
    expect(leaf.view.cursors).toEqual([{ line: 0, ch: 0 }]); // native only
    expect(host.vault.writeCalls).toEqual([]);
  });

  it("E. ambiguous locator (2 matches): file opens, NO plugin cursor", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "derived_from: [[B]]\nderived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ], B);
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));
    const leaf = host.workspace.leaves[0];
    expect(leaf.view.cursors).toEqual([{ line: 0, ch: 0 }]);
  });

  it("F. view/file race across the boundary: degrade safely, no cursor into wrong file", async () => {
    const { host, port } = await deferredHost([
      [A, bodyNote("ACTUAL-A", "derived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ], B);
    host.navState.swapAfterRestore = B; // restoration swaps the view's file
    await port.open({ ...SOURCE_A }, "source");
    await new Promise((r) => setTimeout(r, 5));
    const leaf = host.workspace.leaves[0];
    expect(leaf.view.file?.path).toBe(B); // view moved on
    expect(leaf.view.cursors).toEqual([{ line: 0, ch: 0 }]); // native only — no plugin cursor
    expect(host.vault.writeCalls).toEqual([]);
  });
});

describe("GI-RT-01: existing host suites unaffected (deferRestore off)", () => {
  it("normal source navigation keeps exact single cursor expectation", async () => {
    const host = new ProductionAcceptanceHost();
    hosts.push(host);
    await host.start([
      [A, bodyNote("ACTUAL-A", "derived_from: [[B]]")],
      [B, note(B, "ACTUAL-B")],
    ]);
    await host.click('.rdc-src[aria-label="Jump to source line 8"]');
    // pre-existing contract: exactly ONE plugin cursor at the declaration
    // (no native restoration modeled when deferRestore is off)
    expect(host.cursors).toEqual([{ line: 7, ch: 0 }]);
  });
});

// keep imports referenced (context view + wiring used by host.start path)
void RDContextView;
void RuntimeWiring;
void ({} as WorkspaceLeaf);
