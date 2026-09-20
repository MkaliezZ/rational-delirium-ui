# Rational Delirium

A **Human-governed knowledge workspace** inside [Obsidian](https://obsidian.md) —
a calm research archive where you investigate knowledge objects
(provenance, lineage, relations), follow agent contributions, and
keep every advancement of knowledge an explicit Human decision.

Rational Delirium is **not** an agent platform, **not** an agent
runtime, and **not** an autonomous AI system. It is an Obsidian
plugin plus a behavioral skill contract: external agents (Codex /
Claude / Kimi / any other) propose; Humans decide; RD displays.

[简体中文](README_zh-CN.md)

## Architecture Overview

```text
KO Markdown + frontmatter          Workflow artifacts
   (knowledge objects)               (proposals, records)
        |                                   |
        | v1.2.1 projection (repo tool)     | written by external agents
        v                                   v
Derived semantic graph artifact      .proposals / .contributions /
        |                            .organization-proposals
        | read-only                          |
        +----> Rational Delirium plugin <----+
                    |  (Obsidian, read-only except one
                    |   controlled write: Human decisions)
                    v
        Human investigation & decision
                    |
                    v
        External agent executes approved scope (outside RD)
                    |
                    v
        Contribution Record → RD displays the chain
```

## Workflow

```text
Agent reads RD Skill
  → inspects knowledge objects (exact ids, provenance, relations)
  → creates a Proposal (markdown artifact)
  → WAITS
Human reviews in Obsidian → records approve / reject
  (the only RD write: .proposals/*.md decision recording)
Agent executes ONLY the approved scope, outside RD
  → creates a Contribution Record (provenance, not proof)
RD displays: Proposal → Human Decision → Contribution Record
```

Approval authorizes a scope. It never validates truth.

## Core Features

- **Knowledge Workspace** — investigation surface: identity,
  provenance (Observation → Evidence → Inference → Conclusion),
  lineage (predecessor/successor, revises/supersedes), relations,
  diagnostics; object-to-object navigation with back trails.
- **Semantic graph projection** (`semantic-graph/projector.py`) —
  deterministic, read-only projection of declared frontmatter
  relations into a derived graph artifact (rebuildable, no
  database).
- **Collaboration Surface** — read-only browsing of agent
  contributions, proposals, and organization proposals; malformed
  artifacts stay visible; honest empty states.
- **Human decision recording** — explicit Approve/Reject on
  pending proposals; the single controlled write path in the
  plugin.
- **Agent Skill** (`skills/rational-delirium-agent-skill.md`) —
  behavioral contract for external agents: propose, wait, execute
  approved scope only, then record.
- **Theme system** — semantic tokens, Rational Archive default;
  motion explains structure, never meaning.

## Design Principles

- **Knowledge ≠ Truth** — stored objects record claims and provenance.
- **Projection ≠ Authority** — appearing in the graph proves nothing.
- **Agent Contribution ≠ Human Decision** — proposals are inputs to your judgment.
- **Relationship ≠ Confidence** — declared edges carry no weight.
- **Visibility ≠ Validation** — being displayed is not endorsement.

No truth scores, no confidence meters, no rankings, no auto-merge.

## Screenshots

*(placeholders — real screenshots coming)*

| Knowledge Workspace | Semantic Graph |
| --- | --- |
| ![Workspace](docs/images/01-workspace.png) | ![Graph](docs/images/02-graph.png) |

| Collaboration Surface | Human Decision | Contribution Record |
| --- | --- | --- |
| ![Collaboration](docs/images/03-collaboration.png) | ![Decision](docs/images/04-human-decision.png) | ![Contribution](docs/images/05-contribution-record.png) |

## 5-Minute Quick Start (Obsidian)

1. **Install the plugin**
   ```bash
   git clone https://github.com/MkaliezZ/rational-delirium-ui
   cd rational-delirium-ui
   npm ci && npm run build
   ```
   Copy `dist/` (main.js, manifest.json, styles.css,
   tokens-rational-archive.css) into
   `<vault>/.obsidian/plugins/rational-delirium/`, then enable
   **Rational Delirium** in Obsidian settings → Community plugins.

2. **Generate the semantic graph snapshot** (plugin reads, never builds):
   ```bash
   python semantic-graph/projector.py <vault> -o <vault>/semantic-graph/graph.json
   ```

3. **Open the workspace** — ribbon icon 📚 or command
   *Open RD Workspace*. Query an exact `object_id`, or click an
   object in the neutral snapshot list; inspect identity,
   provenance, lineage, relations.

4. **Optional — agent workflow**: give your agent the skill
   (`skills/rational-delirium-agent-skill.md`). It proposes into
   `.proposals/`; you review and decide in the Collaboration
   section; it executes the approved scope with its own tools and
   records into `.contributions/`.

## Agent Workflow Example

The complete MVP lifecycle (see
[examples/agent-workflow-example.md](examples/agent-workflow-example.md),
fictional identifiers):

```text
Proposal  (agent)     : ADD_RELATION — FICT-EVIDENCE-001 supports FICT-HYPOTHESIS-001
Decision  (human, in Obsidian): approved   ← recorded human action,
                                 not truth validation, not agent trust
Execution (agent, outside RD) : adds exactly the declared relation
Record    (agent)     : Contribution Record → proposal id, decision,
                        performed operation, affected objects
Display   (RD)        : Proposal → Decision → Contribution chain
```

## Current Status — FROZEN (v1.10 checkpoint)

Development is **PAUSED** awaiting real-world usage feedback
([freeze checkpoint](docs/RD_FREEZE_CHECKPOINT_V1_10.md)).

| Milestone | Status |
| --- | --- |
| v1.2.1 Semantic Graph Projection MVP | RELEASED |
| v1.3.x Presentation / Intelligence Surface / Visual System / Motion | FROZEN |
| v1.4–v1.5 Collaboration & Agent Workflow designs | FROZEN |
| v1.6.x Plugin architecture, theme system, Knowledge Workspace, polish | FROZEN |
| v1.7.x Agent Skill contract, artifacts, Collaboration Surface | FROZEN |
| v1.8 Human Approved Agent Workflow (first controlled write) | FROZEN |
| v1.9 Agent Skill Workflow Validation | FROZEN |
| v1.10 Real Agent Usage Validation (DSH, 5/5 PASS) | PASSED → project paused |

Validation: 434/434 tests, tsc clean, build pass at freeze.

## Limitations

By design, Rational Delirium has **no**:

- Agent Runtime — RD never runs, schedules or calls agents
- Agent Executor — approved work is performed by external agents with their own tools
- Agent Scheduler / background processes
- Automatic Knowledge Manager — no auto-organization, no auto-promotion
- Autonomous Vault Mutation — the only plugin write is Human decision recording on `.proposals/*.md`
- AI Judge — no truth evaluation, scoring, ranking or confidence

Paused-development policy: bug fixes, documentation corrections
and security fixes only. Restart requires real usage feedback, an
identified user pain point, or a concrete validation requirement.

## License

[MIT](LICENSE)
