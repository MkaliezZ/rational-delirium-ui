/** v1.7.4-A Collaboration Surface tests — artifact loading, empty
 * states, detail rendering, browser navigation, read-only boundary,
 * no approval/apply path, no mutation, workspace preservation.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
import {
  CONTRIBUTIONS_DIR,
  ORGANIZATION_PROPOSALS_DIR,
  PROPOSALS_DIR,
  buildCollaborationModel,
  loadArtifactDetail,
  parseArtifact,
  type CollaborationArtifactSource,
  type DirReadResult,
} from "../src/collaboration/artifact-reader";
import {
  CollaborationBrowser,
  renderCollaboration,
  resolveDetail,
} from "../src/collaboration/collaboration-surface";

const proposalMd = (id: string, status = "pending") => `# Proposal

## Metadata

- proposal_id: ${id}
- author_agent: "FICT-AGENT-RESEARCHER-1 (host, researcher role)"
- created_at: "2026-09-20T08:15Z"
- target_object_id: "FICT-KO-20260919-0007"
- target_object_type: "HYPOTHESIS"

## Requested Change

Revise the hypothesis wording and add one relation.

## Evidence

- FICT-KO evidence object (fictional log)

## Reasoning

Narrow the claim to the observed scope.

## Expected Impact

Clearer lineage if applied by a Human.

## Status

${status}
`;

const contributionMd = (id: string) => `# Contribution Record

## Metadata

- contribution_id: ${id}
- author_agent: "FICT-AGENT-RESEARCHER-1 (host, researcher role)"
- created_at: "2026-09-20T08:20Z"
- related_proposal_id: "PROP-20260920-001"

## Contribution Summary

Researched the hypothesis scope and authored the proposal.

## Evidence Used

- FICT-KO evidence object

## Change Description

Proposed (not applied): wording revision plus one relation.

## Human Decision

none yet

## History

- 2026-09-20 — record created
`;

const orgPropMd = (id: string) => `# Organization Proposal

## Metadata

- organization_proposal_id: ${id}
- author_agent: "FICT-AGENT-ANALYST-1 (host, analyst role)"
- created_at: "2026-09-20T09:40Z"
- target_scope: "FICT-KO-A, FICT-KO-B"

## Observed Structure

Two objects with no declared relation between them.

## Proposed Organization Change

Add one declared relation, if the Human agrees.

## Evidence

- FICT-KO-A, FICT-KO-B (declared content)

## Reasoning

Connectivity may reduce fragmentation.

## Expected Impact

Easier navigation. No correctness claim.

## Human Decision

none yet

## History

- 2026-09-20 — proposal created
`;

function source(dirs: Record<string, readonly { name: string; text: string }[]>)
  : CollaborationArtifactSource {
  return {
    readDir: async (dir: string): Promise<DirReadResult> => {
      const files = dirs[dir];
      if (files === undefined) return { state: "missing" };
      return {
        state: "available",
        files: files.map((f) => ({ path: `${dir}/${f.name}`, text: f.text })),
      };
    },
  };
}

const fullSource = source({
  [PROPOSALS_DIR]: [
    { name: "prop-002.md", text: proposalMd("PROP-20260920-002", "approved") },
    { name: "prop-001.md", text: proposalMd("PROP-20260920-001") },
  ],
  [CONTRIBUTIONS_DIR]: [
    { name: "contrib-001.md", text: contributionMd("CONTRIB-20260920-001") },
  ],
  [ORGANIZATION_PROPOSALS_DIR]: [
    { name: "orgprop-001.md", text: orgPropMd("ORGPROP-20260920-001") },
  ],
});

describe("v1.7.4-A artifact loading", () => {
  it("loads all three kinds with parsed metadata and stable order", async () => {
    const model = await buildCollaborationModel(fullSource);
    expect(model.dirs).toEqual({
      proposal: "available", contribution: "available", "organization-proposal": "available",
    });
    expect(model.proposals.map((r) => r.id)).toEqual([
      "PROP-20260920-001", "PROP-20260920-002",
    ]); // stable id order regardless of file order
    expect(model.contributions).toHaveLength(1);
    expect(model.organizationProposals).toHaveLength(1);
    const p = model.proposals[0];
    expect(p.authorAgent).toContain("FICT-AGENT-RESEARCHER-1");
    expect(p.target).toBe("FICT-KO-20260919-0007");
    expect(p.status).toBe("pending");
    expect(p.summary).toContain("Revise the hypothesis");
    const c = model.contributions[0];
    expect(c.relatedProposalId).toBe("PROP-20260920-001");
    expect(c.humanDecision).toBe("none yet");
    const o = model.organizationProposals[0];
    expect(o.target).toContain("FICT-KO-A");
  });

  it("malformed artifacts are flagged and kept, never dropped", () => {
    const detail = parseArtifact("proposal", {
      path: ".proposals/broken.md",
      text: "# Proposal\n\n## Metadata\n\n- author_agent: \"x\"\n",
    });
    expect(detail.malformed).toBe(true);
    expect(detail.problems).toContain("no proposal_id declared");
    expect(detail.metadata.id).toBeNull(); // explicit not-declared
    const model = source({
      [PROPOSALS_DIR]: [{ name: "broken.md", text: "# Proposal\n\n## Metadata\n\n- author_agent: \"x\"\n" }],
    });
    return buildCollaborationModel(model).then((m) => {
      expect(m.proposals).toHaveLength(1);
      expect(m.proposals[0].malformed).toBe(true);
    });
  });

  it("missing directories produce honest empty states", async () => {
    const model = await buildCollaborationModel(source({}));
    expect(model.dirs.proposal).toBe("missing");
    const host = document.createElement("div");
    const browser = new CollaborationBrowser();
    await browser.refresh(source({}));
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const text = host.textContent ?? "";
    // FIX 1: per-kind empty states, none implying no knowledge or error
    expect(text).toContain("No contribution records found.");
    expect(text).toContain("No proposal records found.");
    expect(text).toContain("No organization proposal records found.");
    expect(text).not.toContain("no knowledge exists"); // forbidden implication
    expect((text.match(/No [a-z ]+ records found\./g) ?? []).length).toBe(3);
  });

  it("per-kind empty message matches its section (mixed availability)", async () => {
    const partial = source({
      [PROPOSALS_DIR]: [{ name: "prop-001.md", text: proposalMd("PROP-1") }],
    });
    const browser = new CollaborationBrowser();
    await browser.refresh(partial);
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const text = host.textContent ?? "";
    expect(text).not.toContain("No proposal records found."); // proposals exist
    expect(text).toContain("No contribution records found.");
    expect(text).toContain("No organization proposal records found.");
  });
});

describe("v1.7.4-A detail view and navigation", () => {
  it("detail resolves by exact path and renders sections", async () => {
    const detail = await loadArtifactDetail(fullSource, "proposal", `${PROPOSALS_DIR}/prop-001.md`);
    expect(detail).not.toBeNull();
    if (detail === null) return;
    expect(detail.sections["Reasoning"]).toContain("Narrow the claim");
    const host = document.createElement("div");
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    renderCollaboration(host, browser.getState(), detail, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const text = host.textContent ?? "";
    expect(text).toContain("Requested / Proposed Change");
    expect(text).toContain("Evidence");
    expect(text).toContain("Reasoning");
    expect(text).toContain("History (append-only)");
    expect(text).toContain("read-only inspection");
    expect(text).toContain("Approve/Reject record your decision on a pending proposal");
    expect(text).toContain("No apply or execute action exists in RD");
  });

  it("exact-path only: wrong path resolves to null", async () => {
    expect(await loadArtifactDetail(fullSource, "proposal", ".proposals/nope.md")).toBeNull();
  });

  it("browser state: select preserves kind/path identity; back → list", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    expect(browser.getState().selectedArtifact).toBeNull();
    browser.select("contribution", `${CONTRIBUTIONS_DIR}/contrib-001.md`);
    const sel = browser.getState().selectedArtifact;
    expect(sel).not.toBeNull();
    if (sel !== null) {
      expect(sel.kind).toBe("contribution");        // FIX 2: identity kept
      expect(sel.path).toBe(`${CONTRIBUTIONS_DIR}/contrib-001.md`);
    }
    browser.back();
    expect(browser.getState().selectedArtifact).toBeNull();
    // emissions are frozen
    const state = browser.getState();
    expect(() => {
      (state as { selectedArtifact: unknown }).selectedArtifact = { kind: "proposal", path: "x" };
    }).toThrow();
  });

  it("detail resolution uses explicit identity, not type guessing", async () => {
    // Same FILENAME in two artifact directories: resolution must
    // follow the selection's declared kind, not a trial order.
    const ambiguous = source({
      [PROPOSALS_DIR]: [
        { name: "same.md", text: proposalMd("PROP-SAME") },
      ],
      [ORGANIZATION_PROPOSALS_DIR]: [
        { name: "same.md", text: orgPropMd("ORGPROP-SAME") },
      ],
    });
    const browser = new CollaborationBrowser();
    await browser.refresh(ambiguous);
    browser.select("organization-proposal", `${ORGANIZATION_PROPOSALS_DIR}/same.md`);
    const detail = await resolveDetail(ambiguous, browser.getState());
    expect(detail).not.toBeNull();
    if (detail !== null) {
      expect(detail.kind).toBe("organization-proposal");
      expect(detail.metadata.id).toBe("ORGPROP-SAME");
    }
    browser.select("proposal", `${PROPOSALS_DIR}/same.md`);
    const detail2 = await resolveDetail(ambiguous, browser.getState());
    if (detail2 !== null) {
      expect(detail2.kind).toBe("proposal");
      expect(detail2.metadata.id).toBe("PROP-SAME");
    }
  });
});

describe("v1.7.4-A read-only boundary", () => {
  it("source port and browser expose no write/approve/apply surface", async () => {
    const port = fullSource as unknown as Record<string, unknown>;
    expect(Object.keys(port)).toEqual(["readDir"]);
    const proto = Object.getPrototypeOf(new CollaborationBrowser());
    const methods = Object.getOwnPropertyNames(proto)
      .filter((m) => m !== "constructor" && m !== "update"); // TS-private emitter
    expect(methods.sort()).toEqual(["back", "dispose", "getState", "refresh", "select", "subscribe"]);
    for (const banned of ["approve", "reject", "apply", "write", "modify", "delete", "promote"]) {
      expect(methods.join(" ").toLowerCase()).not.toContain(banned);
    }
  });

  it("rendered DOM contains no approve/apply/chat/ranking controls", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    // Every button in list mode is an artifact row; no standalone
    // action controls exist. (Artifact-DECLARED status text like
    // "status: approved (descriptive)" is row content, not a control.)
    const buttons = [...host.querySelectorAll("button")];
    expect(buttons.length).toBe(4); // 2 proposals + 1 contribution + 1 orgprop
    for (const b of buttons) {
      expect(b.classList.contains("rdcol-row")).toBe(true);
      expect(b.getAttribute("aria-label")).toMatch(/^inspect /);
    }
    const controls = buttons.filter((b) => !b.classList.contains("rdcol-row"));
    expect(controls).toEqual([]);
    for (const banned of [/^approve$/i, /^reject$/i, /^apply$/i, /^accept$/i, /chat/i, /ask ai/i]) {
      expect(buttons.some((b) => banned.test((b.textContent ?? "").trim()))).toBe(false);
    }
  });

  it("collaboration reading cannot mutate artifacts or knowledge models", async () => {
    const model = await buildCollaborationModel(fullSource);
    expect(() => {
      (model.proposals as unknown as { push(x: unknown): void }).push(null as never);
    }).toThrow();
    expect(() => {
      (model.proposals[0] as unknown as { status: string | null }).status = "applied";
    }).toThrow();
    expect(model.proposals[0].status).toBe("pending");
  });

  it("workspace preserved: registry six views, investigation path intact", async () => {
    const mod = await import("../src/architecture/rd-view-setup");
    const registry = mod.buildRDViewRegistry();
    expect(registry.registrations_().map((r) => r.commandId)).toEqual([
      "open-rd-context", "open-rd-investigation", "open-rd-loop-workspace",
      "open-rd-graph-intelligence", "open-rd-knowledge-panel", "open-rd-workspace",
    ]);
    const src = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    for (const banned of ["vault.modify", "vault.create", "vault.delete", "setInterval", "setTimeout"]) {
      expect(src).not.toContain(banned);
    }
  });
});

describe("v1.7.4-B usability polish", () => {
  it("introduction appears with the three boundary principles and no AI wording", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const intro = host.querySelector(".rdcol-intro");
    expect(intro).not.toBeNull();
    const text = (intro as HTMLElement).textContent ?? "";
    expect(text).toContain("contributions and proposals created by external agents");
    expect(text).toContain("describe proposed work");
    expect(text).toContain("proposal ≠ approval");
    expect(text).toContain("contribution ≠ truth");
    expect(text).toContain("visibility ≠ validation");
    expect(text).toContain("record human actions");
    expect(text).toContain("not system truth states");
    expect(text).toContain("approved does not mean correct");
    expect(text).toContain("applied does not mean verified");
    for (const banned of ["intelligence", "confidence", "ranking", "recommend"]) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });

  it("status wording marks recorded human action in rows and detail", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    expect(host.textContent).toContain("status: approved (recorded human action)");
    const detail = await loadArtifactDetail(fullSource, "proposal", `${PROPOSALS_DIR}/prop-002.md`);
    if (detail === null) throw new Error("detail must load");
    const host2 = document.createElement("div");
    browser.select("proposal", `${PROPOSALS_DIR}/prop-002.md`);
    renderCollaboration(host2, browser.getState(), detail, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    expect(host2.textContent).toContain("approved (recorded human action; not a truth state)");
  });

  it("empty states explain where records come from, without failure wording", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(source({}));
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const text = host.textContent ?? "";
    expect((text.match(/Artifact records appear here when agents create contribution or proposal records\./g) ?? []).length).toBe(3);
    for (const banned of ["vault is empty", "knowledge is missing", "failed", "error"]) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });

  it("detail sections follow the per-kind reading order", async () => {
    const orderOf = (host: HTMLElement): string[] =>
      [...host.querySelectorAll(".rdcol-detail-section > summary")].map((s) => s.textContent ?? "");
    const browser = new CollaborationBrowser();

    const prop = await loadArtifactDetail(fullSource, "proposal", `${PROPOSALS_DIR}/prop-001.md`);
    if (prop === null) throw new Error();
    let host = document.createElement("div");
    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    renderCollaboration(host, browser.getState(), prop, { onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined });
    expect(orderOf(host)).toEqual([
      "Requested / Proposed Change", "Evidence", "Reasoning",
      "Expected Impact", "Status (recorded human action)", "History (append-only)",
    ]);

    const contrib = await loadArtifactDetail(fullSource, "contribution", `${CONTRIBUTIONS_DIR}/contrib-001.md`);
    if (contrib === null) throw new Error();
    host = document.createElement("div");
    browser.select("contribution", `${CONTRIBUTIONS_DIR}/contrib-001.md`);
    renderCollaboration(host, browser.getState(), contrib, { onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined });
    expect(orderOf(host)).toEqual([
      "Contribution Summary", "Change Description", "Evidence Used",
      "Human Decision (recorded human action)", "History (append-only)",
    ]);

    const org = await loadArtifactDetail(fullSource, "organization-proposal", `${ORGANIZATION_PROPOSALS_DIR}/orgprop-001.md`);
    if (org === null) throw new Error();
    host = document.createElement("div");
    browser.select("organization-proposal", `${ORGANIZATION_PROPOSALS_DIR}/orgprop-001.md`);
    renderCollaboration(host, browser.getState(), org, { onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined });
    expect(orderOf(host)).toEqual([
      "Observed Structure", "Proposed Organization Change", "Evidence",
      "Reasoning", "Expected Impact", "Human Decision (recorded human action)",
      "History (append-only)",
    ]);
  });

  it("polish adds no action controls: intro and status notes are text only", async () => {
    const browser = new CollaborationBrowser();
    await browser.refresh(fullSource);
    const host = document.createElement("div");
    renderCollaboration(host, browser.getState(), null, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    const buttons = [...host.querySelectorAll("button")];
    for (const b of buttons) {
      expect(b.classList.contains("rdcol-row")).toBe(true); // rows only
    }
  });
});
