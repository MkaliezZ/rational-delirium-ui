import { describe, expect, it } from "vitest";
import { FakeNavigator, planOpen } from "../src/platform/navigation-core";

describe("native navigation planning", () => {
  it("normal open plans an editor open", () => {
    const nav = new FakeNavigator();
    const rec = planOpen(nav, { path: "CASES/CASE-0001.md" }, "normal");
    expect(rec).not.toBeNull();
    expect(nav.calls.length).toBe(1);
    expect(nav.calls[0].mode).toBe("normal");
  });

  it("new tab and split modes pass through", () => {
    const nav = new FakeNavigator();
    planOpen(nav, { path: "a.md" }, "tab");
    planOpen(nav, { path: "a.md" }, "split");
    expect(nav.calls.map((c) => c.mode)).toEqual(["tab", "split"]);
  });

  it("source location keeps line and stays an editor open", () => {
    const nav = new FakeNavigator();
    const rec = planOpen(nav, { path: "a.md", line: 12 }, "source");
    expect(rec?.target.line).toBe(12);
  });

  it("context-focused navigation still routes to an editor leaf", () => {
    const nav = new FakeNavigator();
    nav.setSurface("rd-context");
    const rec = planOpen(nav, { path: "a.md" }, "normal");
    expect(rec?.chosenLeaf).toBe("editor");
  });

  it("broken/null targets never open or create anything", () => {
    const nav = new FakeNavigator();
    expect(planOpen(nav, null, "normal")).toBeNull();
    expect(planOpen(nav, { path: "" }, "normal")).toBeNull();
    expect(nav.calls.length).toBe(0);
  });
});
