/** v1.8 Human Approved Agent Workflow tests — decision transform,
 * approve/reject actions, wording boundaries, contribution linking,
 * no automatic execution, no mutation path beyond the decision port.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyDecisionToProposalText,
  isDecidableProposalText,
  isProposalArtifactPath,
} from "../src/collaboration/proposal-decision";
import {
  PROPOSALS_DIR,
  parseArtifact,
} from "../src/collaboration/artifact-reader";
import {
  CollaborationBrowser,
  renderCollaboration,
} from "../src/collaboration/collaboration-surface";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const pendingProposal = [
  "# Proposal", "", "## Metadata", "",
  "- proposal_id: PROP-20260920-001",
  '- author_agent: "FICT-AGENT-RESEARCHER-1"',
  '- created_at: "2026-09-20T08:15Z"',
  '- target_object_id: "FICT-KO-0007"',
  '- target_object_type: "HYPOTHESIS"',
  "", "## Requested Change", "",
  "Create relation: EVIDENCE-001 supports HYPOTHESIS-001.",
  "", "## Evidence", "", "- fictional evidence", "",
  "## Reasoning", "", "connectivity", "",
  "## Expected Impact", "", "easier navigation", "",
  "## Status", "", "pending", "",
  "## History", "",
  "- 2026-09-20 — proposal created", "",
].join("\n");

describe("v1.8 decision transform (pure)", () => {
  it("approve: status becomes approved with boundary wording; history appended; rest byte-preserved", () => {
    expect(isDecidableProposalText(pendingProposal)).toBe(true);
    const r = applyDecisionToProposalText(pendingProposal, "approved", "2026-09-20T10:00Z");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const after = parseArtifact("proposal", { path: `${PROPOSALS_DIR}/p.md`, text: r.text });
    expect(after.metadata.status).toBe("approved");
    // wording boundaries present in the written text
    expect(r.text).toContain("recorded human action");
    expect(r.text).toContain("Approval is not truth validation and not agent trust");
    expect(r.text).toContain("happens outside RD, limited to the approved scope");
    // history append-only: original line kept, decision line added
    expect(r.text).toContain("- 2026-09-20 — proposal created");
    expect(r.text).toContain("- 2026-09-20T10:00Z — Human decision: approved");
    // untouched regions byte-preserved
    expect(r.text).toContain("Create relation: EVIDENCE-001 supports HYPOTHESIS-001.");
    expect(r.text).toContain('- target_object_id: "FICT-KO-0007"');
    expect(r.text.startsWith("# Proposal\n\n## Metadata")).toBe(true);
  });

  it("reject works symmetrically; decisions are recorded once", () => {
    const r = applyDecisionToProposalText(pendingProposal, "rejected", "2026-09-20T10:01Z");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain("\nrejected\n");
    const second = applyDecisionToProposalText(r.text, "approved", "2026-09-20T10:02Z");
    expect(second).toEqual({ ok: false, reason: "proposal is not pending (decisions are recorded once)" });
  });

  it("refuses proposals without a pending status section", () => {
    expect(applyDecisionToProposalText("# no sections", "approved", "t"))
      .toEqual({ ok: false, reason: "no Status section" });
    expect(isDecidableProposalText("## Status\n\napproved")).toBe(false);
  });

  it("path guard: only .proposals/*.md", () => {
    expect(isProposalArtifactPath(".proposals/PROP-1.md")).toBe(true);
    expect(isProposalArtifactPath(".contributions/C-1.md")).toBe(false);
    expect(isProposalArtifactPath("CASES/A.md")).toBe(false);
    expect(isProposalArtifactPath(".proposals/../../secret.md")).toBe(false);
  });
});

describe("v1.8 collaboration UI decision interaction", () => {
  it("pending proposal detail shows Approve/Reject; decided proposal does not", async () => {
    const browser = new CollaborationBrowser();
    const detail = parseArtifact("proposal", {
      path: `${PROPOSALS_DIR}/prop-001.md`, text: pendingProposal,
    });
    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    let host = document.createElement("div");
    const decisions: [string, string][] = [];
    renderCollaboration(host, browser.getState(), detail, {
      onSelect: () => undefined, onBack: () => undefined,
      onDecide: (d, p) => { decisions.push([d, p]); },
    });
    const buttons = [...host.querySelectorAll("button.rdcol-decide-button")];
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Approve (record decision)", "Reject (record decision)",
    ]);
    (buttons[0] as HTMLElement).click();
    expect(decisions).toEqual([["approved", `${PROPOSALS_DIR}/prop-001.md`]]);
    // wording boundaries in the decide note
    expect(host.textContent).toContain("does not mean correct");
    expect(host.textContent).toContain("does not trust the agent");

    // decided proposal: no decision buttons
    const decided = applyDecisionToProposalText(pendingProposal, "approved", "2026-09-20T10:00Z");
    if (!decided.ok) throw new Error();
    const detail2 = parseArtifact("proposal", {
      path: `${PROPOSALS_DIR}/prop-001.md`, text: decided.text,
    });
    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    host = document.createElement("div");
    renderCollaboration(host, browser.getState(), detail2, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    expect(host.querySelectorAll("button.rdcol-decide-button")).toHaveLength(0);
    expect(host.textContent).toContain("approved (recorded human action; not a truth state)");
  });

  it("contributions and organization proposals never get decision buttons", () => {
    for (const kind of ["contribution", "organization-proposal"] as const) {
      const text = kind === "contribution"
        ? "# Contribution Record\n\n## Metadata\n\n- contribution_id: C-1\n\n## Human Decision\n\nnone yet\n"
        : "# Organization Proposal\n\n## Metadata\n\n- organization_proposal_id: O-1\n\n## Human Decision\n\nnone yet\n";
      const detail = parseArtifact(kind, { path: `.${kind === "contribution" ? "contributions" : "organization-proposals"}/x.md`, text });
      const host = document.createElement("div");
      const browser = new CollaborationBrowser();
      browser.select(kind, "x");
      renderCollaboration(host, browser.getState(), detail, {
        onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
      });
      expect(host.querySelectorAll("button.rdcol-decide-button")).toHaveLength(0);
    }
  });
});

describe("v1.8 contribution linking", () => {
  it("parser reads related_proposal_decision for display", () => {
    const text = [
      "# Contribution Record", "", "## Metadata", "",
      "- contribution_id: CONTRIB-1",
      '- author_agent: "FICT-AGENT-RESEARCHER-1"',
      '- created_at: "2026-09-20T11:00Z"',
      '- related_proposal_id: "PROP-20260920-001"',
      '- related_proposal_decision: "approved"',
      "", "## Contribution Summary", "", "executed the approved scope", "",
      "## Evidence Used", "", "- fictional", "",
      "## Change Description", "", "relation created", "",
      "## Human Decision", "", "approved on 2026-09-20", "",
      "## History", "", "- line", "",
    ].join("\n");
    const detail = parseArtifact("contribution", { path: ".contributions/c.md", text });
    expect(detail.metadata.relatedProposalId).toBe("PROP-20260920-001");
    expect(detail.metadata.relatedProposalDecision).toBe("approved");
  });
});

describe("v1.8 execution and mutation boundaries", () => {
  it("no automatic execution path: surface has no apply/execute verb anywhere", () => {
    const surfaceSrc = readFileSync(join(root, "src", "collaboration", "collaboration-surface.ts"), "utf-8");
    // call-shaped bans (prohibition WORDS appear in comments by design)
    for (const banned of ["execute(", "apply(", "runAgent(", "automation"]) {
      expect(surfaceSrc).not.toContain(banned);
    }
    const browser = new CollaborationBrowser();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(browser))
      .filter((m) => m !== "constructor" && m !== "update");
    expect(methods.sort()).toEqual(["back", "dispose", "getState", "refresh", "select", "subscribe"]);
  });

  it("no mutation path inside plugin beyond the ONE decision port", () => {
    // adapter.write may appear ONLY in the decision port module
    const portsSrc = readFileSync(join(root, "src", "architecture", "obsidian-graph-ports.ts"), "utf-8");
    expect((portsSrc.match(/adapter\.write\(/g) ?? []).length).toBe(1);
    const viewSrc = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    expect(viewSrc).not.toContain("adapter.write");
    expect(viewSrc).not.toContain("vault.modify");
    expect(viewSrc).not.toContain("vault.create");
    // all other src files: no adapter.write at all
    const semDir = join(root, "src", "collaboration");
    for (const f of ["artifact-reader.ts", "collaboration-surface.ts", "proposal-decision.ts"]) {
      const src = readFileSync(join(semDir, f), "utf-8");
      expect(src).not.toContain("adapter.write");
      expect(src).not.toContain("vault.modify");
    }
    // the pure transform module has no I/O at all
    const pureSrc = readFileSync(join(semDir, "proposal-decision.ts"), "utf-8");
    expect(pureSrc).not.toMatch(/adapter\.|vault\.|fs\.|readFile|writeFile|\.write\(/);
  });

  it("skill carries the approved workflow guidance with boundaries", () => {
    const skill = readFileSync(join(root, "skills", "rational-delirium-agent-skill.md"), "utf-8");
    const norm = skill.replace(/\s+/g, " ");
    expect(norm).toContain("Approved Workflow");
    expect(norm).toContain("WAIT for the Human decision");
    expect(norm).toContain("perform ONLY the approved change described by the proposal");
    expect(norm).toContain("create a Contribution Record");
    expect(norm).toContain("NOT a permission system");
  });
});
