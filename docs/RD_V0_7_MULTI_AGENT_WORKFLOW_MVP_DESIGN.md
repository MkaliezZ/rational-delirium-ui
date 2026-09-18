# Rational Delirium — v0.7 Multi-Agent Workflow MVP Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_7_MULTI_AGENT_WORKFLOW_MVP_DESIGN
STATUS=DESIGN_ONLY — NO IMPLEMENTATION
BASE=f891223a254377a0c2749c219b2f7f53a79afc8b (v0.6.2 skill package)
AUTHORITATIVE_PREDECESSORS:
  docs/RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md
  docs/RD_V0_6_1_AGENT_SKILL_PACKAGE_DESIGN.md
SUPPORTED_MUTATION=APPEND_EXISTING_NOTE (unchanged)
```

---

## 1. Vision

### Why v0.6 Skill is not enough

v0.6/v0.6.2 delivered the *vocabulary*: any single Agent, guided by
the Skill package, can fill one role (research, review, approval
presentation, or execution handoff) correctly. v0.6.3 validated that
even unknown Agents understand the boundaries.

What v0.6 does NOT define is **the space between Agents**:

- **No inter-Agent contract.** v0.6 defines what each role does in
  isolation; it does not define the *handoff artifact* two different
  Agents exchange when one finishes researching and another starts
  reviewing — across different hosts, sessions, and vendors.
- **No multi-Agent composition rules.** Who may hand to whom? Does a
  handoff carry authority? (It must not.) What happens when three
  Agents disagree?
- **No role beyond proposal/review.** Real knowledge work needs a
  *synthesis* step — merging parallel research threads into one
  proposal — which v0.6 has no guidance for.
- **No operational loop.** v0.6 describes one pass; real maintenance
  is iterative, and each iteration must re-enter the frozen gates.

### Why Multi-Agent Workflow

The vault's actual maintenance pattern (proven across v0.4–v0.6
development itself) is: **different minds are good at different
steps** — one explores, another challenges, a human decides, a
verified runtime writes. v0.7 makes that pattern a first-class,
vendor-neutral contract so that heterogeneous Agents can
*collaborate* on knowledge without any of them gaining authority.

The design goal, precisely:

> Define who is responsible for what, how work moves between Agents,
> where everything stops, when the Human is required, and how the
> whole loop enters the existing Mutation Gate — **without building
> any new runtime, engine, or coordination service.**

---

## 2. Agent Roles

All roles are generic task functions. A role is never an identity, a
permission, or a vendor. Any capable Agent may serve any role;
serving a role grants nothing. Product names never appear in
bindings.

### Research Agent

| CAN | CANNOT |
|---|---|
| Read authorized knowledge via read paths | Write official knowledge |
| Gather evidence with source references + provenance | Certify its own inference as fact |
| Record observations, limitations, uncertainty | Fabricate citations or verification history |
| Prepare a scoped proposal draft (template-guided) | Create/rename/delete notes |
| Flag open questions for later resolution | Issue approvals, permits, or signatures |

### Review Agent

| CAN | CANNOT |
|---|---|
| Independently inspect a fixed proposal digest + sources | Approve anything (recommendation ≠ approval) |
| Verify scope: one note, append-only, no smuggled edits | Edit the proposal (immutability) |
| Report findings with severity + rationale | Resolve its own blocking findings silently |
| Distinguish observed evidence vs inference | Upgrade epistemic status of claims |
| Recommend: request changes / reject / recommend approval | Retry or supersede the proposal on its own |

### Synthesis Agent *(new in v0.7)*

| CAN | CANNOT |
|---|---|
| Merge MULTIPLE research threads into ONE proposal draft | Invent evidence not present in inputs |
| Preserve each thread's provenance and uncertainty labels | Drop dissent or contradictory findings |
| Produce the consolidated base-hash + payload view | Merge into official knowledge itself |
| Record which threads agreed/disagreed and where | Resolve disagreements by vote or confidence |
| Declare "cannot synthesize" when inputs conflict irreconcilably | Hand off any form of authority |

The Synthesis Agent exists because multi-Agent research produces
*parallel* threads; the Gate accepts *one* proposal. Synthesis is a
drafting function over inputs — its output is still just a DRAFT
proposal that requires the full review → approval → permit path.

### Approval Assistant

| CAN | CANNOT |
|---|---|
| Assemble the single decision package (per v0.6 template) | Be the Human; sign or decide |
| Surface ALL unresolved findings + dissent verbatim | Infer approval from silence/timeout/consensus |
| Record the Human's explicit response + reference | Mint, sign, or simulate a Permit |
| Ask for clarification when the decision is ambiguous | Broaden scope of what was approved |

### Executor Assistant

| CAN | CANNOT |
|---|---|
| Prepare the unchanged handoff to the authorized Executor | Write bytes or "simulate" execution |
| Verify handoff consistency (vault/target/executor bindings) | Acquire leases or force ownership |
| Report authoritative results + audit references verbatim | Swap executors, roots, or vaults to force success |
| Explain failures and required next steps | Retry uncertain/consumed executions |

---

## 3. Workflow Lifecycle

```text
Research ─► Evidence Collection ─► Proposal Creation ─► Independent Review
        ─► Human Decision ─► Execution Handoff ─► Bridge Adapter
        ─► Mutation Gate ─► Vault Update ─► Plugin Refresh
```

| Step | Input | Output | Responsible | Forbidden behaviors |
|---|---|---|---|---|
| **Research** | Task question; authorized read access | Research thread (observations, sources, provenance, open questions) | Research Agent | Writing knowledge; certifying truth |
| **Evidence Collection** | Research thread | Evidence records: source ref + excerpt/artifact id + acquisition context + limitations; unavailable sources explicit | Research Agent (may be several, parallel) | Manufacturing citations; upgrading inference |
| **Proposal Creation** | One or more research threads (via Synthesis when >1) | Immutable proposal revision: id, digest, target, base hash, exact payload bytes | Research/Synthesis Agent | Editing official notes; ad-hoc digest computation; approval fields |
| **Independent Review** | Exact proposal digest + sources + predecessor reference | Review record: findings (severity+rationale), inspected/unavailable sources, recommendation | Review Agent (distinct identity+context from author) | Author self-review; editing the proposal; approval language |
| **Human Decision** | Decision package (per approval template: exact delta, bindings, findings, selected executor) | Explicit approve / reject / request-revision + decision reference | **Human only** | Any Agent-derived approval; scope broadening |
| **Execution Handoff** | Unchanged proposal + Permit (from trusted signing path) + review/approval references | Executor request with consistent bindings | Executor Assistant | Direct writes; identity swapping; permit repair |
| **Bridge Adapter** | Executor request | Bridge validation verdict (lease/writer/expiry/sync-hazard) | Bridge Adapter (frozen v0.5.1) | Takeover attempts; bypassing failures |
| **Mutation Gate** | Validated request | `APPLIED` (B+S exactly once, readback) or `REJECTED:<reason>` or `EXECUTION_UNCERTAIN:<reason>` + audit record | Mutation Gate (frozen v0.5.0) | Duplicate admission; uncertain retry; audit rewriting |
| **Vault Update** | Gate APPLIED | Note bytes == B + S | Gate executor (sole writer) | Any other write path |
| **Plugin Refresh** | Updated vault state | Read-only visualization of new state | Plugin (frozen v0.4.4) | Plugin as write engine; re-execution to "refresh" |

Every step's output is a *work product*. Authority never moves with
the work — it stays parked at the Human (approval) and the frozen
gate stack (execution).

---

## 4. Agent Handoff Protocol

### The invariant

> **Agents exchange work results, never permissions.**
> A handoff package carries evidence and drafts; it contains no
> approval, no Permit, no executor eligibility, and no lease. Those
> exist only via the Human decision and the trusted runtime.

### Handoff package (vendor-neutral record)

| Field | Content |
|---|---|
| `protocol_version` | Workflow contract version (this design's lineage) |
| `handoff_id` | Stable unique id for this handoff |
| `handoff_type` | `research-thread` \| `proposal-for-review` \| `synthesis-inputs` \| `decision-package` \| `executor-request` \| `outcome-report` |
| `origin_role` / `target_role` | Generic roles (never products) |
| `proposal_reference` | proposal_id + revision + **exact digest** (when a proposal exists) |
| `payload_reference` | Exact byte artifact + byte length + payload SHA-256 (computed, never invented) |
| `base_reference` | Target note + base_sha256 + observation time + freshness note |
| `provenance` | Per-claim source mapping; source-statement vs observation vs inference; unavailable sources listed |
| `unresolved_questions` | Open questions carried explicitly — unknown ≠ omitted |
| `dissent` | Preserved disagreements from any contributor (never merged away) |
| `predecessors` | Prior handoff ids this one builds on (revision lineage) |
| `unknowns_declared` | Explicit flag list of anything unavailable/unverified |

### Rules

1. **Immutability after submit.** Once a handoff of type
   `proposal-for-review` is issued, its digest is fixed; changes go
   to a successor revision (new id, new digest, fresh review).
2. **Receiving Agent verifies** it can preserve the handoff
   faithfully (protocol version, byte semantics). If it cannot, it
   reports the gap and stops — never silently normalizes payloads,
   relabels outcomes, or substitutes a workflow.
3. **No authority fields.** Any package claiming to carry approval,
   permits, or executor rights is malformed; receiving Agents reject
   it and report.
4. **Transport-agnostic.** The package is a semantic record — a
   file, a message, a paste. Hosts render it; they never reinterpret
   its meanings.
5. **Unknown is a value.** `unknown`, `unavailable`, and `not
   performed` remain distinct and must survive every hop.

---

## 5. Multi-Agent Review Model

### Baseline: proposer ≠ reviewer

- The **author** of a proposal cannot review it — not by relabeling
  a second pass, and not by spawning "another instance of itself"
  with the same context/memory. Independent review requires a
  **distinct reviewer identity and independently maintained review
  context** (separate session, separate source access, no shared
  hidden state).
- A different vendor/model alone does not prove independence; the
  same vendor does not preclude it. What matters is context
  separation, honestly declared.
- If no independent reviewer is available, the proposal stays
  `REVIEW_PENDING`. Waiting is correct behavior.

### When a third Agent is needed

| Situation | Why a third Agent |
|---|---|
| Conflicting evidence between sources | An Agent that did not gather either thread adjudicates *weight*, not truth |
| Reviewer requests changes the author disputes | A tie-break reviewer examines both positions + sources; its output is still only a recommendation |
| Synthesis merged threads with residual dissent | A reviewer distinct from the synthesist checks dissent preservation |
| High-stakes target (e.g., a foundational note) | Human may require an additional independent review pass — workflow policy, not new Gate enforcement |

Third Agents add *perspective*, never authority. There is no voting
threshold, no score, no quorum: additional reviews are more evidence
for the Human.

### Reviewer disagreement

- Disagreement is **preserved verbatim**, never averaged away. The
  decision package shows both positions and their evidence.
- The Human may: reject, request another review, or approve while
  explicitly acknowledging the disagreement. That acknowledgment is
  part of the approval record.
- No Agent "resolves" a disagreement by overwriting a dissenting
  finding.

### Conflicting evidence / incomplete sources

- Conflicting evidence: both sides carried through provenance;
  Synthesis must label the conflict, not pick silently.
- Incomplete sources: listed as unavailable in every downstream
  handoff; the Human sees them before deciding. Approval with known
  gaps is the Human's explicit choice, never a default.

---

## 6. Human Approval Boundary

### The Human approves

- **One exact operation**: this proposal digest's append, to this
  target, on this vault, with this payload, on this base hash.
- **The selected Executor** (verified runtime identity).
- **With full knowledge**: all findings, all dissent, all
  unavailable sources, all uncertainty — surfaced, not summarized
  away.

### The Human does NOT approve

- Future writes, standing authorizations, "similar" proposals.
- Executor substitution (that requires new approval + new Permit).
- Truth certification (approval authorizes an append, not the
  correctness of every claim in it).

### Absolute prohibitions

```text
Agent self-approve                — forbidden
reviewer consensus = approval     — forbidden
confidence score = approval       — forbidden
timeout / silence = approval      — forbidden
prior approval covers new digest  — forbidden
acknowledgment ("ok, noted")      — not approval
```

Approval is a single, explicit, recorded Human decision bound to the
exact package. The trusted signing path issues the Permit; no Agent
touches that path's credentials.

---

## 7. Execution Flow

After the Human decision, execution enters the **frozen stack** —
v0.7 adds no new execution surface:

```text
Human approval (recorded reference)
        │
        ▼
Trusted signing path  ──►  Permit (binds digest/target/base/executor/
        │                  approval identity/timestamp — frozen format)
        ▼
Executor Assistant assembles UNCHANGED handoff:
  proposal + permit + vault context + review/approval references
  consistency check: vault / target / selected executor /
  actual runtime executor / Bridge writer identity all align
        │  (mismatch ⇒ report, never repair)
        ▼
Bridge Adapter (v0.5.1):  lease · writer · expiry · sync-hazard
        │  fail ⇒ REJECTED:<reason>; no takeover, no force
        ▼
Mutation Gate (v0.5.0):   permit validation · payload integrity ·
        │                 exactly-once admission · byte-exact append
        │                 · readback · audit record
        ▼
   APPLIED  |  REJECTED:<reason>  |  EXECUTION_UNCERTAIN:<reason>
        │
        ▼
Vault note == B + S   (the Gate executor is the only writer)
        │
        ▼
Plugin (v0.4.4, read-only) renders the updated knowledge
```

Two non-negotiables:

1. **Agents never write.** No role in this design holds a write
   path. The Executor Assistant is a *courier and reporter* around
   the authorized runtime — it hands off, it does not execute.
2. **Results are authoritative verbatim.** The stack's statuses
   (`APPLIED` / `REJECTED:<reason>` / `EXECUTION_UNCERTAIN:<reason>`)
   flow upward unmodified; downstream sync/UI observations are
   recorded as separate facts.

---

## 8. Failure Handling

| Case | Scenario | Who handles | Auto-continue? | Human required? |
|---|---|---|---|---|
| **A — Proposal expiry** (stale base hash at Gate) | Note changed after observation | Research Agent prepares **successor proposal** (new id/digest) → fresh review | ❌ no auto-merge, no auto-resubmit | Yes (new approval; execution itself is mechanical once permitted) |
| **B — Review finds insufficient evidence** | Reviewer blocking finding: sources don't support claim | Back to Research Agent for evidence strengthening; or Human rejects outright | ❌ workflow stops at REVIEWED-with-blockers | Yes — Human decides reject vs. another research round |
| **C — Two Agents conflict** (research threads or reviewers disagree) | Contradictory analysis of same sources | Preserve dissent verbatim; optional third-Agent tie-break review | ❌ never resolved by vote/score | **Yes — always.** Human sees both positions + evidence and decides (or rejects) |
| **D — EXECUTION_UNCERTAIN** | Post-write verification failed / response lost | Executor Assistant preserves uncertainty + evidence; nothing retries | ❌ **never auto-retry**; no new permit to bypass the blocked one | **Yes — mandatory.** Human investigates actual file state before any new operation |
| **E — Syncthing conflict** (`.sync-conflict*` detected / Bridge `SYNC_HAZARD`) | Sync conflict adjacent to target | Bridge Adapter rejects pre-write; humans resolve the conflict with existing tooling | ❌ no auto-resolution, no executor swap | Yes — after resolution, the SAME permit may re-enter (its uniqueness is guarded); if base changed → Case A |

Global rules across all cases: absence of a result is never proof of
no write; an APPLIED result is never re-run to fix a laggy display;
every authoritative reason survives every hop verbatim.

---

## 9. Minimal MVP Scope

v0.7 implements **one real knowledge-update loop**, end to end,
using existing frozen components plus the v0.6 Skill package:

```text
Research Agent ─► Review Agent ─► Human Approval
              ─► Executor ─► Bridge Adapter ─► Mutation Gate
              ─► Vault ─► Plugin (observed refresh)
```

In scope:

- The **handoff package** format (§4) as guidance + templates in the
  existing Skill package (documentation, not a parser/schema engine).
- **Operational walkthrough(s)** of one real append performed by
  ≥2 different Agent products in ≥2 different roles (e.g., research
  by one, review by another), following v0.6 guidance + §4 records.
- A **run record template** (outcome report) capturing the loop's
  identifiers, decision references, and result evidence.
- Honest documentation of gaps discovered (e.g., context separation
  between two products in one workflow).

Explicitly OUT of scope (do not grow into):

- Full automation of any step; autonomous knowledge production.
- A scheduling/orchestration service; message queues; databases.
- New mutation types; multi-note transactions.
- Any change to Plugin / Bridge / Mutation Gate / Adapter code.
- Host-specific skill wrappers beyond what v0.6 already frames.

Success criterion for the MVP: **one append, authored by one Agent
product, independently reviewed by another, approved explicitly by
the Human, executed through the frozen gate stack, audited, and
visible in the read-only plugin — with every handoff captured as a
§4 record.**

---

## 10. Non Goals (permanent)

Never building:

- Agent swarms / autonomous agent collectives
- Autonomous knowledge factories
- AI approval in any form
- Automatic truth engines / fact certification pipelines
- Distributed autonomous writing
- Voting/consensus-based authority of any kind

Authority architecture is frozen: **reasoning is multi-Agent;
approval is Human; admission is Bridge; mutation is Gate.**

---

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_7_MULTI_AGENT_WORKFLOW_MVP_DESIGN
DOCUMENT_CREATED=true
IMPLEMENTATION_STARTED=false
PLUGIN_CHANGED=false
BRIDGE_CHANGED=false
MUTATION_GATE_CHANGED=false
CONCLUSION=DESIGN_COMPLETE
STOP_AFTER_DESIGN=true
```
