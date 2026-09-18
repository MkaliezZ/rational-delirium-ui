# Rational Delirium — v0.7.5 Runtime Evidence Package

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_7_5_RUNTIME_EVIDENCE_PACKAGE_FREEZE
MODE=DOCUMENTATION_ONLY
BASE=24a8a51b196958cc26462fb3c26463fe2f4eea12
FROZEN_COMPONENTS_REFERENCED:
  v0.5.0 Mutation Gate (tag v0.5.0-alpha-mutation-gate)
  v0.5.1 Bridge Adapter (with BA-01..03 repairs)
  v0.6.2/v0.7.1 Skill package (guidance only)
```

---

## 1. Purpose

This evidence package formalizes the runtime validation chain of the
v0.7 multi-Agent workflow program (stages v0.7.2–v0.7.4) into one
frozen reference document, so that later work can cite exactly what
was demonstrated — and what was not — without re-deriving it from
scattered trial records.

**Validation boundary, stated explicitly:**

> This package proves **sandbox validation only**.
> It does **NOT** prove production deployment.

Every claim below is bounded by the sandbox environments in which
the trials ran. Nothing here asserts production-Vault execution,
multi-user operation, distributed coordination, or any guarantee
stronger than the frozen components' documented limitations.

---

## 2. Validation Timeline

### v0.7.2 — Single Agent Workflow Boundary Trial

| | |
|---|---|
| **Objective** | Verify that a single generic Agent, guided only by the Skill package, understands the workflow boundaries: research → proposal → review, review-is-not-approval, and the Human approval boundary, including stopping before any unauthorized mutation. |
| **Environment** | Isolated sandbox (no production Vault, no live Bridge state, no Gate execution). Agent + Skill guidance only. |
| **Result** | **PASS** |
| **Proven** | An Agent can read the Skill and correctly (a) follow the Research→Proposal→Review sequence, (b) treat review output as recommendation-not-approval, (c) identify the Human approval boundary, (d) stop before unauthorized mutation. |
| **Not proven** | Multi-Agent handoffs; artifact acceptance by a *different* Agent; any execution behavior (no runtime components were exercised). |

### v0.7.3 — Sandbox Controlled Mutation Trial

| | |
|---|---|
| **Objective** | Exercise the workflow's artifact layer end-to-end in a sandbox: workflow artifacts (proposal/review/approval-request records per the v0.6.2/v0.7.1 templates), approval-artifact binding (decision references the exact proposal digest/payload), the controlled-mutation workflow shape, and the exactly-once *expectation* at the workflow level. |
| **Environment** | Sandbox workspace; workflow artifacts only; no frozen runtime components invoked yet. |
| **Result** | **PASS** |
| **Proven** | Workflow artifacts can be generated to template; an approval **artifact** can be bound to one exact proposal; the controlled-mutation sequence can be walked without shortcuts; the workflow treats one-permit-one-mutation as an invariant expectation. The approval artifact was **simulated** within stated boundaries (MockSigner) — a real Human decision, Human identity verification, and a production approval workflow were NOT exercised. |
| **Not proven** | Actual bytes written by the Gate; real Permit signature verification; audit persistence; duplicate execution *enforcement* (that is v0.7.4's subject); that a real Human made the approval decision; Human identity verification; any production approval workflow. |

### v0.7.4 — Real Component Sandbox Execution Trial

| | |
|---|---|
| **Objective** | Run the REAL frozen components — Bridge Adapter (validation path) and Mutation Gate (executor, admission, audit) — inside a sandbox vault; verify a controlled append, audit-log verification, and duplicate-execution blocking. |
| **Environment** | Sandbox vault root (temp directory); real `mutation-gate` package + `bridge_adapter` code from the repository; sandbox lease registry; MockSigner for the approval identity (documented MVP limitation). |
| **Result** | **PASS** |
| **Proven** | The frozen Bridge Adapter executes its validation path against sandbox state; the frozen Mutation Gate performs a byte-exact append with before/after hashes; the real `AuditLog` records executions and passes per-record digest verification; a second execution attempt with the same permit is blocked. |
| **Not proven** | Behavior against the production Vault, real Syncthing state, real signing identity, or concurrent multi-process contention beyond the documented cross-process permit lock tests already in the suite. |

---

## 3. Architecture Boundary

```text
Agent
  ↓  reasoning + artifact creation (work products, never authority)
Workflow (Skill guidance; v0.7 handoff/run-record records)
  ↓  work results, never permissions
Approval Boundary (Human ONLY)
  ↓  explicit decision on one exact package → Permit via trusted signing path
Bridge Adapter
  ↓  admission control: lease · writer · expiry · sync-hazard
Mutation Gate
  ↓  controlled mutation: permit validation · payload integrity ·
     exactly-once admission · byte-exact append · readback
Audit
  ↓  execution records with per-record digest verification
Knowledge Layer (Vault storage + read-only Plugin presentation)
```

| Layer | Responsibility | Never |
|---|---|---|
| **Agent** | Reasoning; research; proposal/review/handoff artifact creation | Holds approval, admission, or write authority |
| **Human** | Approval authority over one exact operation; executor selection | Delegated to any Agent or consensus mechanism |
| **Bridge** | Admission control (lease/writer/expiry/sync-safety) | Grants approvals; is bypassed by workflow prose |
| **Mutation Gate** | Controlled mutation, exactly-once, integrity, audit | Re-interpreted or duplicated by any Agent-side check |
| **Audit** | Execution record of what actually happened | Rewritten, averaged, or replaced by Agent reports |
| **Knowledge layer** | Storage (Vault) + presentation (read-only Plugin) | Becomes a write path for Agents |

---

## 4. Evidence Matrix

| Evidence | Status | Source / traceability |
|---|---|---|
| Skill interpretation (boundaries understood by a generic Agent) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.2 Single Agent Workflow Boundary Trial; reported PASS from validation trial |
| Workflow compliance (lifecycle sequence followed) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.2 trial; reported PASS from validation trial |
| Proposal creation (template-conformant artifacts) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.3 Sandbox Controlled Mutation Trial; reported PASS from validation trial |
| Review boundary (recommendation ≠ approval respected) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.2 + v0.7.3 trials; reported PASS from validation trials |
| Approval boundary (workflow preserves a Human decision slot; review output not treated as approval; artifact bound to exact proposal) | REPORTED_PASS (sandbox; decision SIMULATED via MockSigner — not a real Human decision; underlying runtime artifact unavailable in this package) | v0.7.3 trial; approval-artifact binding demonstrated |
| Bridge execution (real adapter validation path runs) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.4 Real Component Sandbox Execution Trial, using repository code at the frozen v0.5.1 line (BA-01..03 repairs); run identifier: v0.7.4 sandbox run (non-sensitive) |
| Mutation Gate execution (real append + readback) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.4 trial, real `mutation-gate` package; operation `APPEND_EXISTING_NOTE`; proposal reference: sandbox proposal id + canonical digest (sandbox-local values) |
| Audit verification (per-record digest integrity verification) | REPORTED_PASS (sandbox; underlying runtime artifact unavailable in this package) | v0.7.4 trial, real `AuditLog`; before/after SHA-256 existence recorded |
| Exactly-once protection (duplicate permit blocked) | REPORTED_PASS (sandbox trial; underlying runtime artifact unavailable in this package) **+ PROVEN (component-level)** via included `mutation-gate/tests` suite (42/42 incl. cross-process locking) | v0.7.4 trial (second same-permit attempt rejected and audited) + in-package test suite as independent support |

All statuses are **sandbox-scoped**. No row asserts production
behavior. REPORTED_PASS means the trial reported PASS and this
package records that outcome; the original runtime artifacts were
not exported into this package. PROVEN is reserved for facts
independently supported by included documentation/source/test
references (the frozen `mutation-gate/` source and test suite).

---

## 5. Runtime Evidence Summary (v0.7.4)

The v0.7.4 real-component sandbox execution (trial: Real Component
Sandbox Execution Trial; validation phase: v0.7.4; component line:
repository `mutation-gate` + `bridge_adapter` at the frozen v0.5.1
line) produced the following evidence. The sandbox run's own
artifacts (audit file, permit files) were transient sandbox state
and are **not included in this package**; the rows below record
what that run observed, per the trial report.

- **Proposal reference**: sandbox proposal id + revision, with the
  canonical proposal digest computed by the authoritative
  serializer (identifier values are sandbox-local and intentionally
  not reproduced as production claims).
- **Operation type**: `APPEND_EXISTING_NOTE` (the only supported
  mutation).
- **Sandbox target**: one existing note under a sandbox vault root
  (temp directory; not the production Vault).
- **Before/after hash existence**: both SHA-256 values were
  produced and recorded — before = exact base bytes at admission,
  after = readback of `base + payload`; equality was verified
  byte-for-byte before `APPLIED` was returned.
- **Audit verification**: the real `AuditLog` appended a record for
  the execution; `verify_chain()` passed **per-record digest
  verification** — recorded `record_sha256` values match their
  expected values over each record's canonical content. The record
  binds permit id, proposal id + digest, target, actual executor,
  before/after hashes, result, and timestamp.
  **Precision of this guarantee**: per-record digest verification
  confirms that the recorded digests match their expected values.
  It does **NOT** prove historical completeness, absence of
  deletion, append-only history under adversarial conditions, or
  authenticity of knowledge content.
- **Duplicate execution protection**: a second execution attempt
  with the same permit was rejected by the admission layer
  (APPLIED/UNCERTAIN permits never re-enter the append stage), with
  the rejection itself audited.

Excluded by design: secrets, credentials, private keys, signing
material, and any authentication artifacts. None appear in this
package.

---

## 6. Claims from Trials and Package Evidence

Claims reported from validation trials and independently supported
package evidence.

**The package records reported trial outcomes. It does not contain
all original runtime artifacts required to independently reproduce
or verify every trial result.**

```text
REPORTED_PASS (sandbox scope; trial-reported, artifacts not included):
- A generic Agent can follow RD workflow boundaries from Skill guidance alone.
- Workflow artifacts (proposal / review / approval-request / handoff /
  run-record shapes) can be generated conformantly.
- The approval **boundary structure** can be preserved: review output
  stayed a recommendation (never treated as approval); the workflow
  kept the approval slot reserved for a Human decision.
- Approval **artifacts** can be bound to one exact proposal digest.
  In the sandbox trials the decision itself was SIMULATED (MockSigner
  on behalf of a declared approver identity); this is not evidence
  that a real Human decided anything.
- The real frozen Bridge Adapter executed its validation path (v0.7.4).
- The real frozen Mutation Gate executed a byte-exact controlled
  append with readback verification inside a sandbox (v0.7.4).
- AuditLog execution records with per-record digest verification
  passed: recorded digests matched expected values (v0.7.4).
- A duplicate execution attempt was blocked at runtime (v0.7.4).

PROVEN (independently supported by package contents):
- Per-record digest verification semantics and the exactly-once
  admission logic exist in the frozen, included `mutation-gate/`
  source and are exercised by the included test suite
  (`mutation-gate/tests`, 42/42 including cross-process locking).
- The workflow/templates documentation defining the boundaries the
  trials exercised is included in this package (`skills/rd-workflow/`,
  `docs/`).
```

---

## 7. Not Proven

```text
NOT PROVEN:
- That a real Human made any approval decision in the trials
  (sandbox approvals were simulated via MockSigner under declared
  approver identities)
- Human identity verification of any approver
- A production approval workflow
- Production Vault execution (F:\ … vault never exercised by v0.7.2–v0.7.4;
  the earlier one-time v0.5.1 production append is separate, prior evidence)
- Multi-user / multi-device deployment behavior
- Distributed coordination (single-machine, shared-state only)
- Real human approval automation (approval was simulated within stated
  boundaries; no approval workflow product was validated)
- Production Syncthing behavior (sandbox trials did not exercise sync)
- Strong cryptographic identity beyond current MVP limitations
  (MockSigner is a local HMAC mock; Ed25519-class identity is future work)
```

---

## 8. Known Limitations

Preserved from the frozen components and trials:

- **MockSigner**: approval identity is a local symmetric mock; the
  signer interface is ready for a real scheme, but none is deployed.
- **Sandbox-only validation**: every v0.7.x trial ran in isolated
  sandboxes; no trial touched the production Vault.
- **No production deployment** of any v0.7 workflow layer exists.
- **No multi-Agent runtime validation yet**: v0.7.2–v0.7.4 validated
  single-Agent boundary comprehension and real-component execution;
  genuine multi-Agent collaboration (two+ distinct Agents in
  different roles on one run) is the next boundary, not a completed
  one.

---

## 9. Next Boundary

**v0.8 — Multi-Agent Workflow Validation** (described only; not
implemented here):

Validate the v0.7 design's core claim in reality: ≥2 distinct
Agents (different products/contexts) collaborating on ONE knowledge
update — one researching, another independently reviewing — with
handoff records per the v0.7.1 template, dissent preserved verbatim
to the Human, one explicit Human approval, and execution through
the frozen Bridge Adapter + Mutation Gate stack, producing a
workflow run record. Success criterion mirrors §9 of the v0.7
design: one real append, multi-Agent authored and reviewed,
Human-approved, gate-executed, audited, and visible in the read-only
plugin — with every handoff captured.

Nothing in that boundary has been started by this document.

---

```text
DOCUMENT_CREATED=true
DOCUMENTATION_ONLY=true
CODE_CHANGED=false
PLUGIN_CHANGED=false
BRIDGE_CHANGED=false
MUTATION_GATE_CHANGED=false
PRODUCTION_VAULT_CHANGED=false
EVIDENCE_SCOPE=SANDBOX_ONLY
CONCLUSION=FROZEN
STOP_AFTER_DOCUMENT=true
```
