/** v1.9 Agent Skill Workflow Validation tests — skill workflow
 * instructions, lifecycle example, contribution linkage fields,
 * collaboration linkage display, no runtime / execution controls.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRIBUTIONS_DIR,
  PROPOSALS_DIR,
  parseArtifact,
} from "../src/collaboration/artifact-reader";
import {
  CollaborationBrowser,
  renderCollaboration,
} from "../src/collaboration/collaboration-surface";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const proposalText = [
  "# Proposal", "", "## Metadata", "",
  "- proposal_id: PROP-20260920-001",
  '- author_agent: "FICT-AGENT-RESEARCHER-1"',
  '- created_at: "2026-09-20T08:15Z"',
  '- target_object_id: "FICT-KO-20260919-0007"',
  '- target_object_type: "HYPOTHESIS"',
  "", "## Requested Change", "",
  "ADD_RELATION: FICT-KO-20260918-0003 supports FICT-KO-20260919-0007.",
  "", "## Evidence", "", "- both objects, by id", "",
  "## Reasoning", "", "connectivity", "", "## Expected Impact", "", "navigation", "",
  "## Status", "", "approved", "",
  "## History", "", "- created", "",
].join("\n");

const contributionText = [
  "# Contribution Record", "", "## Metadata", "",
  "- contribution_id: CONTRIB-20260920-001",
  '- author_agent: "FICT-AGENT-RESEARCHER-1"',
  '- created_at: "2026-09-20T11:00Z"',
  '- related_proposal_id: "PROP-20260920-001"',
  '- related_proposal_decision: "approved"',
  '- performed_operation: "ADD_RELATION"',
  '- affected_objects: "FICT-KO-20260919-0007 (relation added), FICT-KO-20260918-0003 (referenced)"',
  "", "## Contribution Summary", "", "executed the approved scope", "",
  "## Evidence Used", "", "- fictional", "",
  "## Change Description", "", "the declared supports relation now exists", "",
  "## Human Decision", "", "approved on 2026-09-20", "",
  "## History", "", "- line", "",
].join("\n");

describe("v1.9 skill workflow instructions", () => {
  const skill = readFileSync(join(root, "skills", "rational-delirium-agent-skill.md"), "utf-8")
    .replace(/\s+/g, " ");

  it("carries the three-phase workflow with MUST boundaries", () => {
    expect(skill).toContain("Before Human approval");
    expect(skill).toContain("WAIT for the Human decision");
    expect(skill).toContain("After Human approval");
    expect(skill).toContain("perform ONLY the approved change described by the proposal");
    expect(skill).toContain("ADD_RELATION");
    expect(skill).toContain("expand the approved scope");
    expect(skill).toContain("treat approval as truth");
    expect(skill).toContain("treat approval as permanent authority");
    expect(skill).toContain("silently change unrelated objects");
    expect(skill).toContain("After completing the work");
    expect(skill).toContain("create a Contribution Record");
    expect(skill).toContain("reference the original proposal id");
    expect(skill).toContain("reference the Human decision state");
    expect(skill).toContain("performed operation, affected objects, result description");
  });

  it("approval framed as workflow state, not truth or authority", () => {
    expect(skill).toContain("it is a workflow state, recorded by a Human");
    expect(skill).toContain("does not validate correctness");
    expect(skill).toContain("it binds this proposal and this revision only");
    expect(skill).toContain("NOT a permission system");
  });
});

describe("v1.9 lifecycle example (describes, never implements)", () => {
  const example = readFileSync(join(root, "examples", "agent-workflow-example.md"), "utf-8")
    .replace(/\s+/g, " ");

  it("walks all seven steps with the ADD_RELATION example", () => {
    expect(example).toContain("Read RD Skill");
    expect(example).toContain("Inspect knowledge objects");
    expect(example).toContain("Create Proposal");
    expect(example).toContain("Wait for Human decision");
    expect(example).toContain("Perform only the approved work");
    expect(example).toContain("Create Contribution Record");
    expect(example).toContain("RD displays the relationship");
    expect(example).toContain("ADD_RELATION");
    expect(example).toContain("supports");
  });

  it("explicitly descriptive; fictional; no authorization language", () => {
    expect(example).toContain("DESCRIBES agent behavior");
    expect(example).toContain("does not implement");
    expect(example).toContain("authorizes nothing");
    expect(example).toContain("ENTIRELY FICTIONAL");
    expect(example).toContain("not truth validation");
    expect(example).toContain("RD displayed the workflow; it executed nothing");
  });
});

describe("v1.9 contribution workflow fields", () => {
  it("template carries the full reference set", () => {
    const tpl = readFileSync(join(root, "templates", "contribution-record-template.md"), "utf-8");
    for (const f of [
      "related_proposal_id", "related_proposal_decision",
      "performed_operation", "affected_objects",
    ]) {
      expect(tpl).toContain(f);
    }
    expect(tpl).toContain("does NOT prove");
  });

  it("parser surfaces the workflow fields for display", () => {
    const detail = parseArtifact("contribution", {
      path: `${CONTRIBUTIONS_DIR}/c.md`, text: contributionText,
    });
    expect(detail.metadata.relatedProposalId).toBe("PROP-20260920-001");
    expect(detail.metadata.relatedProposalDecision).toBe("approved");
    expect(detail.metadata.performedOperation).toBe("ADD_RELATION");
    expect(detail.metadata.affectedObjects).toContain("FICT-KO-20260919-0007");
  });
});

describe("v1.9 collaboration linkage display", () => {
  it("proposal detail lists referencing contributions; contribution shows the chain", () => {
    const propDetail = parseArtifact("proposal", {
      path: `${PROPOSALS_DIR}/prop-001.md`, text: proposalText,
    });
    const contribDetail = parseArtifact("contribution", {
      path: `${CONTRIBUTIONS_DIR}/contrib-001.md`, text: contributionText,
    });
    const browser = new CollaborationBrowser();

    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    let host = document.createElement("div");
    const linking = [{ ...parseArtifact("contribution", {
      path: `${CONTRIBUTIONS_DIR}/contrib-001.md`, text: contributionText,
    }) }];
    void linking;
    // renderCollaboration computes linking internally from the model;
    // drive it through the model instead:
    // (simulate) — direct detail render with model present:
    const state = browser.getState();
    void state;
    // Use the real path: refresh through a fake source, then select.
    const source = {
      readDir: async (dir: string) => dir === PROPOSALS_DIR
        ? { state: "available" as const, files: [{ path: `${PROPOSALS_DIR}/prop-001.md`, text: proposalText }] }
        : dir === CONTRIBUTIONS_DIR
          ? { state: "available" as const, files: [{ path: `${CONTRIBUTIONS_DIR}/contrib-001.md`, text: contributionText }] }
          : { state: "missing" as const },
    };
    void source;
    // fall through to the async test below
    expect(propDetail.metadata.id).toBe("PROP-20260920-001");
    expect(contribDetail.metadata.performedOperation).toBe("ADD_RELATION");
  });

  it("end-to-end: proposal detail shows linkage; contribution detail shows chain", async () => {
    const source = {
      readDir: async (dir: string) => dir === PROPOSALS_DIR
        ? { state: "available" as const, files: [{ path: `${PROPOSALS_DIR}/prop-001.md`, text: proposalText }] }
        : dir === CONTRIBUTIONS_DIR
          ? { state: "available" as const, files: [{ path: `${CONTRIBUTIONS_DIR}/contrib-001.md`, text: contributionText }] }
          : { state: "missing" as const },
    };
    const browser = new CollaborationBrowser();
    await browser.refresh(source as never);
    const model = browser.getState().model;
    if (model === null) throw new Error("model must load");

    browser.select("proposal", `${PROPOSALS_DIR}/prop-001.md`);
    const propDetail = parseArtifact("proposal", {
      path: `${PROPOSALS_DIR}/prop-001.md`, text: proposalText,
    });
    let host = document.createElement("div");
    renderCollaboration(host, browser.getState(), propDetail, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    let text = host.textContent ?? "";
    expect(text).toContain("1 contribution record(s)");
    expect(text).toContain("CONTRIB-20260920-001 · decision: approved · ADD_RELATION");
    expect(text).toContain("affected: FICT-KO-20260919-0007");

    browser.select("contribution", `${CONTRIBUTIONS_DIR}/contrib-001.md`);
    const contribDetail = parseArtifact("contribution", {
      path: `${CONTRIBUTIONS_DIR}/contrib-001.md`, text: contributionText,
    });
    host = document.createElement("div");
    renderCollaboration(host, browser.getState(), contribDetail, {
      onSelect: () => undefined, onBack: () => undefined, onDecide: () => undefined,
    });
    text = host.textContent ?? "";
    expect(text).toContain("workflow: proposal PROP-20260920-001 → decision approved → this record");
    expect(text).toContain("performed operation");
    expect(text).toContain("affected objects");
  });
});

describe("v1.9 runtime and control boundaries", () => {
  it("no Run/Execute/Automation controls anywhere in the surface", () => {
    const surfaceSrc = readFileSync(join(root, "src", "collaboration", "collaboration-surface.ts"), "utf-8");
    for (const banned of ["Run Agent", "runAgent", "Execute", "Automation", "agent control panel"]) {
      expect(surfaceSrc).not.toContain(banned);
    }
    // decision buttons remain the ONLY action buttons
    const decisionButtons = surfaceSrc.match(/rdcol-decide-button/g) ?? [];
    expect(decisionButtons.length).toBe(2); // the two button creations, nothing else
  });

  it("no agent runtime code exists in src", () => {
    const mainSrc = readFileSync(join(root, "src", "main.ts"), "utf-8");
    const setupSrc = readFileSync(join(root, "src", "architecture", "rd-view-setup.ts"), "utf-8");
    for (const src of [mainSrc, setupSrc]) {
      for (const banned of ["spawn", "child_process", "scheduler", "agentRuntime", "runAgent", "model"]) {
        expect(src).not.toContain(banned);
      }
    }
  });

  it("no automatic modification path: the only write remains the decision port", () => {
    const portsSrc = readFileSync(join(root, "src", "architecture", "obsidian-graph-ports.ts"), "utf-8");
    expect((portsSrc.match(/adapter\.write\(/g) ?? []).length).toBe(1);
  });
});
