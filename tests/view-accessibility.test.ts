import { describe, expect, it } from "vitest";
import { renderObjectSummary } from "../src/views/object-summary";
import { renderRelationList } from "../src/views/relation-list";
import type { ContextProjectionData } from "../src/model";

const READY_DATA: ContextProjectionData = {
  phase: "READY",
  indexState: "READY",
  mode: "FOLLOW",
  object: {
    id: "CASE-0001",
    type: "case",
    title: "The Whispering Room",
    status: "active",
    lastVerified: "2026-09-15",
    demo: false,
    proof: false,
  },
  sections: [
    {
      key: "evidence",
      title: "Related Evidence",
      rows: [
        {
          predicate: "supports",
          direction: "outgoing",
          targetId: "EVIDENCE-021",
          targetTitle: "A voice, but not mine",
          resolution: "RESOLVED",
          sourcePath: "CASES/CASE-0001.md",
          sourceLine: 3,
          ordinary: false,
          targetPath: "EVIDENCE/EVIDENCE-021.md",
          sourceRevision: 1,
          alias: null,
          subpath: null,
        },
      ],
    },
    {
      key: "other",
      title: "Other Links",
      rows: [
        {
          predicate: "related",
          direction: "incoming",
          targetId: "LOOP-031",
          targetTitle: "Same corridor",
          resolution: "RESOLVED",
          sourcePath: null,
          sourceLine: null,
          ordinary: true,
          targetPath: "LOOPS/LOOP-031.md",
          sourceRevision: null,
          alias: null,
          subpath: null,
        },
      ],
    },
  ],
};

function mount(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("view accessibility", () => {
  it("pin control is a focusable button with aria-pressed", () => {
    const el = mount();
    renderObjectSummary(el, READY_DATA, false, { onPinToggle: () => {} });
    const pin = el.querySelector<HTMLButtonElement>(".rdc-pin");
    expect(pin).not.toBeNull();
    expect(pin!.getAttribute("aria-pressed")).toBe("false");
    pin!.focus();
    expect(document.activeElement).toBe(pin);
    pin!.click(); // keyboard activation via Enter/Space is native
    renderObjectSummary(el, READY_DATA, true, { onPinToggle: () => {} });
    expect(el.querySelector(".rdc-pin")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("relation rows are focusable and keyboard activatable", () => {
    const el = mount();
    let clicked = 0;
    renderRelationList(el, READY_DATA, new Set(["evidence"]), {
      onToggleSection: () => {},
      onSelectRelation: () => {
        clicked += 1;
      },
      onSelectRelationTab: () => {},
      onSelectRelationSplit: () => {},
    });
    const row = el.querySelector<HTMLButtonElement>(".rdc-rel");
    expect(row).not.toBeNull();
    row!.focus();
    expect(document.activeElement).toBe(row);
    row!.click();
    expect(clicked).toBe(1);
  });

  it("disclosure buttons carry aria-expanded and toggle", () => {
    const el = mount();
    renderRelationList(el, READY_DATA, new Set(["evidence"]), {
      onToggleSection: () => {},
      onSelectRelation: () => {},
      onSelectRelationTab: () => {},
      onSelectRelationSplit: () => {},
    });
    const titles = [...el.querySelectorAll<HTMLButtonElement>(".rdc-section-title")];
    expect(titles.length).toBe(2);
    expect(titles[0].getAttribute("aria-expanded")).toBe("true");
    expect(titles[1].getAttribute("aria-expanded")).toBe("false");
    titles[1].click();
    expect(titles[1].getAttribute("aria-expanded")).toBe("true");
  });

  it("INDEXING state sets aria-busy and never claims 'no relations'", () => {
    const el = mount();
    const data: ContextProjectionData = {
      ...READY_DATA,
      phase: "LOADING",
      indexState: "INDEXING",
      sections: [],
      object: null,
    };
    renderObjectSummary(el, data, false, { onPinToggle: () => {} });
    expect(el.textContent).toContain("INDEXING");
    const rel = mount();
    renderRelationList(rel, data, new Set(), { onToggleSection: () => {},
      onSelectRelation: () => {},
      onSelectRelationTab: () => {},
      onSelectRelationSplit: () => {} });
    expect(rel.getAttribute("aria-busy")).toBe("true");
    expect(rel.textContent).toContain("INDEXING");
    expect(rel.textContent).not.toContain("no relations");
  });

  it("updates never steal focus", () => {
    const el = mount();
    renderObjectSummary(el, READY_DATA, false, { onPinToggle: () => {} });
    const pin = el.querySelector<HTMLButtonElement>(".rdc-pin")!;
    pin.focus();
    expect(document.activeElement).toBe(pin);
    renderObjectSummary(el, READY_DATA, false, { onPinToggle: () => {} });
    const pin2 = el.querySelector<HTMLButtonElement>(".rdc-pin")!;
    expect(document.activeElement).toBe(pin2); // re-render restored focus, no theft
  });

  it("pinned-deleted error state is textual, not color-only", () => {
    const el = mount();
    renderObjectSummary(
      el,
      {
        ...READY_DATA,
        phase: "ERROR",
        mode: "PINNED",
        pinnedDeleted: true,
        object: null,
        sections: [],
      },
      true,
      { onPinToggle: () => {} },
    );
    expect(el.textContent).toContain("Pinned target deleted");
  });

  it("note content renders via textContent only (no innerHTML)", () => {
    const el = mount();
    const evil: ContextProjectionData = {
      ...READY_DATA,
      object: {
        ...READY_DATA.object!,
        title: '<img src=x onerror="window.__pwned=1">CASE',
      },
    };
    renderObjectSummary(el, evil, false, { onPinToggle: () => {} });
    expect(el.querySelector("img")).toBeNull();
    expect((window as unknown as Record<string, unknown>).__pwned).toBeUndefined();
  });
});
