# Rational Delirium — v0.8 Multi-Device Agent Handoff Protocol Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_8_0_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN
STATUS=DESIGN_ONLY — NO IMPLEMENTATION
BASE=af2c1b5b190add44daf9578406244ac8afb7d3bd
LICENSE=MIT
PREDECESSORS:
  docs/RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md   (workflow contract)
  docs/RD_V0_7_MULTI_AGENT_WORKFLOW_MVP_DESIGN.md   (multi-Agent model)
  docs/RD_V0_7_5_RUNTIME_EVIDENCE_PACKAGE.md       (evidence discipline)
SUPPORTED_MUTATION=APPEND_EXISTING_NOTE (unchanged)
```

---

## 1. Purpose

### The missing capability

Through v0.7, every validated workflow ran inside one trust
envelope: one sandbox, one handoff channel, or one machine. Real
knowledge work does not look like that. The realistic shape —
already the de-facto development pattern of this very project — is:

```text
ONE canonical shared workflow workspace (logical)
   replicated between devices
        │
Windows:          Research Agent (any vendor) writes research
                   artifacts INTO the workspace
        │
        │  sync (transport-neutral)
        ▼
macOS:            Review Agent reads THE SAME authoritative
                   artifacts in the SAME logical workspace,
                   ADDS review artifacts beside them
        │
        │  sync
        ▼
Windows:          Research Agent reads THE SAME review artifacts,
                   ADDS successor revision artifacts (r2, r3…)
        │
        ▼
Human:            explicit decision on one exact package
                  (aided by a decision-context handoff that
                   assembles the historical references —
                   a presentation input, never an approval)
        │
        ▼
Executor env:     Bridge Adapter → Bridge validation →
                   Mutation Gate → Vault append → Audit
        │
        ▼
Knowledge System: read-only presentation
```

Agents exchange **workflow stage/ownership**, not copied
authoritative files. The earlier explicit copy/export pattern
(export artifacts on one device, import into a separate private
workspace on another) remains a supported **fallback / offline
transport scenario** — it is not the primary model and must be
labeled as such wherever it appears (see §1.1).

When work crosses a **device boundary**, four things become fragile
unless made explicit:

1. **Evidence boundaries** — which claims survived the hop, with
   which provenance and which declared unknowns.
2. **Identity separation** — who authored, who reviewed, who
   approved, who executed; on which machine context.
3. **Approval separation** — a cross-device record must never be
   mistakable for an approval artifact.
4. **Execution separation** — nothing that travels between devices
   is an execution instruction; execution remains exclusively
   behind the Bridge/Mutation Gate on the executing machine.

v0.8 defines the protocol that makes these four separations
explicit, machine-checkable where deterministic, and honest where
not.

### 1.1 CANONICAL_SHARED_WORKSPACE_PRINCIPLE (primary model)

**Definition.** A `workflow_run` has exactly ONE canonical logical
workspace. Different devices may expose that workspace at different
local filesystem paths — e.g. `F:\RD-Work\RUN-0001` on Windows and
`~/RD-Work/RUN-0001` on macOS are different local paths over the
SAME logical synchronized workspace. All authoritative workflow
artifacts live in that one logical workspace.

**The invariant** (what "same workspace" means):

```text
SAME LOGICAL WORKSPACE
+ SAME AUTHORITATIVE ARTIFACT SET
+ SYNCED BETWEEN DEVICES
```

This does NOT claim one physical filesystem: local paths differ,
and synchronization is eventually consistent. The protocol is
transport-neutral — Syncthing is the *current deployment
transport*, not RD protocol authority; a shared filesystem or
explicit transfer may serve as transport without changing any rule.

**Primary workflow rules.**

| # | Rule |
|---|---|
| W1 | **One canonical workspace** — one workflow_run → one logical workspace holding all authoritative artifacts. |
| W2 | **Same authoritative artifacts** — every participating Agent consumes the same authoritative artifacts after synchronization; an Agent MUST NOT copy authoritative inputs into a separate private directory and treat the copies as the new authoritative source. |
| W3 | **In-place review** — a Review Agent reads existing Research artifacts in the canonical workspace, MUST NOT modify them, and creates NEW Review artifacts beside them in the same workspace. |
| W4 | **Append-by-succession** — responding to REVISION_REQUIRED, the Research Agent reads the Review artifacts in the same workspace, MUST NOT overwrite submitted r1, and creates r2 as a new successor artifact with correct `revision_reference` / `input_references`. |
| W5 | **Sequential writer** — at any workflow stage exactly one role/device is the active writer of newly-created artifacts; others read synchronized authoritative artifacts; simultaneous conflicting mutation of the same authoritative artifact is prohibited. This is a workflow/Skill discipline — no distributed lock runtime is created by this design. |
| W6 | **Handoff is logical, not transport** — a handoff artifact means "this work product is ready for the next workflow role", never "copy these files to another private workspace". Transport (sync, shared FS, explicit transfer) does not change artifact authority. |
| W7 | **Shared workspace is primary** — the canonical shared workspace is THE primary RD multi-device workflow model; explicit file copy/export is a supported fallback/offline scenario and must be labeled as such. |

**Canonical workspace layout (illustrative).**

```text
<logical-workspace>/RUN-0001/
├── case/                      # source artifacts
├── workflow/
│   ├── research-r1.md         + handoff-research-r1.md   (Windows Research)
│   ├── review-r1.md           + handoff-review-r1.md     (macOS Review, added beside)
│   ├── revision-response-r2.md + research-r2.md + handoff-research-r2.md
│   └── …                      (successors; nothing above is ever overwritten)
```

### 1.2 Explicit-transfer fallback (reclassified evidence)

The v0.8.2A/v0.8.2B trial used explicit copy/export between
separate device sandboxes. That trial remains valid evidence —
**for the fallback scenario**:

```text
V0_8_2A_B_EXPLICIT_TRANSFER_HANDOFF=VALIDATED_AS_FALLBACK_SCENARIO
PRIMARY_SHARED_WORKSPACE_WORKFLOW_VALIDATED=false
```

It demonstrated: cross-device explicit file transfer; external
Agent Skill consumption; independent review; provenance/unknown/
dissent preservation; no authority leakage. It did NOT
demonstrate: same-canonical-workspace collaboration or sequential
multi-device in-place workflow. The primary model awaits its own
trial; nothing here overclaims it.

### What this is NOT

- **Not an Agent runtime.** Rational Delirium does not host, spawn,
  schedule, or orchestrate Agents. Agents are execution hosts
  (any coding assistant, research assistant, or agent framework);
  Rational Delirium provides Skill packages, workflow definitions,
  handoff protocols, and approval/mutation boundaries.
- **Not an autonomous multi-Agent system.** No Agent-to-Agent
  authority transfer exists or is enabled by this design.
- **Not a distributed AI organization.** There is no voting,
  consensus, leader election, or emergent decision making.
- **Not approval automation.** The Human approval boundary is
  unchanged and non-negotiable.

### Implementation priority rule (binding for all of v0.8)

Before any code is proposed, the question is asked: *can this
behavior be represented as (A) a Skill Package, (B) a Workflow
Template, (C) a Protocol Document, or (D) a Schema?* If yes, it is
implemented as that artifact — **not** as runtime code.

Runtime code is reserved **only for deterministic enforcement**:

| Allowed runtime responsibilities | Forbidden runtime responsibilities |
|---|---|
| identity verification | reasoning behavior |
| cryptographic binding | research strategy |
| filesystem mutation control | review methodology |
| concurrency control | synthesis logic |
| state integrity | agent personality |
| audit recording | decision making |

Everything in this design document lands in categories A–D. The
only future code implied by v0.8 is schema *validation* and digest
*computation* — both deterministic, both inside the existing
mutation-gate/ package's spirit, and none of it written in this
phase.

---

## 2. Architectural Philosophy

> **Agents transfer work results, never permissions.**

A handoff package is evidence in transit. It may be large (full
research threads) or small (a review verdict), but it is always
*data about work*, never *authority to act*.

### Agent output CAN contain

- **observations** — what was directly seen, under which conditions
- **evidence** — source references, excerpts, artifact ids,
  acquisition context
- **analysis** — labeled inference, explicitly marked as Agent-generated
- **assumptions** — declared, unhidden
- **unknowns** — explicitly flagged values (`unknown`,
  `unavailable`, `not performed` stay distinct)
- **disagreement** — dissent preserved verbatim, never averaged away

### Agent output CANNOT contain

- **execution authority** — no field, seal, or wording in a handoff
  authorizes a mutation
- **mutation permission** — the only mutation permission is a
  Permit issued by the trusted signing path on the executing
  machine, after a Human decision
- **approval authority** — no cross-device artifact is an approval;
  the Human decides at the decision point, and approval artifacts
  never travel inside handoff packages

Consequences of this philosophy:

- Losing, copying, leaking, or forging a handoff package **cannot**
  grant write access. The worst case is evidence contamination,
  which review and the Human's inspection are responsible for
  judging.
- Any handoff package that contains an approval, permit, signature,
  or "authorized" field is **malformed by definition**; receiving
  Agents reject it and report. (Approval *references as historical
  context* — pointers to where a decision record lives — are the
  only approval-related content a handoff may carry, and they never
  carry the decision itself.)
- A receiving Agent's first duty is fidelity: preserve the bytes,
  labels, unknowns, and dissent of what it received; never silently
  normalize, summarize away, or "helpfully" restructure content whose
  exact form is part of the evidence.

---

## 3. System Layers

Eight layers, each with one responsibility. No layer absorbs
another's role; every cross-device hop stays inside its layer.

```text
┌─────────────────────────────────────────────────────────────┐
│ Skill Layer      Agent behavior guidance (vendor-neutral)   │
│                 "how to act inside a role"                  │
├─────────────────────────────────────────────────────────────┤
│ Workflow Layer   Process definition (lifecycle states)      │
│                 "which step comes next"                     │
├─────────────────────────────────────────────────────────────┤
│ Handoff Layer    Evidence transfer (this design)            │
│                 "how work products move between Agents      │
│                  and devices without moving authority"      │
├─────────────────────────────────────────────────────────────┤
│ Approval Layer   Human decision (single, explicit, exact)   │
│                 "one operation, one Human, one decision"    │
├─────────────────────────────────────────────────────────────┤
│ Bridge Layer     Execution admission                        │
│                 "is this writer allowed on this note now"   │
├─────────────────────────────────────────────────────────────┤
│ Mutation Gate    Controlled mutation                        │
│                 "byte-exact, exactly-once, audited append"  │
├─────────────────────────────────────────────────────────────┤
│ Audit Layer      Execution record                           │
│                 "what actually happened, with per-record    │
│                  digest verification"                       │
├─────────────────────────────────────────────────────────────┤
│ Knowledge Layer  Stored information + read-only display     │
└─────────────────────────────────────────────────────────────┘
```

The Handoff Layer (v0.8's subject) touches only its neighbors: it
consumes Skill-shaped work products and feeds Workflow steps. It
has **no connection** to the Approval, Bridge, Gate, Audit, or
Knowledge layers — that disconnection *is* the security property.

---

## 4. Multi-Device Identity Model

### The five identities

| Identity | What it is | Established by |
|---|---|---|
| **Research Identity** | The Agent-context that produced a research thread | Declared in the handoff; honesty is a workflow obligation, not a cryptographic fact (see limits) |
| **Review Identity** | The Agent-context that inspected an exact digest | Declared + independence statement (distinct session/context from the author) |
| **Synthesis Identity** | The Agent-context that merged threads into one draft | Declared |
| **Approval Identity** | The Human (or Human-delegated signing identity) that decided | The trusted signing path on the executing machine — never a handoff field |
| **Executor Identity** | The verified runtime that performs the mutation | Platform-detected Bridge writer identity + Permit's selected executor — never a product label |

### Rules

1. **Agent name is not authority.** A handoff that says "produced
   by <famous model>" carries zero additional trust. Product
   reputation is not a credential.
2. **Device identity is not approval.** Knowing which machine a
   package came from says nothing about whether a Human approved
   anything. Approval exists only in the Approval Layer's own
   artifacts.
3. **Previous execution does not grant future permission.** An
   Agent-context that successfully participated in one workflow
   gains no standing in the next. Every operation starts from zero
   authority.
4. **Review identity cannot become approval identity.** No matter
   how many reviews accumulate, they remain recommendations. The
   transformation "enough reviews → approval" does not exist in
   this system.
5. **Identity claims in handoffs are declared, not proven.** The
   protocol does not cryptographically authenticate which Agent on
   which device created a package (that is a documented limitation,
   §8 Case D). What the protocol *does* enforce: identity fields
   are recorded, separation is visible, and no identity claim ever
   maps to permission.

---

## 5. Handoff Package Protocol

Vendor-neutral schema. The package is a semantic record — file,
message, or paste; transport chooses nothing about meaning.

A handoff is a **logical workflow transition**: it declares "this
work product, in the canonical shared workspace, is ready for the
next role" (W6). It is NOT a transport instruction — it never
means "copy these files to another private workspace", and
transport (sync / shared FS / explicit transfer as fallback) never
changes artifact authority. The handoff identifies exact existing
work products and lineage inside the one canonical logical
workflow; its `handoff_id` lives in that workspace alongside the
artifacts it names.

### Field specification

| Field | Purpose | Required | Notes |
|---|---|---|---|
| `protocol_version` | Which contract this package follows | ✔ | Unknown versions are reported, never guessed-compatible |
| `handoff_id` | Stable unique id for this package | ✔ | Collision-free within a workflow's lifetime |
| `handoff_type` | Semantics of the transfer | ✔ | Enum: `research-thread` \| `proposal-for-review` \| `synthesis-inputs` \| `review-record` \| `decision-context` \| `outcome-report` |
| `creator_identity` | Declared producing identity + device context | ✔ | Role + context statement; a declaration, not a proof |
| `receiver_identity` | Declared intended consuming role | ✖ | Optional routing hint; absence means "workflow decides" |
| `timestamp` | Creation time (UTC, ISO-8601) | ✔ | Freshness is judged by receivers; staleness alone is not invalidity |
| `work_product_reference` | Typed reference to THE work product this package carries | ✔ | Structure: `{ kind, id, digest? }` where kind ∈ `proposal` \| `review` \| `synthesis` \| `evidence` \| `decision-context`. One primary work product per package; auxiliary material goes in the other reference fields. `decision-context` = an informational work product assembled for Human consideration, containing references to reviewed workflow state and proposed exact operation details, but containing no approval or execution authority (not a decision record, not a Permit, not an Execution Request). **`handoff_type` and `work_product_reference.kind` are separate concepts** — handoff_type describes WHY/WHERE the package is moving in the workflow; kind describes WHAT primary work product it carries. Their values must never be mechanically assumed identical (e.g. `handoff_type=decision-context` does not by itself dictate any particular kind; the kind must describe the actual carried product truthfully) |
| `proposal_reference` | proposal_id + revision + exact digest | type-dependent | Required when `work_product_reference.kind = proposal` or the package discusses a specific proposal |
| `evidence_reference` | Source refs, excerpts/artifact ids, acquisition context | type-dependent | Research threads and proposals carry it; per-claim mapping preserved |
| `source_information` | Vault context + note path + observed base hash + observation time | type-dependent | The "where/when" of the knowledge state the work assumed |
| `assumptions` | Declared assumptions of the analysis | ✔ (may be empty list) | Empty is a claim ("none declared"), not an omission |
| `unknowns` | Explicit unknown/unavailable/not-performed flags | ✔ (may be empty list) | The three values stay distinct; they never collapse |
| `dissent` | Preserved disagreements, verbatim | ✔ (may be "none recorded") | Never summarized or merged away |
| `revision_reference` | Successor→predecessor revision link (SAME work product line) | ✖ | Present on revision successors only: r2 → r1/D1. This is supersedence lineage (§7), distinct from input lineage |
| `input_references` | Synthesis/input lineage (MULTIPLE prior work products CONSUMED to produce this one) | ✖ | A list of `{ kind, handoff_id, digest? }` entries. Required for `synthesis-inputs` packages (the threads merged); usable wherever a package builds on prior independent work products. Multi-input lineage is exactly this list — no ordering, no merge semantics, no conflict resolution implied |
| `payload_reference` | Exact-byte artifact ref + byte length + payload SHA-256 | type-dependent | Required whenever a payload exists; computed values only — an invented digest is a protocol violation |

### Handoff vs Execution Request — hard boundary

A **Handoff** moves work results (evidence) between Agents and
devices. An **Execution Request** is an **execution-layer
artifact**, created only *after* independent Human approval and the
runtime checks of the trusted signing path, and consumed by the
Bridge Adapter / Mutation Gate on the executing machine. The two
never merge:

| | Handoff package | Execution Request |
|---|---|---|
| Layer | Handoff layer (evidence transfer) | Execution layer (post-approval) |
| Created by | Any Agent, any time | Trusted signing path, only after Human approval + runtime checks |
| May contain | evidence references, proposal references, review references, approval references **as historical context** (pointers to where a decision record lives, never the decision itself) | the Permit, bindings, and the executor-facing request |
| May NOT contain | permit, signature, lease, execution authority, mutation permission | (its own layer defines its contents) |
| Triggers execution? | **Never.** Handoff does not trigger execution — receiving a handoff grants nothing and starts nothing | This is the only artifact that initiates the execution path |

The former `executor-request` handoff type is **removed**. The
non-authoritative replacement is `decision-context`: a package
that assembles the historical references (proposal, review, prior
decision records as context pointers) an Approval Assistant
presents to the Human. It is an input to a Human decision moment —
it is never a record of a decision and never an instruction to any
executor. The decision-context WORK PRODUCT carried by such a
package is itself an informational assembly (kind =
`decision-context`): references to reviewed workflow state and the
proposed exact operation, with no approval or execution authority.
Do not classify it as `evidence` — evidence is source material
about the world with acquisition provenance; a decision-context is
a derived presentation about workflow state. Do not classify it as
`synthesis` — synthesis is the Synthesis Agent's merged research
draft; a decision-context is the Approval Assistant's presentation
of already-reviewed state. Role clarity is part of the taxonomy.

### Prohibited fields (schema-level invariant)

The schema has **no** fields for: approval, permit, signature,
executor eligibility, lease, or write authority. Validators (future,
deterministic) reject any package carrying such fields — the
malformed-package rule of §2 made mechanical.

### Validation rules (deterministic, future implementation boundary)

- required fields present and well-typed
- `protocol_version` recognized
- digest fields, when present, are real SHA-256 values (64 hex)
- `handoff_type` matches the field pattern for that type
- no prohibited fields

Validation verifies **shape and binding**, never content truth.
A perfectly valid package can still contain wrong analysis — that
is what review and the Human are for.

### Digest claim precision

A digest in this protocol verifies **consistency between the
covered objects and the recorded digest when both are available**.
That is the entire guarantee. Digest verification does **not**
prove:

- original source authenticity (who really produced the bytes),
- complete tamper detection (uncovered fields and unreferenced
  content are outside coverage),
- historical immutability (a consistent digest now says nothing
  about what happened before recording),
- provenance or truthfulness of the content.

Receivers use digests as *consistency checks on available pairs*,
never as authenticity verdicts.

---

## 6. Skill Package Boundary (design specifications)

Per the implementation priority rule, each multi-device role is
best represented as a **Skill Package** (category A), not code.
Specifications below; implementation (markdown packages, like
`skills/rd-workflow/`) belongs to a later phase.

### 6.1 `skills/research-agent/`

| CAN | CANNOT |
|---|---|
| Collect information through authorized read paths | Approve anything |
| Organize evidence with per-claim provenance | Execute mutations |
| Create proposal drafts (template-conformant) | Certify inference as fact |
| Declare assumptions, unknowns, open questions | Fabricate citations or hashes |
| Package a `research-thread` handoff | Insert authority fields |

Contents (prospective): instructions for evidence collection and
provenance labeling; the proposal template (exists in
`skills/rd-workflow/templates/`); handoff packaging guidance for
type `research-thread`; examples (fictional).

### 6.2 `skills/review-agent/`

| CAN | CANNOT |
|---|---|
| Inspect evidence for an exact proposal digest | Approve its own work (or any work) |
| Identify gaps, contradictions, unverifiable claims | Edit the proposal under review |
| Request revision with blocking findings | Resolve its own blockers unilaterally |
| Produce a `review-record` handoff with recommendation | Convert recommendation into approval language |
| Declare independence context honestly | Review a draft it authored (context separation rule) |

Contents (prospective): review checklist (exists in
`skills/rd-workflow/review-guides/`); review template (exists);
independence-statement guidance; multi-device verification steps
("how to check sources you can reach; how to declare ones you
cannot").

### 6.3 `skills/synthesis-agent/`

| CAN | CANNOT |
|---|---|
| Combine multiple research threads into one draft | Decide truth between conflicting threads |
| Preserve disagreement verbatim in the merged output | Drop dissent to produce "one clean story" |
| Label conflicts instead of resolving them | Upgrade inference to fact during merging |
| Declare which threads agreed/disagreed where | Grant any permission |

Contents (prospective): merge guidance; dissent-preservation
checklist; conflict-labeling conventions; the
`synthesis-inputs` handoff packaging guidance.

### 6.4 `skills/handoff-agent/`

| CAN | CANNOT |
|---|---|
| Package work products into conformant handoff records | Grant permission (or imply it by packaging) |
| Validate required fields are present and well-formed | Compute or "fix" digests it did not observe |
| Verify digest formats and lineage references | Judge content truth |
| Declare a package malformed (prohibited fields, broken lineage) | Repair a malformed package silently |

Contents (prospective): the §5 schema as guidance; field-by-field
checklist; malformed-package reporting guidance. This skill is the
human-readable mirror of the future deterministic validator — the
skill teaches Agents to do by guidance what the validator will
later enforce mechanically.

### Boundary justification

All four packages contain only behavior guidance, templates, and
examples (categories A/B/C). Their subject matter — how to
research, review, merge, package — is exactly the forbidden
runtime territory (reasoning strategy, review methodology,
synthesis logic). No runtime code is specified for any of them.

---

## 7. Revision and Provenance Model

### The revision chain

```text
Proposal r1 (digest D1)
   │  submitted for review → immutable
   ▼
Review record R1 (binds D1; findings; request changes)
   │  author responds — r1 is never edited
   ▼
Proposal r2 (digest D2; revision_reference → r1/D1; supersedes note)
   │  fresh independent review required
   ▼
Review record R2 (binds D2) → … → Human decides on some rN
```

### Rules

1. **Never overwrite history.** Submitted revisions are immutable;
   correction is succession, not edit. Every rN remains exactly as
   submitted, forever inspectable — in place, in the canonical
   workspace (W4: a responding author reads the review artifacts
   beside r1 and creates r2 as a NEW artifact; r1's bytes never
   change under any workflow operation).
2. **Preserve the predecessor reference.** Each successor carries
   `revision_reference` (what it supersedes + why). A revision
   without lineage is a new proposal, not a successor.
3. **Preserve disagreement.** If R1 dissented and r2 accommodated
   it, r2 says so; if r2 rejected the dissent, the dissent still
   travels forward verbatim to the Human.
4. **Preserve unknowns.** Unknowns declared at r1 either resolve
   (recorded how) or persist (still declared) at r2. Unknowns may
   never silently disappear across a revision.
5. **Approval binds one digest.** A Human decision on r2 authorizes
   D2 only — never r1, never "r2 and minor edits", never r3.

### Provenance chain

Handoff lineage composes: research-thread → synthesis-inputs →
proposal-for-review → review-record → decision-context →
outcome-report. Each link's `revision_reference` (supersedence) and
`input_references` (consumed work products) let any later reader
reconstruct the full path from outcome back to original
observations — the multi-device equivalent of the audit chain, and
subject to the same honesty discipline: the chain records what
happened, not what should have happened.

Two distinct lineage kinds, never conflated:

- **`revision_reference`** — same-line succession: r2 supersedes r1
  (one predecessor, supersedence semantics, §7 rules).
- **`input_references`** — multi-input consumption: a synthesis
  product lists every thread it merged (N predecessors, no
  supersedence — the inputs remain valid independent work
  products). A revision of a synthesis product carries BOTH: the
  revision link to its own predecessor revision, and the input
  links to the threads consumed.

---

## 8. Multi-Device Failure Cases

| Case | Scenario | Detection | Response | Prohibited automatic behavior |
|---|---|---|---|---|
| **A — Delayed handoff** | A research thread arrives hours/days after creation; the note it based its `source_information` on has since changed | Receiver compares `source_information.base hash + timestamp` against current state at consumption time | Receiver marks freshness risk in its own output; if a proposal is built on it, the proposal's base must be re-observed at drafting time anyway (Gate re-checks at execution) | No auto-refresh of the thread's hashes by the receiver (that would fabricate observation); no discarding the thread merely for age |
| **B — Modified artifact** | A handoff's payload/digest does not match its `payload_reference`, or content was altered in transit/storage | Deterministic: recompute payload SHA-256, compare with recorded digest; lineage breaks are visible | Receiver marks the package digest-inconsistent, reports, and refuses to build on it (a matching digest would still not prove authenticity — see §5 digest precision) | No silent repair; no "re-digest the new content and continue"; no assuming the modification was benign |
| **C — Conflicting revisions** | Two successor proposals both claim to supersede r1; or two review records disagree about the same digest | Lineage comparison; both carry `revision_reference → r1/D1` | Both remain valid separate branches; each needs its own review path; the Human sees both and the conflict — the v0.7 disagreement rule extended to revisions | No auto-merge of branches; no "latest wins"; no Agent picking the valid branch |
| **D — Unknown identity** | A package's `creator_identity` cannot be corroborated, or two packages claim contradictory origins | Honesty-level: the protocol records declared identities; it does not authenticate them (documented limitation) | Receiver declares the uncorroborated identity in its output; the Human weighs it; approval never depends on Agent identity claims anyway | No identity "inference" from writing style or metadata; no refusing review solely on unverifiable identity (the work is judged as work); no treating a verified-looking identity as authority |
| **E — Stale approval reference** | An `decision-context` handoff references a decision record that predates a base change, or (execution-layer side) a Permit whose `base_sha256` no longer matches the note | Deterministic at the Gate: stale-base rejection; at packaging: context-reference → digest binding check | Back to Case-A-style successor: new observation → new proposal → fresh review → new decision. The earlier Permit is not "re-used" | No automatic re-approval; no patching the old Permit; no executor substitution to force success (frozen v0.5.x rules) |
| **F — Network interruption** | A handoff never arrives, or arrives truncated; an outcome report is lost after execution | Missing lineage links; truncated packages fail deterministic validation | Missing handoff: report "not received", re-request from the source Agent (it still holds its work); lost outcome report: the executing side's **Audit layer** remains the authoritative record — request the audit reference again | No re-execution because a report was lost (audit is the truth, reports are views); no accepting a truncated package; no inferring content of unreceived packages |

### Sequential writer discipline (W5)

Multi-device does NOT mean concurrent uncontrolled writers. The
preferred pattern:

```text
Agent A completes its artifacts → sync reaches the other device →
Agent B consumes them → Agent B adds its own artifacts → sync back
```

At any workflow stage, one role/device is the active writer for
newly-created artifacts; the others read synchronized authoritative
artifacts. Two Agents simultaneously mutating the SAME
authoritative artifact is prohibited — this is a workflow/Skill
discipline enforced by honest behavior and review, NOT by a new
distributed lock service (none is created here). The frozen
deterministic concurrency boundaries (Mutation Gate admission,
Bridge writer rules) remain the enforcement points where execution
actually happens; nothing in this section modifies them.

Global rule across all cases: **detection is deterministic where
digests and lineage exist; response is always "surface and stop or
surface and continue-with-declared-risk"; authority-repairing
automation does not exist.**

---

## 9. Relationship With Existing Components

| Component | Relationship to v0.8 |
|---|---|
| **Skill** (`skills/`) | Guides Agent behavior. v0.8 adds four prospective skill packages (§6) that teach the roles the handoff protocol assumes. Skills remain guidance only — never a security boundary. |
| **Workflow** (v0.6/v0.7 designs) | Defines the process whose steps exchange handoffs. v0.8's `handoff_type` enum maps 1:1 onto workflow transitions; no lifecycle state is added or changed. |
| **Handoff** (this design) | Moves evidence between Agents and devices. Strictly between Skill and Workflow layers; zero connection to Approval/Bridge/Gate/Audit — the gap *is* the boundary. |
| **Approval** | Human decision, unchanged. v0.8 explicitly forbids approval semantics in transit; decision packages are *inputs to* a Human moment, never records of one. |
| **Bridge** | Checks execution eligibility (lease/writer/expiry/sync) on the executing machine. Handoffs do not interact with it; only the post-approval **Execution Request** (an execution-layer artifact, not a handoff type) does, via the frozen v0.5.1 Adapter. |
| **Mutation Gate** | Performs the controlled mutation. Unchanged; the only writer. Digest discipline in handoffs mirrors the Gate's digest discipline so proposal-byte consistency is checkable across the multi-device hop (with the §5 digest precision limits). |
| **Audit** | Records execution facts with per-record digest verification. Remains the single authoritative execution record; multi-device outcome *reports* are views of it, never replacements. |

---

## 10. MVP Scope

### v0.8.0 includes (this design)

```text
YES:
- protocol design (this document)
- handoff schema definition (§5, with prohibited-field invariant)
- five-identity model (§4)
- skill boundary specifications for four packages (§6)
- revision/provenance model (§7)
- six multi-device failure cases (§8)
```

### v0.8.0 excludes

```text
NO:
- Agent runtime                    (agents are hosts, not built here)
- distributed database             (handoffs are files/records)
- message queue                    (transport is the user's choice)
- autonomous orchestration         (no scheduler, no auto-advance)
- UI                               (plugin stays read-only, unchanged)
- production deployment            (nothing deploys in this phase)
- runtime code of any kind         (deterministic validators are a
                                    future, separately-authorized phase)
```

### Honest evidence discipline (carried from v0.7.5)

This design creates documentation only. It demonstrates nothing
runtime, and claims nothing runtime. Future validation of the
protocol will preserve the REPORTED_PASS / PROVEN / NOT PROVEN
discipline: multi-device trials that export artifacts get
evidence rows; ones that do not get reported outcomes only.

---

```text
DOCUMENT_CREATED=true
SKILL_DESIGN_INCLUDED=true (four packages, design specification only)
CODE_CREATED=false
IMPLEMENTATION_STARTED=false
PLUGIN_CHANGED=false
BRIDGE_CHANGED=false
MUTATION_GATE_CHANGED=false
PRODUCTION_VAULT_CHANGED=false
CONCLUSION=DESIGN_COMPLETE
STOP_AFTER_DESIGN=true
```
