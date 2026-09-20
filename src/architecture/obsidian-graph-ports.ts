/** v1.6.1 — Obsidian implementations of the read-only graph ports.
 * Moved verbatim from main.ts (behavior unchanged) so the view
 * setup module can construct them without main.ts growing.
 * adapter.exists/read only — no write verb anywhere. */

import type { Plugin } from "obsidian";
import type { GraphSource } from "../semantic-graph/graph-loader";
import { DEFAULT_SEMANTIC_GRAPH_PATH } from "../semantic-graph/graph-loader";
import type { KoDetailResult, KoSourceReader } from "../semantic-graph/ko-detail-reader";
import type { CollaborationArtifactSource, DirReadResult } from "../collaboration/artifact-reader";
import {
  applyDecisionToProposalText,
  isProposalArtifactPath,
  type DecisionResult,
  type ProposalDecision,
  type ProposalDecisionPort,
} from "../collaboration/proposal-decision";
import { extractFrontmatterBlock, koDetailFromNote, parseKoFrontmatter } from "../semantic-graph/ko-detail-reader";

/** v1.3.1 §1: read-only source over the derived semantic-graph
 * artifact file. */
export class ObsidianGraphSourceImpl implements GraphSource {
  constructor(private readonly plugin: Plugin) {}
  async read() {
    const adapter = this.plugin.app.vault.adapter;
    try {
      if (!(await adapter.exists(DEFAULT_SEMANTIC_GRAPH_PATH))) {
        return { state: "missing" as const };
      }
      return { state: "available" as const, text: await adapter.read(DEFAULT_SEMANTIC_GRAPH_PATH) };
    } catch (err) {
      return { state: "unavailable" as const, reason: String(err) };
    }
  }
}

/** v1.3.1 Phase 2 §1: read-only KO source reader. Resolves an exact
 * object_id by scanning note FRONTMATTER only; duplicates stay
 * ambiguous. Cached per refresh cycle; invalidate() drops the map. */
export class ObsidianKoSourceReaderImpl implements KoSourceReader {
  private index: Map<string, string[]> | null = null;

  constructor(private readonly plugin: Plugin) {}

  invalidate(): void {
    this.index = null;
  }

  private async ensureIndex(): Promise<Map<string, string[]>> {
    if (this.index !== null) return this.index;
    const map = new Map<string, string[]>();
    const adapter = this.plugin.app.vault.adapter;
    const files = this.plugin.app.vault
      .getMarkdownFiles().map((f) => f.path).sort();
    for (const path of files) {
      try {
        const text = await adapter.read(path);
        const block = extractFrontmatterBlock(text);
        if (block === null) continue;
        const fm = parseKoFrontmatter(block);
        if (fm === null) continue;
        const list = map.get(fm.object_id) ?? [];
        list.push(path);
        map.set(fm.object_id, list);
      } catch {
        // unreadable note: skip; it declares nothing usable here
      }
    }
    this.index = map;
    return map;
  }

  async resolve(objectId: string): Promise<KoDetailResult> {
    try {
      const map = await this.ensureIndex();
      const paths = map.get(objectId) ?? [];
      if (paths.length === 0) return { state: "missing" };
      if (paths.length > 1) return { state: "ambiguous", paths };
      const text = await this.plugin.app.vault.adapter.read(paths[0]);
      return koDetailFromNote(paths[0], text);
    } catch (err) {
      return { state: "unavailable", reason: String(err) };
    }
  }
}

/** v1.7.4-A: read-only source over a vault artifact directory
 * (adapter.list + adapter.read only — no write verb). Markdown
 * files only; subdirectories are not descended into. */
export class ObsidianCollaborationSourceImpl implements CollaborationArtifactSource {
  constructor(private readonly plugin: Plugin) {}
  async readDir(dir: string): Promise<DirReadResult> {
    const adapter = this.plugin.app.vault.adapter;
    try {
      const listing = await adapter.list(dir);
      const files: { path: string; text: string }[] = [];
      // DataAdapter.list returns vault-relative paths, not basenames.
      for (const path of listing.files) {
        if (!path.toLowerCase().endsWith(".md")) continue;
        try {
          files.push({ path, text: await adapter.read(path) });
        } catch {
          // unreadable artifact file: skipped
        }
      }
      return { state: "available", files };
    } catch {
      // adapter errors on missing directories: honest empty state
      return { state: "missing" };
    }
  }
}

/** v1.8: the ONE controlled write path — recording a Human
 * decision on a proposal artifact. Guards: .proposals/*.md only;
 * read-current → pure transform → write. No other write verb
 * exists in this codebase. */
export class ObsidianProposalDecisionPortImpl implements ProposalDecisionPort {
  constructor(private readonly plugin: Plugin) {}
  async recordDecision(path: string, decision: ProposalDecision): Promise<DecisionResult> {
    if (!isProposalArtifactPath(path)) {
      return { state: "invalid", reason: "not a proposal artifact path" };
    }
    const adapter = this.plugin.app.vault.adapter;
    try {
      if (!(await adapter.exists(path))) {
        return { state: "missing" };
      }
      const text = await adapter.read(path);
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      const result = applyDecisionToProposalText(text, decision, now);
      if (!result.ok) {
        return { state: "invalid", reason: result.reason };
      }
      await adapter.write(path, result.text);
      return { state: "written", decision };
    } catch (err) {
      return { state: "unavailable", reason: String(err) };
    }
  }
}
