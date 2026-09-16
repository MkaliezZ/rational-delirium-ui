import { beforeEach, describe, expect, it } from "vitest";
import { ContextController } from "../src/context/context-controller";
import { RDIndex } from "../src/index/rd-index";
import { freshSessionState, resetSession } from "../src/context/session-state";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";

function makeIndex(): { index: RDIndex; adapter: FakeAdapter } {
  const a = new FakeAdapter();
  a.set(
    "CASES/CASE-A.md",
    fixtureNote({ path: "CASES/CASE-A.md", type: "case", id: "CASE-A" }),
  );
  a.set(
    "CASES/CASE-B.md",
    fixtureNote({ path: "CASES/CASE-B.md", type: "case", id: "CASE-B" }),
  );
  a.set(
    "00_HOME/note.md",
    "---\nno type here\n---\nplain markdown",
  );
  return { index: new RDIndex(a), adapter: a };
}

async function built(): Promise<{ index: RDIndex; controller: ContextController; adapter: FakeAdapter }> {
  const { index, adapter } = makeIndex();
  await index.build();
  return { index, controller: new ContextController(index), adapter };
}

describe("context state", () => {
  let index: RDIndex;
  let controller: ContextController;
  let adapter: FakeAdapter;

  beforeEach(async () => {
    ({ index, controller, adapter } = await built());
  });

  it("FOLLOW tracks the active RD note", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    expect(controller.phase).toBe("READY");
    expect(controller.projection?.object?.id).toBe("CASE-A");
    expect(controller.session.mode).toBe("FOLLOW");
  });

  it("non-RD markdown gives NO_ACTIVE_OBJECT", async () => {
    await controller.onActiveMarkdown("00_HOME/note.md");
    expect(controller.phase).toBe("NO_ACTIVE_OBJECT");
  });

  it("context focus does not lose the last markdown anchor", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.onContextFocus();
    expect(controller.session.lastMarkdownAnchor).toBe("CASES/CASE-A.md");
    expect(controller.phase).toBe("READY");
  });

  it("PINNED stays pinned across markdown switches but anchor updates", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.pin();
    expect(controller.session.mode).toBe("PINNED");
    await controller.onActiveMarkdown("CASES/CASE-B.md");
    expect(controller.projection?.object?.id).toBe("CASE-A");
    expect(controller.session.lastMarkdownAnchor).toBe("CASES/CASE-B.md");
  });

  it("unpin re-resolves the last real markdown note", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.pin();
    await controller.onActiveMarkdown("CASES/CASE-B.md");
    await controller.unpin();
    expect(controller.session.mode).toBe("FOLLOW");
    expect(controller.projection?.object?.id).toBe("CASE-B");
  });

  it("renamed pinned target follows file identity", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.pin();
    adapter.moveFile("CASES/CASE-A.md", "ARCHIVE/CASE-A.md");
    await index.applyRename("CASES/CASE-A.md", "ARCHIVE/CASE-A.md");
    await controller.onFileRenamed("CASES/CASE-A.md", "ARCHIVE/CASE-A.md");
    expect(controller.session.pinnedPath).toBe("ARCHIVE/CASE-A.md");
    expect(controller.projection?.object?.id).toBe("CASE-A");
  });

  it("deleted pinned target goes PINNED + ERROR and never auto-repins on path reuse", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.pin();
    await controller.onFileDeleted("CASES/CASE-A.md");
    expect(controller.session.mode).toBe("PINNED");
    expect(controller.phase).toBe("ERROR");
    expect(controller.projection?.pinnedDeleted).toBe(true);
    await controller.onFileCreated("CASES/CASE-A.md");
    expect(controller.phase).toBe("ERROR");
  });

  it("close/reopen within a session keeps state; plugin reload resets", async () => {
    await controller.onActiveMarkdown("CASES/CASE-A.md");
    await controller.pin();
    await controller.reattach(); // view closed & reopened
    expect(controller.session.mode).toBe("PINNED");
    expect(controller.projection?.object?.id).toBe("CASE-A");
    await controller.unload(); // plugin reload
    expect(controller.session.mode).toBe("FOLLOW");
    expect(controller.session.pinnedPath).toBeNull();
    expect(controller.projection).toBeNull();
  });

  it("session state helpers are memory-only structures", () => {
    const s = freshSessionState();
    expect(s.mode).toBe("FOLLOW");
    s.filter = "teal";
    resetSession(s);
    expect(s.filter).toBeNull();
  });
});
