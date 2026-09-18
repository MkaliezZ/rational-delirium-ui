# RD Workflow — Skill Instructions

Authoritative contract: the Rational Delirium Universal Workflow
(v0.6). This Skill explains how to participate; it grants nothing.
Supported operation: **APPEND_EXISTING_NOTE** to one existing note.

## 1. What the Rational Delirium workflow is

A human-governed knowledge-change pipeline:

```text
Observation → Proposal → Independent Review → Human Approval
           → Permit → Execution (Bridge Adapter → Bridge validation
           → Mutation Gate) → Vault append + Audit
```

Separation of concerns is the core rule:

- **Authorization** lives in the Human's approval and the Permit.
- **Coordination** (who may write which note now) lives in the Bridge.
- **Execution integrity** (exact bytes, exactly once, audit) lives in
  the Mutation Gate.
- **Display** is the read-only plugin's job.

No Agent, Skill, vendor, model, or review consensus holds any of
these authorities.

## 2. Agent role selection

Generic roles (never product names):

| Role | Does | Never |
|---|---|---|
| **Research Agent** | Reads authorized knowledge, gathers evidence with provenance, prepares a scoped proposal | Write official knowledge; certify its own inference; fabricate approval |
| **Review Agent** | Independently inspects a fixed proposal digest and its sources; reports findings + recommendation | Substitute its recommendation for Human approval |
| **Approval Assistant** | Assembles and explains the exact decision package; records the Human's response faithfully | Sign, decide, or claim approval on the Human's behalf |
| **Executor Assistant** | Prepares the handoff to the authorized Executor; displays and explains results | Acquire permission, force a lease, append bytes directly, or switch executors |

A role is a task, not an identity or a permission. One application
may assist several roles, but role separation stays visible. The
author of a proposal cannot satisfy Independent Review by relabeling
a second pass of their own; a distinct reviewer identity and
independent context are required. Role labels never establish trusted
executor identity — that comes only from the deployed trusted
runtime.

## 3. Proposal lifecycle (workflow labels, not Gate states)

```text
OBSERVED → DRAFT → REVIEW_PENDING → (CHANGES_REQUESTED ↺)
        → REVIEWED → APPROVAL_PENDING → APPROVED → PERMIT_READY
        → EXECUTION_REQUESTED → APPLIED | EXECUTION_REJECTED
                               | EXECUTION_UNCERTAIN
Pre-execution exits: REJECTED / CANCELLED / SUPERSEDED
```

Key rules:

- A **submitted** proposal revision is immutable. Any change to
  payload, target, actor, operation, or base hash = a **successor
  proposal** (new ID + digest, fresh review, new approval).
- The proposal digest is computed by the authoritative serializer
  over `proposal_id, actor, target, operation, payload(base64),
  base_sha256` — never by local ad-hoc JSON ordering.
- A stale base hash (note changed since observation) requires a new
  proposal. No automatic merge.
- Workflow cancellation is NOT revocation of an issued Permit; once
  submitted, cancellation does not prove no write occurred.

## 4. Review expectations

- The reviewer receives the **exact** proposal digest, payload bytes,
  target, base hash, source references, and predecessor revision.
- Findings cover: evidence quality, source traceability, scope
  (one note, append-only), inference vs fact, unintended-mutation
  risk (byte/whitespace/frontmatter), and independence binding.
- Recommendations: *request changes*, *reject*, or *recommend
  approval* — a positive recommendation grants nothing.
- Unresolved blocking findings stop the workflow before approval.
- Review linkage is a workflow requirement; the Permit does not
  cryptographically bind the review record.

## 5. Human approval requirement

- The Approval Assistant presents ONE concrete decision package:
  exact proposal (ID/revision/digest), target + intended Vault, base
  hash + observation context, full payload preview + byte length +
  payload SHA-256 + hidden-whitespace disclosures, evidence,
  review result + unresolved findings, selected Executor, and the
  decision scope (this operation only).
- The Human explicitly approves, rejects, or requests revision.
  **Silence, timeout, acknowledgment, confidence scores, reviewer
  consensus, or prior approvals are never approval.**
- The trusted approval/signing path issues the Permit. An
  Agent-generated "approved" field is not an approval artifact.
- Changing the selected Executor requires new approval + new Permit.

## 6. Execution handoff rules

- Handoff passes the **unchanged** proposal + issued Permit to the
  authorized Executor runtime (Bridge Adapter → Bridge validation →
  Mutation Gate). Never a direct filesystem append.
- Consistency is required across: intended Vault, target, selected
  Executor (Permit), actual runtime executor, and Bridge writer
  identity. Any mismatch is reported, never repaired by claiming an
  identity or swapping a root.
- Preserve every identifier and the authoritative result verbatim:
  `APPLIED` / `REJECTED:<reason>` / `EXECUTION_UNCERTAIN:<reason>`.

## 7. Failure handling

| Situation | Required behavior |
|---|---|
| Missing capability/tool | State the gap; stop the dependent step; no substitute path |
| Pre-write rejection (invalid permit, no lease, stale base, sync hazard) | Preserve the exact reason; stale base ⇒ new proposal; no executor swapping to force success |
| `EXECUTION_UNCERTAIN` | Preserve uncertainty + evidence; **no automatic retry**; no new Permit to bypass the blocked one; Human investigates |
| Lost response / missing audit | Report unknown outcome honestly — absence of a result is NOT proof no write happened; do not re-append |
| Sync or UI delay after APPLIED | Report observation pending; never repeat the append to refresh a display |

Execution, audit availability, synchronization, display, and truth
are five different facts. Keep them separate in every report.
