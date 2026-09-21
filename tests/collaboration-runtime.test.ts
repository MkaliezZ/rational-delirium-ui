import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, WorkspaceLeaf } from "obsidian";
import { ObsidianCollaborationSourceImpl } from "../src/architecture/obsidian-graph-ports";
import { RDWorkspaceStore } from "../src/architecture/workspace-state";
import { buildCollaborationModel, parseArtifact } from "../src/collaboration/artifact-reader";
import { RDWorkspaceShellView } from "../src/views/rd-workspace-view";
import { RDArchiveNavView } from "../src/views/archive-nav-view";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const example = (name: string) => readFileSync(join(root, "examples", name), "utf8");
const pending = example("proposal-example.md");
const approved = pending.replace("\npending\n", "\napproved\n") +
  "\n## Human Decision\n\napproved — explicit Human decision\n" +
  "\n## History\n\n- Human approved this proposal; not truth validation.\n";
const contribution = example("contribution-record-example.md");
const proposalPath = ".proposals/PROP-20260920-001.md";
const contributionPath = ".contributions/CONTRIB-20260920-001.md";

/** Match Obsidian DataAdapter.list: paths are already vault-relative. */
function host(waitForListing: () => Promise<void> = async () => {}) {
  const files = new Map([
    [proposalPath, approved],
    [".proposals/PROP-NEW.md", pending.replace(/PROP-20260920-001/g, "PROP-NEW")],
    [contributionPath, contribution],
    [".organization-proposals/ORGPROP-001.md", example("organization-proposal-example.md")],
    [".proposals/ignore.json", "{}"],
  ]);
  const read = vi.fn(async (path: string) => {
    if (!files.has(path)) throw new Error(`Missing file: ${path}`);
    return files.get(path)!;
  });
  const list = vi.fn(async (dir: string) => {
    await waitForListing();
    return { folders: [], files: [...files.keys()].filter((path) => path.startsWith(`${dir}/`)) };
  });
  const write = vi.fn(async () => { throw new Error("Read-only inspection attempted a write"); });
  const source = new ObsidianCollaborationSourceImpl({
    app: { vault: { adapter: { read, list, write } } },
  } as unknown as Plugin);
  return { source, files, read, write };
}

const views: Array<{ onClose(): Promise<void> }> = [];
afterEach(async () => {
  for (const view of views.splice(0)) await view.onClose();
  document.body.replaceChildren();
});

describe("Collaboration real-host regressions", () => {
  it("discovers existing and new artifacts using full vault-relative list paths", async () => {
    const h = host();
    const before = [...h.files];
    const model = await buildCollaborationModel(h.source);
    expect(model.proposals.map((p) => p.id)).toEqual(["PROP-20260920-001", "PROP-NEW"]);
    expect(model.proposals.map((p) => p.status)).toEqual(["approved", "pending"]);
    expect(model.contributions.map((c) => c.id)).toEqual(["CONTRIB-20260920-001"]);
    expect(model.contributions[0].relatedProposalId).toBe("PROP-20260920-001");
    expect(model.organizationProposals).toHaveLength(1);
    expect(h.read).toHaveBeenCalledWith(proposalPath);
    expect(h.read).toHaveBeenCalledWith(contributionPath);
    expect(h.read).not.toHaveBeenCalledWith(".proposals/ignore.json");
    expect(h.write).not.toHaveBeenCalled();
    expect([...h.files]).toEqual(before);
  });

  it("reads an existing explicit proposal decision without requiring it in older proposals", () => {
    const detail = parseArtifact("proposal", { path: proposalPath, text: approved });
    expect(detail.metadata.humanDecision).toBe("approved — explicit Human decision");
    expect(detail.sections.History).toContain("Human approved");
    expect(detail.rawText).toBe(approved);
    const legacy = parseArtifact("proposal", { path: ".proposals/new.md", text: pending });
    expect(legacy.metadata.status).toBe("pending");
    expect(legacy.metadata.humanDecision).toBeNull();
    expect(legacy.problems).not.toContain("missing section: Human Decision");
  });

  it("renders after async loading on first open and after closing/reopening the view", async () => {
    const store = new RDWorkspaceStore();
    for (const opening of ["cold", "warm"]) {
      // V2: the desk mode is shared store state (it survives view
      // reopening); each opening starts from the investigation mode.
      store.setWorkspaceMode("investigation");
      let release!: () => void;
      const loading = new Promise<void>((resolve) => { release = resolve; });
      const h = host(() => loading);
      const source = { read: async () => ({ state: "missing" as const }) };
      const view = new RDWorkspaceShellView({} as WorkspaceLeaf, {
        store,
        source,
        collaborationSource: h.source,
        openView: async () => {},
      });
      // V2: the collaboration toggle lives in the left dock leaf,
      // sharing the same store as the workspace view.
      const nav = new RDArchiveNavView({} as WorkspaceLeaf, {
        store, source, openView: async () => {},
      });
      views.push(view, nav);
      await view.onOpen();
      await nav.onOpen();
      nav.contentEl.querySelector<HTMLButtonElement>(".rdan-collab-toggle")!.click();
      expect(view.contentEl.textContent, opening).toContain("loading artifact directories");
      release();
      await vi.waitFor(() => {
        expect(view.contentEl.textContent, opening).not.toContain("loading artifact directories");
        expect(view.contentEl.textContent).toContain("Proposals (2)");
        expect(view.contentEl.textContent).toContain("Agent Contributions (1)");
      });
      const row = [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdcol-row")]
        .find((el) => el.getAttribute("aria-label") === "inspect PROP-20260920-001")!;
      row.click();
      await vi.waitFor(() => {
        expect(view.contentEl.querySelector(".rdcol-detail")?.textContent).toContain("approved — explicit Human decision");
        expect(view.contentEl.textContent).toContain("Referenced by contribution records (1)");
        expect(view.contentEl.textContent).toContain("Human approved this proposal");
      });
      view.contentEl.querySelector<HTMLButtonElement>(".rdcol-back")!.click();
      await vi.waitFor(() => expect(view.contentEl.querySelectorAll(".rdcol-row")).toHaveLength(4));
      [...view.contentEl.querySelectorAll<HTMLButtonElement>(".rdcol-row")]
        .find((el) => el.getAttribute("aria-label") === "inspect CONTRIB-20260920-001")!.click();
      await vi.waitFor(() => expect(view.contentEl.querySelector(".rdcol-detail")?.textContent)
        .toContain("workflow: proposal PROP-20260920-001 → decision approved"));
      expect(h.write).not.toHaveBeenCalled();
      await view.onClose();
      await nav.onClose();
      views.pop();
      views.pop();
      view.contentEl.remove();
      nav.contentEl.remove();
    }
  });
});
