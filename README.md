# Rational Delirium

A Human-guided knowledge workspace for [Obsidian](https://obsidian.md).

Rational Delirium helps people use AI agents for research and knowledge work while keeping human judgment, decisions, and history visible. It records what an agent suggested, what a person approved, and how knowledge changed over time.

Rational Delirium is **not** an agent platform, **not** an agent runtime, and **not** an autonomous AI system.

It is:

- an Obsidian plugin for knowledge exploration and workflow visibility;
- an Agent Skill contract that guides external agents;
- a human-controlled workflow connecting proposals, decisions, and contribution records.

External agents propose. Humans decide. RD displays the history.

[简体中文](README_zh-CN.md)

## Why Rational Delirium?

AI agents can help with research, analysis, and knowledge organization. However, useful work also needs:

- clear reasoning history;
- visible human decisions;
- separation between suggestions and accepted changes;
- records of what actually happened.

Rational Delirium provides that layer inside Obsidian.

## Screenshots

*(placeholders — real screenshots coming)*

| Knowledge Workspace | Semantic Graph |
| --- | --- |
| ![Workspace](docs/images/01-workspace.png) | ![Graph](docs/images/02-graph.png) |

| Collaboration Surface | Human Decision | Contribution Record |
| --- | --- | --- |
| ![Collaboration](docs/images/03-collaboration.png) | ![Decision](docs/images/04-human-decision.png) | ![Contribution](docs/images/05-contribution-record.png) |

## How It Works

```text
External Agent
      |
      v
RD Skill Contract
      |
      v
Proposal
      |
      v
Human Decision
      |
      v
External Agent executes approved scope
      |
      v
Contribution Record
      |
      v
Rational Delirium displays the history
```

A proposal is not an action. An approval is not a truth judgment. A contribution record describes an event, not correctness.

## Architecture Overview

```text
Knowledge Objects (KO)
        |
        v
Read-only semantic projection
        |
        v
Rational Delirium Plugin
        |
        +---- Knowledge Workspace
        +---- Graph Visualization
        +---- Collaboration Surface
        +---- Human Decision Recording

External agents interact through artifacts:
.proposals/
.contributions/
```

Knowledge Object (KO) means a note or artifact with identity, provenance, and relationships.

## Core Features

- **Knowledge Workspace** — explore identity, provenance, lineage, relations, and context.
- **Semantic Graph Projection** — deterministic read-only graph projection from declared relationships.
- **Collaboration Surface** — view proposals, decisions, and contribution history.
- **Human Decision Recording** — explicit approval or rejection of pending proposals.
- **Agent Skill Contract** — guidance for external agents: propose, wait, execute approved scope, record.
- **Theme System** — Rational Archive visual language with semantic UI tokens.

## Design Principles

- **Knowledge ≠ Truth** — stored objects record claims and provenance.
- **Projection ≠ Authority** — appearing in a graph does not prove correctness.
- **Agent Contribution ≠ Human Decision** — agent output is input for human judgment.
- **Relationship ≠ Confidence** — declared relations carry no score or weight.
- **Visibility ≠ Validation** — being displayed is not endorsement.

No truth scores, confidence meters, rankings, or automatic merging.

## 5-Minute Quick Start

### For Obsidian users

1. Install Rational Delirium into your Obsidian vault.
2. Enable the plugin in Obsidian settings.
3. Open the Rational Delirium workspace.
4. Explore knowledge objects, relations, and workflow records.

### For developers building from source

```bash
git clone https://github.com/MkaliezZ/rational-delirium-ui
cd rational-delirium-ui
npm ci
npm run build
```

Copy the generated plugin files into:

```text
<vault>/.obsidian/plugins/rational-delirium/
```

## Agent Workflow Example

1. Agent reads the RD Skill.
2. Agent inspects knowledge objects.
3. Agent creates a Proposal.
4. Human approves or rejects in Obsidian.
5. Agent performs only the approved action outside RD.
6. Agent creates a Contribution Record.
7. RD displays the complete chain.

Example:

```text
Proposal:
ADD_RELATION — Evidence supports Hypothesis

Decision:
Approved by Human

Execution:
External Agent performs approved scope

Record:
Contribution Record stores provenance
```

## Current Status — FROZEN

Development is paused after validation milestones.

| Milestone | Status |
| --- | --- |
| v1.9 Agent Skill Workflow Validation | FROZEN |
| v1.10 Real Agent Usage Validation (DSH 5/5 PASS) | PASSED |

Validation at freeze:

- 434/434 tests
- TypeScript check clean
- Build pass

## Limitations

Rational Delirium intentionally does not:

- run or schedule agents;
- call AI models;
- replace human decisions;
- automatically organize your vault;
- automatically validate truth;
- perform autonomous vault changes.

Development resumes only from real usage feedback, clear user pain points, or concrete validation needs.

## License

[MIT](LICENSE)
