# Rational Delirium · 理性失序

[English](README.md) · [简体中文](README_zh-CN.md)

**A local-first knowledge workspace for humans and agents. Obsidian is optional.**

Keep your material in Markdown. Use **CASE / EVIDENCE / HYPOTHESIS / LOOP** to connect experiences, inspect supporting and opposing evidence, compare explanations, and revisit recurring patterns.

**v1.10.0 is an engineering preview.** It is intended for local text knowledge and users comfortable with Markdown or existing agent clients.

[Download the preview](https://github.com/MkaliezZ/rational-delirium-ui/releases/tag/v1.10.0) · [Current validation](docs/validation/v1.10.0/release.md) · [Usage and recovery](docs/standalone-knowledge.md)

## What you can do

- Collect Markdown or plain text, preserve the original, and review paragraph-level role suggestions.
- Organize cases, evidence, hypotheses, and recurring patterns without duplicating a note's identity.
- Browse a case index and directed relation views with excerpts, support, contradiction, supplements, and missing evidence.
- Search saved content, aliases, declared relationships, and source references. Search relevance is lexical ranking, not a truth score.
- Edit notes, review an agent's concrete change proposal, inspect history, and recover interrupted writes with version checks.
- Export Markdown knowledge packages and JSON, CSV, Markdown, or Mermaid relationship files.
- Connect an existing agent through CLI, the Node SDK, or MCP. Check citations, formal relationships, candidate status, and current/historical version coverage before delivery.

Roles describe how knowledge is used; they do not certify its truth. Similarity does not automatically become support, contradiction, or a confirmed recurring pattern. Uncertain relationships stay candidates.

## Start with the download

Install **Node.js 24+**, then unpack the standalone ZIP from the release page. The runtime includes its dependencies; it needs no runtime npm installation, Python, database, or Obsidian.

On Windows, double-click `Start-RD.cmd`. It creates a `knowledge` folder beside the package by default. Keep the service window open. Node itself is not bundled.

For an explicit synthetic example, run from the unpacked directory:

```sh
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

Open the printed local URL, normally `http://127.0.0.1:4399`. If the port is occupied, add `--port 4400`. `demo` accepts only an empty directory.

To use your own Markdown directory:

```sh
node dist-agent/rd.mjs init --root ./my-knowledge
node dist-agent/rd.mjs serve --root ./my-knowledge
```

Initialization adds workspace metadata and an external approval key while preserving existing notes. Keep a full backup of important material. Read-only viewing uses `serve --read-only`.

## Build from source

```sh
npm ci
npm run build
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

The optional Obsidian plugin is built separately into `dist/` by the same build. The standalone workspace does not require the plugin.

## Connect an agent

Start a local MCP stdio server from a compatible client:

```sh
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge
```

MCP defaults to read-only. `--write` exposes proposals and application of approved changes; it never exposes approval or direct-save tools. Full host filesystem access remains outside this cooperative boundary.

For host-enforced answer checks, use SDK `runAgentTask` or the optional installed-DSH adapter:

```sh
node dist-agent/agent-run.mjs --root /absolute/path/knowledge --questions /path/questions.json --output /path/new-run --dsh-entry /path/installed/dsh/lib/bin.js
```

The host preflights source coverage, checks the complete draft, returns concrete errors for repair, and retains explicit uncertainty when evidence is insufficient. Consume the returned `delivery`, rather than unchecked model output. Direct `prepare_answer` clients must supply the original `questions`.

Rational Delirium does not bundle a model or API credentials. An external agent/model may process the supplied context according to that client's configuration.

[Agent workflow](skills/rational-delirium-agent-skill.md) · [Delivery contract](docs/agent-delivery.md) · [Source reading](docs/agent-source-reading.md)

## Validation and scope

- **704 Vitest + 62 Python checks**; the full validation workflow passes on Windows and Ubuntu.
- One real local DSH re-evaluation covers **14 existing personal-material questions**: 77 exact citations and 23 formal relationships align with saved sources and declarations. Two questions retain source-coverage uncertainty.
- Independent-runtime, MCP, HTTP, knowledge-package, and recovery scenarios have engineering checks. These do not establish long-term reliability or real-world outcomes.

The current preview focuses on local text knowledge. PDF/OCR, attachment previews, cloud synchronization, and built-in model chat are future work. Classification suggestions use paragraph rules; semantic analysis depends on human review or an external agent. Fourteen existing questions are not a new blind benchmark or a general accuracy guarantee.

Knowledge ZIPs migrate indexed Markdown and declared relationships. They exclude attachments, approval keys, and complete execution history; keep the workspace and external keys separately for full recovery.

[Release validation](docs/validation/v1.10.0/release.md) · [Source/version evaluation](docs/validation/v1.10.0/source-coverage.md) · [Four-role formats](docs/four-role-workspace.md) · [Three-layer design](docs/architecture/three-layer-design-v1.0.md)

## Package a release

From a clean source checkout with Node 24+ and build dependencies installed:

```sh
npm run validate > validation.log
npm run package:agent -- --output ../release-output --validation-log ./validation.log
```

Use a new output directory. Packaging preserves earlier deliveries, records the source commit and file hashes, and creates standalone/plugin ZIPs plus `SHA256SUMS.txt`. The packaging step uses Node and does not require Python; running the Python test suites requires Python and the declared test dependencies.

## License

[MIT](LICENSE). Bundled dependencies retain their licenses in `THIRD_PARTY_NOTICES.txt`; the icon assets include their own license.
