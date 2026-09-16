import { describe, expect, it } from "vitest";
import { RuntimeWiring } from "../src/runtime/runtime-wiring";
import { FakeNavigator } from "../src/platform/navigation-core";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";
import { FakeWorkspace, FakeVault } from "./support/fake-obsidian-host";
import { extractBodyRelations } from "../src/parsers/body-relations";

function setupWiring(adapter: FakeAdapter) {
  const workspace = new FakeWorkspace();
  const vault = new FakeVault();
  const navigator = new FakeNavigator();
  const wiring = new RuntimeWiring(adapter, workspace, vault, navigator);
  return { wiring, workspace, vault, navigator, adapter };
}

async function startedWiring() {
  const adapter = new FakeAdapter();
  adapter.set("CASES/A.md", fixtureNote({
    path: "CASES/A.md", type: "case", id: "A",
    frontmatterExtra: ['supports: "[[E]]"'],
  }));
  adapter.set("EVIDENCE/E.md", fixtureNote({ path: "EVIDENCE/E.md", type: "evidence", id: "E" }));
  const ctx = setupWiring(adapter);
  await ctx.wiring.start();
  return ctx;
}

describe("production integration: context lifecycle", () => {
  it("layout ready with A active → Context shows A", async () => {
    const ctx = await startedWiring();
    ctx.workspace.activeFile = { path: "CASES/A.md" };
    await ctx.workspace.fireLayoutReady();
    expect(ctx.wiring.controller.phase).toBe("READY");
    expect(ctx.wiring.controller.projection?.object?.id).toBe("A");
  });

  it("same-leaf A→B → Context updates to B", async () => {
    const ctx = await startedWiring();
    ctx.workspace.activeFile = { path: "CASES/A.md" };
    await ctx.workspace.fireLayoutReady();
    ctx.adapter.set("CASES/B.md", fixtureNote({ path: "CASES/B.md", type: "case", id: "B" }));
    await ctx.wiring.index.applyChange("CASES/B.md", "create");
    await ctx.workspace.fireFileOpen("CASES/B.md");
    await new Promise((r) => setTimeout(r, 10));
    expect(ctx.wiring.controller.projection?.object?.id).toBe("B");
  });

  it("A becomes non-RD → old projection cleared (FR-01)", async () => {
    const ctx = await startedWiring();
    ctx.workspace.activeFile = { path: "CASES/A.md" };
    await ctx.workspace.fireLayoutReady();
    expect(ctx.wiring.controller.phase).toBe("READY");
    // A becomes non-RD
    ctx.adapter.set("CASES/A.md", "---\nno type here\n---\nplain markdown");
    await ctx.wiring.index.applyChange("CASES/A.md", "modify");
    await ctx.wiring.controller.onIndexRefreshed("CASES/A.md");
    expect(ctx.wiring.controller.phase).toBe("NO_ACTIVE_OBJECT");
    expect(ctx.wiring.controller.projection?.object).toBeNull();
  });

  it("no active file; background create B → Context stays empty (FR-02)", async () => {
    const ctx = await startedWiring();
    await ctx.workspace.fireLayoutReady();
    expect(ctx.wiring.controller.phase).toBe("NO_ACTIVE_OBJECT");
    // Background create
    ctx.adapter.set("CASES/B.md", fixtureNote({ path: "CASES/B.md", type: "case", id: "B" }));
    ctx.vault.fireCreate("CASES/B.md");
    await new Promise((r) => setTimeout(r, 20));
    // FR-02: Context must NOT show B
    expect(ctx.wiring.controller.session.lastMarkdownAnchor).toBeNull();
    expect(ctx.wiring.controller.phase).toBe("NO_ACTIVE_OBJECT");
    // file-open(B) makes it active
    ctx.workspace.fireFileOpen("CASES/B.md");
    await new Promise((r) => setTimeout(r, 20));
    expect(ctx.wiring.controller.phase).toBe("READY");
    expect(ctx.wiring.controller.projection?.object?.id).toBe("B");
  });
});

describe("production integration: dependency refresh (RD-01)", () => {
  it("E rename → A projection updates (BROKEN for stale link)", async () => {
    const ctx = await startedWiring();
    ctx.workspace.activeFile = { path: "CASES/A.md" };
    await ctx.workspace.fireLayoutReady();
    expect(ctx.wiring.controller.phase).toBe("READY");
    // Rename E → F
    ctx.adapter.moveFile("EVIDENCE/E.md", "EVIDENCE/F.md");
    ctx.vault.fireRename("EVIDENCE/E.md", "EVIDENCE/F.md");
    await new Promise((r) => setTimeout(r, 50));
    // A projection should refresh; the relation to E should now be BROKEN
    const rels = ctx.wiring.index.relations;
    expect(rels.every((r) => r.targetId !== "E" || r.targetResolution === "BROKEN")).toBe(true);
    expect(ctx.wiring.controller.phase).toBe("READY");
  });

  it("E modify → A projection refreshes with new title", async () => {
    const ctx = await startedWiring();
    ctx.workspace.activeFile = { path: "CASES/A.md" };
    await ctx.workspace.fireLayoutReady();
    // Modify E
    const oldContent = ctx.adapter.readSync("EVIDENCE/E.md");
    ctx.adapter.set("EVIDENCE/E.md", oldContent.replace("# E", "# E Renamed"), 2000);
    ctx.vault.fireModify("EVIDENCE/E.md");
    await new Promise((r) => setTimeout(r, 100));
    ctx.wiring.scheduler?.flush();
    await new Promise((r) => setTimeout(r, 10));
    // Flush scheduler
    // (the scheduler has a debounce; index should have the new title)
    const obj = ctx.wiring.index.objectAt("EVIDENCE/E.md");
    expect(obj?.title).toContain("Renamed");
  });
});

describe("production integration: lifecycle (RD-02)", () => {
  it("DISPOSED is terminal after start completes", async () => {
    const ctx = await startedWiring();
    expect(ctx.wiring.buildPhase).toBe("LIVE");
    ctx.wiring.dispose();
    expect(ctx.wiring.buildPhase).toBe("DISPOSED");
    expect(ctx.wiring.scheduler).toBeNull();
    expect(ctx.wiring.controller.projection).toBeNull();
    expect(ctx.wiring.index.state).toBe("ERROR");
  });
});

describe("production integration: relations (RD-05)", () => {
  it("supported_by missing target → BROKEN resolution", async () => {
    const adapter = new FakeAdapter();
    adapter.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      frontmatterExtra: ['supported_by: "[[GHOST]]"'],
    }));
    const ctx = setupWiring(adapter);
    await ctx.wiring.start();
    const rels = ctx.wiring.index.relations;
    expect(rels.length).toBe(1);
    expect(rels[0].targetResolution).toBe("BROKEN");
  });

  it("supported_by ambiguous target → AMBIGUOUS resolution", async () => {
    const adapter = new FakeAdapter();
    adapter.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      frontmatterExtra: ['supported_by: "[[DUP]]"'],
    }));
    adapter.set("EVIDENCE/DUP.md", fixtureNote({ path: "EVIDENCE/DUP.md", type: "evidence", id: "DUP1" }));
    adapter.set("ARCHIVE/DUP.md", fixtureNote({ path: "ARCHIVE/DUP.md", type: "evidence", id: "DUP2" }));
    const ctx = setupWiring(adapter);
    await ctx.wiring.start();
    const rels = ctx.wiring.index.relations;
    expect(rels[0].targetResolution).toBe("AMBIGUOUS");
  });
});

describe("production integration: ordinary links (RD-11)", () => {
  it("[[B|Alias]] and [[C#Heading]] resolve correctly through index", async () => {
    const adapter = new FakeAdapter();
    adapter.set("CASES/A.md", fixtureNote({
      path: "CASES/A.md", type: "case", id: "A",
      body: "see [[B|MyAlias]] and [[C#Chapter One]]",
    }));
    adapter.set("EVIDENCE/B.md", fixtureNote({ path: "EVIDENCE/B.md", type: "evidence", id: "B" }));
    adapter.set("HYPOTHESES/C.md", fixtureNote({ path: "HYPOTHESES/C.md", type: "hypothesis", id: "C" }));
    const ctx = setupWiring(adapter);
    await ctx.wiring.start();
    // B should have a backlink from A
    expect(ctx.wiring.index.ordinaryBacklinksOf("EVIDENCE/B.md")).toContain("CASES/A.md");
    // C should have a backlink from A
    expect(ctx.wiring.index.ordinaryBacklinksOf("HYPOTHESES/C.md")).toContain("CASES/A.md");
    // Resolution states
    const bRes = ctx.wiring.index.ordinaryLinkResolution("CASES/A.md", "B|MyAlias");
    expect(bRes.state).toBe("RESOLVED");
    expect(bRes.paths).toEqual(["EVIDENCE/B.md"]);
    const cRes = ctx.wiring.index.ordinaryLinkResolution("CASES/A.md", "C#Chapter One");
    expect(cRes.state).toBe("RESOLVED");
  });
});

describe("production integration: HTML exclusion (RD-07)", () => {
  it("cross-paragraph HTML blocks relation", () => {
    // Direct parser test through the production code path
    
    const NL = String.fromCharCode(10);
    const content = "example <span>" + NL + NL + "derived_from: [[X]]" + NL + NL + "</span>" + NL;
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    expect(r.assertions.length).toBe(0);
  });

  it("closed HTML then independent relation is legal", () => {
    
    const NL = String.fromCharCode(10);
    const content = "<span>text</span>" + NL + NL + "derived_from: [[X]]" + NL;
    const r = extractBodyRelations(content, "CASES/C.md", 1);
    expect(r.assertions.length).toBe(1);
  });
});
