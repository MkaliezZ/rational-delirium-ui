# RD v1.7.0 — Agent Skill Contract Design

PROJECT=RATIONAL_DELIRIUM
PHASE=V1_7_0_AGENT_SKILL_CONTRACT_DESIGN
STATUS=DESIGN_ONLY
BASE_COMMIT=b61ccb8ba6f63df76d336d29859f7d070164334e

This document defines the future contract between external agents
(Codex / Claude / Kimi / others) and a Rational Delirium Obsidian
vault. It is a DESIGN SPECIFICATION ONLY: no runtime, adapter,
automation, plugin change or semantic-graph change is created by
this phase, and no skill file is shipped yet.

Frozen contracts this design builds on without redefining them:

- [Collaborative Knowledge Workspace Design](RD_V1_4_0_COLLABORATIVE_KNOWLEDGE_WORKSPACE_DESIGN.md) — work products, review and decision records.
- [Agent Knowledge Workflow Design](RD_V1_5_0_AGENT_KNOWLEDGE_WORKFLOW_DESIGN.md) — agent roles, work products, evidence discipline.
- [Multi-device handoff protocol](RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md) — handoffs transfer work results, never permissions.
- [Graph presentation boundary](RD_V1_3_0_GRAPH_INTELLIGENCE_PRESENTATION_DESIGN.md) — visibility is not validation.

Design principles preserved throughout:

- **Knowledge ≠ Truth** — stored objects record claims and provenance.
- **Projection ≠ Authority** — appearing in the graph proves nothing.
- **Agent Contribution ≠ Human Decision** — proposals are inputs to Human judgment.
- **Relationship ≠ Confidence** — declared edges carry no weight.
- **Visibility ≠ Validation** — being shown in the UI is not endorsement.

```text
External Agent (Codex / Claude / Kimi / …)
        |  reads files, writes proposals & records (nothing else)
        v
RD Agent Skill Contract   (this document's future skill file)
        |
        v
Obsidian Vault            (KO Markdown + frontmatter, proposals, records)
        |
        v  read-only derived state
Rational Delirium Plugin  (projection + investigation UI)
        |
        v
Knowledge Object / Graph  (declared, governed representation)
```

Rational Delirium is NOT an agent platform, agent runtime, model
orchestration framework, or a replacement for any external agent.
It is a knowledge workspace where Humans and external agents
contribute while preserving provenance, history, traceability and
Human authority.

## 1. Purpose and Scope

External agents already can touch vault files with whatever
filesystem access their host grants them. Without a contract,
their contributions arrive unshaped: unmappable to objects,
untraceable to sources, indistinguishable from Human edits, and
prone to silently overwriting history. The Agent Skill Contract
exists so that an external agent working inside an RD vault
produces contributions the workspace can understand, inspect and
govern — provenance preserved, lineage intact, decisions Human.

**The skill defines agent behavior. The skill does NOT execute
agents.** It is guidance loaded by an external agent's host
(Codex, Claude, Kimi, any other); compliance is behavioral, not
enforced by RD. The skill teaches participation; it supplies no
security authority, and no runtime of any kind is created by it.

Scope of this phase: the contract's concepts — roles, vault
interaction rules, KO operation flow, proposal and contribution
record designs, async multi-agent model, authority boundary, and
the future skill file's structure. Out of scope: implementation of
any of it.

## 2. Agent Role Model

Agents are contributors. Agents are not knowledge authorities.
A role describes what a work product is for; it confers no
privilege, rank or standing trust — and the same external agent
may take different roles across different work products, while
independence requirements for review are per-submission
(v1.5.0 §2).

| Role | Responsibility | Allowed actions | Forbidden actions |
| --- | --- | --- | --- |
| Contributor | Submit attributable work products (observations, analyses, drafts) tied to exact objects and sources | read KOs; inspect provenance/lineage/relations; create proposal and contribution record files; cite evidence | edit KOs directly; approve anything; claim correctness; overwrite any record |
| Researcher | Collect and organize source material, record observations with acquisition context | everything Contributor allows; produce research artifacts with per-claim source attribution | fabricate sources or acquisition facts; expand scope unrequested; turn inference into source statements |
| Reviewer | Independently examine an exact proposal/revision and report findings | read the bound target and its evidence; create a review record with disposition/recommendation | edit the reviewed submission; approve or reject on the Human's behalf; let a favorable review auto-advance anything |
| Analyst | Compare claims, conditions and alternatives; label relationship hypotheses | produce analysis artifacts; propose candidate relations explicitly labeled as proposals | create graph edges silently; resolve conflicts; merge alternatives; rank by importance |

Common to all roles: identity is DECLARED by the record
(agent name, host, role), never authenticated by RD; a declared
identity grants nothing.

## 3. Vault Interaction Principles

How agents interact with the Obsidian vault, conceptually:

**Agents may:**

- **Read knowledge objects** — Markdown files with v1.1.0
  frontmatter; identity by exact `object_id`, never by
  title/filename guessing.
- **Inspect provenance** — the four declared layers and their
  references, as recorded.
- **Create proposals** — new, separately-filed proposal documents
  (see §5); a proposal is the ONLY shape in which an agent
  requests a knowledge change.
- **Add contribution records** — append-only records (see §6) that
  make who/what/why/evidence/when inspectable.

**Agents may NOT:**

- **Silently rewrite history** — no in-place edits to existing
  objects, records, reviews or decisions; corrections are new
  revisions with predecessor references (v1.1.0 §9).
- **Remove unknown information** — unknowns, dissent, unavailable
  material and gaps are content; an agent deleting what it does
  not understand is a contract violation.
- **Overwrite provenance** — provenance layers are declared by
  their authors; an agent may cite them, never rewrite them.
- **Claim correctness** — no truth assertions, confidence scores,
  rankings or "verified" labels in any agent-produced content.

File discipline: one canonical workspace, sequential writers per
artifact (v1.4.0 §1) — an agent never concurrently edits a file
another writer owns; asynchronous turn-taking replaces concurrent
editing (§7). All agent-written files live in designated areas
(proposals, records — see §9), never interleaved silently into
knowledge folders.

## 4. Knowledge Object Operation Contract

The lifecycle every agent follows when working on knowledge:

```text
Read:    Knowledge Object (exact object_id)
   ↓
Understand:
   identity    — declared id/kind/status/title
   provenance  — Observation → Evidence → Inference → Conclusion,
                 gaps as gaps
   lineage     — predecessor/successor, revises/supersedes
   relations   — declared edges, endpoints, unresolved states
   ↓
Create:  proposal (new file; §5) + contribution record (§6)
   ↓
Human review (independent review may precede; §7)
   ↓
Apply change — performed BY THE HUMAN, in Obsidian, through the
   workspace's normal editing practice: new object or revision
   with declared lineage, provenance and updated relations.
```

The agent does not directly become authority at any step: reading
and understanding are passive; the proposal is a request, not an
operation; the Human decision is the only advancement; and even a
Human decision record is history, not a standing permission
(v1.4.0 §5). Applying the change remains a Human act — the agent
may at most be asked by the Human to prepare the exact new
content, which the Human then places and records.

## 5. Proposal Format Design

A **proposal** is the single shape of an agent-requested knowledge
change. Conceptual contents (a semantic checklist, not a schema —
no frontmatter contract is fixed by this phase):

| Field | Meaning | Limit |
| --- | --- | --- |
| proposal id | Stable unique identifier for this proposal | minted once; revisions of a proposal are new proposals referencing the predecessor |
| author agent | Declared agent identity: name/host/role as recorded | declaration, not authentication; grants no authority |
| target object | Exact `object_id` (+ revision/digest where available) the change concerns | exact binding; a proposal without a resolvable target states that explicitly |
| requested change | What should change: new object, revision (revises/supersedes), relation addition, correction | described, not performed — the proposal contains no applied mutation |
| evidence | Sources and observations the change rests on, each attributed and acquired-context-labeled | inference labeled as inference; no laundered evidence (v1.5.0 §7) |
| timestamp | Recorded creation/submission time with its basis | unknown time stays unknown; recency never wins |
| reasoning / context | Why this change, what alternatives were considered, what remains unknown | dissent and rejected alternatives preserved, not averaged away |
| status | Draft → submitted → reviewed → accepted / rejected / superseded (conceptual) | a status record reflects recorded Human/review acts, never agent self-advancement |

Proposals are immutable once submitted; corrections are successor
proposals. A rejected proposal stays in history with its rejection
record — rejection is information too.

## 6. Contribution Record Design

Every agent work product is accompanied by a **contribution
record** — the traceability layer that answers, for any change or
proposal found in the vault:

| Question | Answered by |
| --- | --- |
| **Who proposed?** | The declared author identity (agent, host, role) and the work product it authored — declaration, not proof of personhood |
| **What changed?** | The exact target object/revision and the requested or recorded change, bound by digest where available |
| **Why?** | The reasoning/context field, including alternatives and unknowns |
| **Based on what evidence?** | The evidence references actually inspected, with acquisition context and limitations |
| **When?** | The recorded timestamp with its basis |

Records are append-only and never edited (corrections are new
records). They are history, not authority: a contribution record
proves a contribution happened, never that it was right. Multiple
records about the same object coexist; conflicting records are
both retained and surfaced for Human clarification (v1.4.0 §8) —
never reconciled by an agent.

## 7. Multi-Agent Async Collaboration Model

Asynchronous turn-taking, per artifact — never simultaneous
uncontrolled file editing:

```text
Agent A (researcher):  research work product
        ↓  new file, immutable once submitted
Proposal by A (or a synthesis across A and others)
        ↓
Agent B (reviewer):   review record bound to the exact
        ↓              proposal revision — B ≠ A's context;
                       independence declared or its absence stated
Human:                decision record (accept / reject / defer /
        ↓              request revision) — the only advancement
Applied change:       performed by the Human; resulting KO state
                      and lineage recorded; agents may then read
                      the new state and continue
```

Rules:

- Each step is a separate, attributable, immutable-on-submit file;
  sequential writers per file (v1.4.0 §1).
- Multiple parallel research threads may exist on the same
  question as separate files; they meet only in proposals or
  syntheses that cite every input and preserve disagreement.
- Reviews are per-revision: a new proposal version needs a fresh
  review bound to it; the author's claim that a finding was
  addressed is not the reviewer's verification (v1.4.0 §4).
- Conflicting review recommendations both travel to the Human —
  no vote, no averaging, no agent tiebreak.
- No step auto-advances: submission, review and decision are
  separately recorded acts with Humans at the decision point.

## 8. Human Authority Boundary

The Human remains the final authority at every advancement:

**Agents can:** suggest, analyze, propose, review (independently,
with declared independence), draft exact content for Human
placement, record their own contributions.

**Agents cannot:**

- **Approve themselves** — no agent decision record exists; the
  status "accepted" only ever reflects a recorded Human act.
- **Silently promote knowledge** — no agent edits object status,
  lifecycle fields, provenance or lineage; candidates become
  active only through the Human path (§4).
- **Establish truth** — no truth evaluation, confidence scoring,
  ranking, or "verified" styling anywhere in agent output; stored
  knowledge records claims, not certainties.

Silence, timeout, model confidence, review count and elapsed time
are never approval (v1.4.0 §5). A Human decision record binds its
exact scope and target revision; it is not a standing permission
for later revisions and never an execution credential.

## 9. Skill File Design

The future deliverable of this contract is a single skill document
an external agent's host can load, e.g. `rational-delirium-agent-skill.md`
(NOT created in this phase). Its structure:

| Section | Contents |
| --- | --- |
| Role | Which role(s) this invocation acts as, and the role table's boundaries |
| Workflow | The §4 operation flow, step by step, with the §7 async rules |
| File rules | Where agent-written files live (proposals / records areas), naming conventions, immutability-on-submit, sequential-writer discipline, never touching knowledge folders directly |
| Proposal rules | The §5 conceptual fields as a completion checklist; exact-target binding; evidence discipline |
| Evidence requirements | Per-claim attribution, acquisition context, labeled inference, unknowns kept unknown (v1.5.0 §7) |
| Forbidden list | §3/§8 prohibitions verbatim: no rewrites, no deletions of unknowns, no provenance overwrites, no correctness claims, no self-approval |
| Authority statement | "You are a contributor. Decisions are Human. Nothing here grants you permission." |

The skill is guidance for the agent's host, versioned with the
contract; it executes nothing and enforces nothing — an external
host's filesystem capabilities are a deployment concern outside
this design (v1.5.0 §11).

## 10. Non Goals

Explicitly excluded from this contract and any implementation of
it:

- **Agent runtime** — RD never runs, schedules or calls agents.
- **Model hosting** — no model selection, API keys or inference in
  RD.
- **Adapter layer** — no RD-side code mediating agent access;
  agents and their hosts read/write files directly under their own
  access controls.
- **Execution engine** — proposals are never auto-applied.
- **Automatic knowledge approval** — no heuristic, quorum or
  confidence path to acceptance.
- **Automatic truth evaluation** — no scoring, ranking or
  verification of knowledge content.
- Chat interfaces, agent personas in the plugin UI, background
  watchers, or any mutation path beyond the Human's own editing.

---

## Document Validation

| Check | Result |
| --- | --- |
| 10 required sections present | PASS — §1 Purpose/Scope … §10 Non Goals, in required order |
| Skill boundary stated | PASS — §1: the skill defines agent behavior, never executes agents; §9: guidance for the host |
| Agent role model with responsibility/allowed/forbidden | PASS — §2 four roles; agents are contributors, never authorities |
| Proposal concept | PASS — §5 eight conceptual fields; design only, no schema fixed |
| Contribution concept | PASS — §6 answers who/what/why/evidence/when; append-only, history-not-authority |
| Human authority boundary | PASS — §8 can/cannot lists; silence is never approval |
| Multi-agent async model | PASS — §7 turn-taking; no simultaneous uncontrolled editing |
| Non-goals enumerated | PASS — §10 seven exclusions |
| Design principles preserved | PASS — header: Knowledge ≠ Truth, Projection ≠ Authority, Agent Contribution ≠ Human Decision, Relationship ≠ Confidence, Visibility ≠ Validation |
| Design-only scope | PASS — one markdown document; no code, plugin, schema or runtime changes |

These are author design-consistency checks, not an independent
review.

DESIGN_VALIDATION=PASS
RUNTIME_IMPLEMENTED=false
CODE_CHANGED=false
STOP_AFTER_DOCUMENT_COMPLETION=true
