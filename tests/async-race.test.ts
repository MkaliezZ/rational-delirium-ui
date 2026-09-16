import { beforeEach, describe, expect, it } from "vitest";
import { ContextController } from "../src/context/context-controller";
import { RDIndex } from "../src/index/rd-index";
import { FakeAdapter, fixtureNote } from "./support/fake-adapter";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function makeBuilt(): Promise<{ index: RDIndex }> {
  const a = new FakeAdapter();
  a.set("CASES/CASE-A.md", fixtureNote({ path: "CASES/CASE-A.md", type: "case", id: "CASE-A" }));
  a.set("CASES/CASE-B.md", fixtureNote({ path: "CASES/CASE-B.md", type: "case", id: "CASE-B" }));
  const index = new RDIndex(a);
  return index.build().then(() => ({ index }));
}

describe("context async race protection", () => {
  let index: RDIndex;
  const gates = new Map<string, { resolve: () => void }>();

  beforeEach(async () => {
    ({ index } = await makeBuilt());
  });

  let seq = 0;
  function controllerWithGates(): ContextController {
    return new ContextController(index, (path: string) => {
      seq += 1;
      const d = deferred();
      gates.set(path + "#" + seq, d);
      return d.promise;
    });
  }
  function resolveAll(path: string): void {
    for (const [key, gate] of gates) {
      if (key.startsWith(path + "#")) gate.resolve();
    }
  }

  it("A then B: late A result is discarded, final context = B", async () => {
    const c = controllerWithGates();
    const p1 = c.onActiveMarkdown("CASES/CASE-A.md");
    const p2 = c.onActiveMarkdown("CASES/CASE-B.md");
    resolveAll("CASES/CASE-B.md");
    await p2;
    resolveAll("CASES/CASE-A.md");
    await p1;
    expect(c.projection?.object?.id).toBe("CASE-B");
    expect(c.generation).toBeGreaterThanOrEqual(2);
  });

  it("old same-file read returning after a newer read is discarded", async () => {
    const c = controllerWithGates();
    const p1 = c.onActiveMarkdown("CASES/CASE-A.md");
    const p2 = c.onActiveMarkdown("CASES/CASE-A.md");
    resolveAll("CASES/CASE-A.md"); // newer gen resolves
    await p2;
    await p1;
    expect(c.phase).toBe("READY");
    expect(c.projection?.object?.id).toBe("CASE-A");
  });

  it("pin during pending read wins over the stale result", async () => {
    const c = controllerWithGates();
    const pFollow = c.onActiveMarkdown("CASES/CASE-A.md");
    const pPin = c.pin(); // bumps generation beyond the pending follow
    resolveAll("CASES/CASE-A.md");
    await Promise.all([pFollow, pPin]);
    expect(c.session.mode).toBe("PINNED");
    expect(c.projection?.object?.id).toBe("CASE-A");
  });

  it("unpin during pending read discards the pinned read", async () => {
    const c = controllerWithGates();
    const pFollow = c.onActiveMarkdown("CASES/CASE-B.md");
    resolveAll("CASES/CASE-B.md");
    await pFollow;
    const pPin = c.pin();
    resolveAll("CASES/CASE-B.md");
    await pPin;
    expect(c.session.mode).toBe("PINNED");
    // unpin while a fresh read is pending: old pinned projection must
    // not masquerade as the resolved FOLLOW target
    const pUnpin = c.unpin();
    resolveAll("CASES/CASE-B.md");
    await pUnpin;
    expect(c.session.mode).toBe("FOLLOW");
    expect(c.projection?.object?.id).toBe("CASE-B");
  });

  it("unload during pending read discards everything", async () => {
    const c = controllerWithGates();
    const p = c.onActiveMarkdown("CASES/CASE-A.md");
    await c.unload();
    resolveAll("CASES/CASE-A.md");
    await p;
    expect(c.projection).toBeNull();
    expect(c.session.mode).toBe("FOLLOW");
  });
});
