# 理性失序 · Rational Delirium

**A local personal knowledge library for humans and Agents. Obsidian is optional.**

Version **1.10.0** adds four complementary knowledge roles — **CASE / EVIDENCE /
HYPOTHESIS / LOOP** — with source-backed material organization, directed relation
editing, portable knowledge packages and restrained, accessible UI motion.
[中文](README_zh-CN.md) · [Usage and recovery](docs/standalone-knowledge.md) ·
[Evaluation and validation](docs/validation/standalone/readiness.md)

[Confirmed three-layer design](docs/architecture/three-layer-design-v1.0.md) ·
[Four-role workflow and formats](docs/four-role-workspace.md) ·
[1.10.0 validation](docs/validation/v1.10.0/readiness.md)

## Start locally

Node 24+ is required. Build from source:

```sh
npm ci
npm run build
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

Open the printed local URL (default `http://127.0.0.1:4399`). The demo requires an
empty folder and uses explicitly synthetic sources. For your existing Markdown
folder, run `init --root <folder>`, then `serve --root <folder>`. Initialization
adds workspace metadata and an external signing key; it does not migrate notes.
A built distribution needs only `rd.mjs`, `web/` and Node; no runtime npm install,
Python process, model account, database or Obsidian desktop is required.

## Knowledge, evidence and change

- Read and search ordinary Markdown, legacy `type/id` notes and KO
  `object_id/kind` objects through one parser and saved-note index.
- Follow precise identity, source path/revision/lines, support, contradiction and
  lineage. Duplicate identities remain ambiguous; broken references remain visible.
- Investigate a focused **argument map** with excerpts and explicit relationship
  direction; switch to a relation list when dense. No dot-cloud navigation required.
- Edit locally or review an Agent's concrete before/after proposal. Approval and
  execution are distinct. Stale sources, stale evidence and forged decisions fail.
- Inspect revision history, propose a reviewed inverse, and recover interrupted
  multi-file writes without overwriting an unrelated external edit.

Markdown is the knowledge source. Graphs are derived projections. Relevance is
lexical retrieval ranking, not truth or confidence. The system does not supply a
model or turn note text into agent instructions.

## Agent access

For checked answers with automatic repair and explicit-unknown fallback, use the
[Agent delivery runner](docs/agent-delivery.md). It checks every draft at the host
boundary; candidates stay separate from formal graph relations.


```sh
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge --write
node dist-agent/rd.mjs search --root /absolute/path/knowledge --query 记忆
node dist-agent/rd.mjs help
```

MCP stdio defaults to read-only. `--write` exposes propose/revise/restore/apply,
never approve/direct-save/recover. See the current [Agent workflow](skills/rational-delirium-agent-skill.md).
Approval signatures bind the proposal and workspace; host filesystem isolation
remains separate. The local browser UI is an operator surface, bound to loopback
with same-origin/token checks. It is not a public hosted service.

## Validation

```sh
python -m pip install -r semantic-graph/requirements.txt
npm run validate
node scripts/scale-agent.mjs
```

The fixed synthetic retrieval evaluation preserves its baseline algorithm and
relevance labels. Tests cover engineering behavior and browser task walkthroughs;
they do not establish real-world knowledge quality or model answer faithfulness.
See [measured evidence, changes and limits](docs/validation/standalone/readiness.md).

## Optional Obsidian plugin

`npm run build:plugin` emits the four-file plugin. Install with
`node scripts/deploy.mjs /path/to/vault` and enable it in Obsidian 1.13.7+.
Existing plugin views remain compatible with the unified source index. Its earlier
Markdown proposal/decision workflow is legacy display compatibility; it does not
authorize the independent executor. See [plugin workflow](docs/personal-knowledge-workflow.md).

`semantic-graph/projector.py` and `mutation-gate/` remain explicitly legacy
KO-only export / append-only gate tools. The independent runtime uses the shared
Node index and the new revision engine. No graph.json is needed for daily use.

The first independent release focuses on text knowledge. PDF/OCR, attachment
preview, built-in model chat and multi-device sync are outside this release.

## License

MIT. Distributed builds include third-party license notices.

当前状态回答现已接入来源与版本覆盖检查：对照库内当前声明和历史记录，避免漏读后续发布版本；抓取时间、课件版本与软件发布分开处理。详见 [Agent 来源与版本覆盖](docs/agent-delivery.md)。调用 `prepare_answer` 需携带原始 `questions`；覆盖不足保留未知。
