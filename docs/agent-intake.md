# Agent intake · 自动建库

`node dist-agent/rd.mjs intake --root <knowledge> --manifest <scope.json> --dsh-entry <installed-dsh-entry> --serve`

This is the local operator entry for collecting a specified scope, preserving source snapshots, extracting important knowledge, checking relationships, writing Markdown and starting the workspace. The operator's invocation authorizes these bounded, additive writes. It does not enable approval in MCP or permit model-generated paths, code or edits to existing knowledge cards.

## Scope / 指定资料

Copy [the scope example](../examples/intake-scope.json), edit it, then save it outside the source repository. The browser's **Agent 自动建库** entry can also download a scope file. It configures the job; the user's local Agent runs it in a terminal.

```json
{
  "schema": "rd-intake/1",
  "name": "My project knowledge",
  "purpose": "Keep important decisions, observations, open explanations and recurring patterns. Preserve conflicting accounts and version boundaries.",
  "sources": [
    {"type": "local", "path": "D:/Materials/project", "include": ["**/*.md", "**/*.txt", "**/*.jsonl"], "exclude": ["scratch/**"]},
    {"type": "github", "repository": "owner/repository", "include": ["README*", "docs/**/*.md"], "historyRefs": ["v1.0.0"], "releases": true}
  ]
}
```

Relative local paths resolve against the manifest directory. `include` and `exclude` use relative slash-separated `*`, `**`, `?` patterns. Unknown fields are rejected to catch scope typos. Explicit local files or directories are required; whole-drive roots and using the destination as its own input are rejected. A destination nested inside a source directory is excluded from traversal.

Supported input is UTF-8 Markdown/plain text (`.md`, `.markdown`, `.txt`) and supported visible-message JSON/JSONL conversation exports. For JSON documents intended as literal text, specify `format: "text"`. For explicit conversations use `format: "transcript"`; `auto` is the default. Codex message records, common `messages` exports, Claude message wrappers and ChatGPT exports with a valid `current_node` are supported. The selected conversation branch, message roles and available message timestamps are preserved. Hidden reasoning, tools, system/developer messages and nontext content are omitted. This is a visible-text extraction, not an archive of the entire original JSON. Original files remain in place, with their original hashes recorded.

PDF, Office files, databases, images, audio, OCR and arbitrary application-specific chat stores require a prior export/extraction to supported text. Unsupported files are reported as skipped. No full-machine discovery runs merely because RD starts.

GitHub intake uses the public HTTPS API for the named repository only. It pins each requested ref to an exact commit/tree/blob, reads selected text documents, and saves published release records including prereleases. `historyRefs` supplies up to eight explicit earlier refs. Release pagination covers up to 500 published entries and reports any older-history gap. It does not fetch arbitrary URLs, private repos, issues or every historical file revision. A missing ref, API denial/rate limit, truncated tree or unsafe path is an explicit error; partial collection is not presented as complete coverage. For private repositories use a local export.

## One command / 一次执行

Download/unpack the standalone release with Node 24+, or run `npm ci && npm run build` in a source checkout. DSH is optional and must already be installed and configured by the user.

```sh
node dist-agent/rd.mjs intake --root ./my-knowledge --manifest ./scope.json --dsh-entry /absolute/path/dsh/lib/bin.js --serve
```

The workspace is initialized automatically if necessary. No `demo` step is involved. `--key <outside-root.pem>` is optional; by default the approval key is kept in the user's external RD key directory. `--port 4400` chooses another browser port. `--timeout-ms 300000` sets the per-model-call timeout (1000–900000 ms).

Without `--dsh-entry` or `--adapter`, intake collects source Markdown and produces an `awaiting-agent` work order. It explicitly does **not** claim classification is complete. Any existing Agent can implement the SDK callback, or provide a trusted local ESM module:

```sh
node dist-agent/rd.mjs intake --root ./my-knowledge --manifest ./scope.json --adapter /absolute/path/my-agent.mjs --serve
```

The adapter exports `async generate(request)`. It is executable local code selected by the operator. The request's phase is `extract`, `relate` or `verify`, with bounded source packets, exact citations, generated identities and any repair feedback. See the exported `intakePrompt(request)` for the complete JSON contract. A host integration can call:

```js
import {runIntake, intakePrompt} from './dist-agent/index.mjs';
const report = await runIntake(knowledgeRoot, scope, async request => {
  return await yourExistingAgent.generateJSON(intakePrompt(request));
}, {base: manifestDirectory});
```

The host consumes model output as data; generated code and arbitrary output paths are not accepted. The DSH adapter requests no tool calls and refuses outputs from attempts reporting tool use. This is cooperative application control, not an OS sandbox for an external Agent.

## Pipeline / 收集、整理与核对

1. Check workspace structure and recovery state. Collect only selected inputs. Exclude hidden/generated/credential paths and links/junctions. Apply a best-effort common-credential filter **before** saving source text or sending packets to the model. This does not detect all private information; choose a suitable scope and Agent/model configuration.
2. Save immutable Markdown source snapshots under `Materials/Intake/`. Preserve original location/URL, original hash, normalized text hash, and GitHub commit/blob/ref when available. Original declarations are fenced so imported IDs cannot acquire RD identity. Capture time belongs to the run record; it does not establish event time or external freshness.
3. Split the complete collected text into bounded packets. Extract important CASE / EVIDENCE / HYPOTHESIS / LOOP units; roles may overlap and need not all occur. Every packet receives a used/skipped disposition with a reason. Every adopted unit needs exact original-source citations. Rule-only collection is not relabeled as semantic organization.
4. Propose directed support, contradiction, complement or case/pattern links with evidence for both endpoints. Similarity is only a bounded retrieval aid. An independent generation call reviews each relation against its supplied original excerpts. Only an originally declared relation confirmed by that review can become a formal edge. Candidates remain candidates even if a later reviewer says confirm; every candidate records missing evidence. Failed semantic review leaves candidates; invalid evidence must be repaired or omitted with a gap.
5. Check all citations again against disk, pin their hashes into proposals, and apply bounded journal transactions. Preserve existing notes and candidates. New cards may link to existing cards; this version does not automatically rewrite old cards to create reverse-direction links. Objects have candidate lifecycle status; a formal edge records the reviewed, scoped interpretation, not factual truth certification.
6. Validate the resulting graph, recheck adopted formal edges and create a navigable intake note. `complete` means the defined pipeline finished, not that every possible relationship or fact was discovered. `partial` means some batches or coverage checks remain unresolved. Collection and extraction/relation repair have bounded attempts; incomplete originals remain readable.

Default collection limits: 128 materials, 32 MiB of rendered Markdown, 1900 KiB per input, 20,000 traversed entries. Manifest limits can increase to 500 materials/128 MiB total. Extraction uses up to 24 units per batch/128 per run; relationships up to 64 per batch/256 per run. Existing-neighbor retrieval and cross-batch relation context are bounded. Limits produce explicit errors/gaps; they are not silent full-coverage claims. Narrow or split large scopes.

## Refresh, review and recovery / 增量、复核与恢复

Run the same command again to collect new source versions. An unchanged completed scope with matching output hashes returns `unchanged` without another model call. Previously processed source versions are reused; changed inputs produce new snapshots while historical versions remain. Edited or deleted prior outputs are retained/reported for review, not silently overwritten. No automatic semantic supersession is inferred from a larger version number or a new capture date.

The result includes `summary`, `gaps`, `dispositions`, `navigation` and transaction IDs. Exit code 0 is complete/unchanged/awaiting-agent, 2 is partial, and 1 is failure. `awaiting-agent` is distinguishable in the JSON status. With `--serve`, partial and awaiting-agent results remain open for inspection.

Private run records and bounded packet work orders are in `.rd/intake/I-<uuid>*.json`; DSH request/draft metadata is in `.rd/intake/dsh-<uuid>/`. The adapter excludes hidden reasoning streams. These records and the approval key are not included in Markdown migration ZIPs. Keep full workspace and original-material backups for recovery. Each committed batch can be reviewed in history and restored through the existing reviewed inverse-transaction workflow. A run spanning multiple batches is recoverable, not one OS-atomic operation. Resolve interrupted writes before retrying.

For subsequent Agent answers, retain the existing `source_coverage` → original reads → `prepare_answer` gate. Ingestion does not bypass citation, candidate or current/historical version checks.

## 中文速览

先指定材料范围和整理目的，再执行 `intake`；它会自动初始化知识目录、保存原文快照、调用已有 Agent 整理重要知识，核对来源和关系后写入 Markdown，可接着打开界面。浏览器里的“Agent 自动建库”用于生成范围文件，本机 Agent 负责执行。没有配置 Agent 时只采集材料，并明确停在“等待整理”。

原始材料与四板块知识单元分开保存。正式关系要有双方的原文依据并通过第二轮语义复核；不确定关系保留候选与具体缺口，旧候选不会因新增材料而自动转正。语义复核仍可能出错，应沿引用回看原文。

重复执行会复用已处理且版本未变的来源；新版本保留新快照与旧快照。现有知识文件不会被自动覆盖。完成状态、跳过原因、缺口与事务都可查。Office/PDF/数据库和不支持的聊天存储需先导出文本，私有 GitHub 仓库使用本地导出。完整恢复需要备份原材料、知识目录及外置密钥。
