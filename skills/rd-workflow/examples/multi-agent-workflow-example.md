# Example: Multi-Agent Workflow (FICTIONAL)

> Entirely fictional. No real Vault, note, CASE id, permit,
> signature, executor, lease, or user data. All identifiers are
> invented placeholders. Demonstrates evidence preservation,
> disagreement handling, the Human approval boundary, and honest
> execution-result reporting.
>
> Reference: docs/RD_V0_7_MULTI_AGENT_WORKFLOW_MVP_DESIGN.md.

## Cast (generic roles, no products)

- **Research Agent A** — explores the timing question
- **Research Agent B** — explores the measurement question
- **Synthesis Agent** — merges both threads into one draft
- **Review Agent** — independent context; reviews the merged proposal
- **Human** — the only approval authority
- **Executor Assistant** — courier and reporter; never writes

## Step 1 — Research Agent A: timing thread

Handoff `HO-101` (type `research-thread`):

```markdown
- protocol_version: RD-workflow-v0.7
- provenance:
    claim "report P1 postdates log L2 by 6 days" ← [P1 §3.2] (quoted)
    observation: reading order verified directly (observation)
    inference: "sequence is real, not clerical" (Agent inference)
- sources unavailable: [P0] — archive unreachable (declared)
- unresolved questions: does L2 use the same unit as P1?
```

## Step 2 — Research Agent B: measurement thread (disagrees)

Handoff `HO-102`:

```markdown
- provenance:
    claim "L2 values drift under load" ← [M-bench fiction §7] (quoted)
- dissent (toward HO-101):
    "the 6-day gap in HO-101 may be a clerical backdate, not a real
     sequence — P1's header timestamp conflicts with its log line"
```

Two threads now **disagree** about the same interval. Neither Agent
overwrites the other; both records survive verbatim.

## Step 3 — Synthesis Agent merges

Handoff `HO-103` (type `synthesis-inputs` → one draft proposal):

```markdown
- input threads: HO-101, HO-102
- dissent preserved: timing-gap interpretation contested (HO-102)
- resulting draft: one Observation block quoting both [P1] and
  [M-bench]; a Hypothesis block presenting BOTH readings; a
  Conclusion explicitly tentative: "consistent with a real sequence;
  clerical backdate not excluded"
- no invented evidence: nothing beyond the two threads appears
```

Synthesis does **not** pick a winner; it labels the conflict. The
draft becomes proposal `PROP-FICT-552 r1` (digest frozen at submit).

## Step 4 — Review Agent (independent context)

Handoff `HO-104` (type `proposal-for-review` → review record):

```markdown
- reviewer context: separate session; no shared state with A/B/S
- findings:
    BLOCK-1: conclusion sentence in r1 uses "shows" — too strong for
             contested evidence; request "is consistent with"
    NB-1: [P0] unavailability should appear in the payload itself
- recommendation: request changes
```

The Review Agent does **not** edit the proposal (immutability) and
does **not** approve anything. Author issues `PROP-FICT-552 r2`
(successor: new id+digest), which the reviewer re-reviews: blockers
resolved → `recommend approval` (still granting nothing).

## Step 5 — Human approval (the boundary)

The Approval Assistant presents ONE decision package:

```markdown
- exact proposal: PROP-FICT-552 r2, digest <fictitious>
- target: Fictional Vault "sandbox-two" · EVIDENCE/NOTE-FICT-9.md
- base: <fictitious hash> observed same day
- payload: full preview · 412 bytes · <fictitious payload sha256>
  disclosures: UTF-8, LF, trailing newline
- evidence + uncertainty: both threads, [P0] unavailable listed
- review: recommend approval · no open blockers
- DISSENT DISPLAYED VERBATIM: HO-102's backdate hypothesis, and the
  Human's chosen reading must be acknowledged if approved
- selected executor: fictional-executor-alpha (verified identity)
- scope: this operation only
```

The Human **explicitly approves while acknowledging the dissent**.
That acknowledgment is recorded in the decision reference
`HDEC-FICT-77`. Silence, timeouts, reviewer consensus, or a
confidence score would NOT have been approval.

## Step 6 — Execution (frozen stack; Agents never write)

```text
trusted signing path → Permit PERMIT-FICT-0031
Executor Assistant verifies bindings (vault/target/executor align)
  → Bridge Adapter: lease ✓ writer ✓ expiry ✓ sync-hazard ✓
  → Mutation Gate: permit ✓ payload ✓ admission ✓ append B+S ✓
                   readback ✓ audit record AUD-FICT-118
```

## Step 7 — Outcome report (honest reporting)

```markdown
- Mutation Gate result: APPLIED (verbatim)
- actual executor: fictional-executor-alpha (== selected)
- before/after: <fictitious hashes>
- audit: AUD-FICT-118 (record digest <fictitious>)
- sync: propagated to the second fictional device at 14:22Z
        — recorded as a SEPARATE observation
- plugin: read-only view shows the appended block at 14:25Z
        — also separate; if it had lagged, NO re-append would follow
```

## What this example demonstrated

1. **Evidence preservation** — quotes, observations, and inference
   stayed labeled; the unavailable source [P0] never silently
   disappeared.
2. **Disagreement handling** — HO-102's dissent survived synthesis,
   review, and was displayed verbatim to the Human, whose
   acknowledgment became part of the approval record.
3. **Human approval boundary** — one explicit decision on one exact
   package; the Approval Assistant recorded, never decided.
4. **Execution result reporting** — Gate result verbatim; audit,
   sync, and plugin observation recorded as distinct facts.
