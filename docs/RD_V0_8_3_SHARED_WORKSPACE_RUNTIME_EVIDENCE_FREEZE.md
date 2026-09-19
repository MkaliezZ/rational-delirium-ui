# Rational Delirium — v0.8.3 Shared-Workspace Runtime Evidence Freeze

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_8_3_SHARED_WORKSPACE_RUNTIME_EVIDENCE_FREEZE
STATUS=FROZEN (documentation/evidence organization only — no runtime change)
BASE=fc9b50026140e9663ce1ba0e46b7ab023985ed39
WORKSPACE_ID=RD-V082S-0001
EXECUTED_AT=2026-09-19T09:12:56Z (trial timestamps as recorded)
```

---

## 1. Purpose

This document freezes the completed v0.8.2S end-to-end shared-workspace
validation into one auditable evidence package: what the trial actually
demonstrated, what it merely reported, and what remains outside the
demonstrated boundary. It converts nothing reported into unconditional
proof, and it changes no protocol, Skill, Bridge, Mutation Gate, plugin,
or sandbox artifact.

## 2. Scope

```text
WORKSPACE_ID=RD-V082S-0001
MODEL=CANONICAL_SHARED_LOGICAL_WORKSPACE (primary model, W1–W7)
WINDOWS_LOCAL_PATH=F:\DSH\RD-MultiDevice-Sandbox\RD-V082S-0001
MACOS_LOCAL_PATH=~/Desktop/DSH/RD-MultiDevice-Sandbox/RD-V082S-0001
TRANSPORT=Syncthing (TRANSPORT_IS_PROTOCOL_AUTHORITY=false)
EXECUTION_ENVIRONMENT=Sandbox only — the production Vault
(F:\Rational-Delirium) was never accessed; no Bridge or Mutation Gate
production state was touched.
PARTICIPANTS=Windows Research Agent + macOS Review Agent (external
DSH-hosted Agents as generic roles) + Approval Assistant (recording
only) + Human decider + deepseek-harness-executor (sandbox executor)
```

The two local paths are ONE logical synchronized workspace; all
authoritative artifacts live in place; no private authoritative copies
were created (workspace.md declares the model; the trial reports state
it was followed).

**Evidence-discipline reminder for this whole document:**

- **PROVEN** — facts independently supported by artifacts available in
  this package/repository.
- **REPORTED_PASS** — results reported by the runtime trial whose
  underlying runtime artifacts live in the external sandbox workspace
  (not copied into this repository). Where noted, the freeze process
  performed an independent read-only re-verification at freeze time.
- **NOT_PROVEN** — capabilities outside the demonstrated boundary.

## 3. Validated Workflow Timeline

| Stage | Actor role | Artifact(s) in workspace | Result | Evidence status |
|---|---|---|---|---|
| Research R1 | Windows Research Agent | `workflow/research-r1.md` + `handoff-research-r1.md` | thread + handoff created in canonical workspace | REPORTED_PASS (sandbox artifacts; not in repo) |
| Review R1 | macOS Review Agent | `workflow/review-r1.md` + `handoff-review-r1.md` | independent in-place review, findings issued | REPORTED_PASS |
| Revision (R2 succession) | Windows Research Agent | `workflow/revision-response-r2.md`, `research-r2.md`, `handoff-research-r2.md` | r2 created as successor; r1 never overwritten | REPORTED_PASS |
| Review R2 | macOS Review Agent | `workflow/review-r2.md` + `handoff-review-r2.md` | successor reviewed; recommend-approval (recommendation only) | REPORTED_PASS |
| Decision Context | Approval Assistant (assembly) | `decision-context-r2.md` → successor `decision-context-r2-v2.md` (+ handoffs HO-V082S-DC-R2-0001/0002) | first DC surfaced the kind gap honestly (see §7); successor v2 carried `kind=decision-context` after repo repair 1d8ca39 | REPORTED_PASS (successor artifact inspected at freeze) |
| **Human Decision** | **Human** (Approval Assistant recorded) | `workflow/human-decision-r2.md` | `APPROVE_EXACT_OPERATION` + `SELECTED_EXECUTOR_IDENTITY=deepseek-harness-executor`, bound to DC-V082S-R2-0002 (digest 65b0b4a0…), scope=this operation only | **PROVEN** (decision record exists in workspace; binding facts quoted in §6; read-only inspected at freeze) |
| Execution | deepseek-harness-executor via real frozen Bridge Adapter + Mutation Gate | `workflow/execution-handoff-r2.md`; execution artifacts | first attempt **APPLIED**; duplicate attempt **REJECTED:duplicate permit execution** | REPORTED_PASS (independently re-verified at freeze — see §5/§6) |
| Audit | Mutation Gate AuditLog | `audit/gate-audit.jsonl` | 2 records; per-record digest verification passed | REPORTED_PASS (re-verified at freeze with repo AuditLog code, read-only) |
| Outcome Report | Executor-side report | `workflow/outcome-report-r2.md` | honest outcome view; classified `kind=evidence` (see §7) | REPORTED_PASS |

## 4. Architecture Boundary

```text
Skill (guides Agent behavior — never authority)
  ↓
Workflow (lifecycle states)
  ↓
Handoff (logical workflow transition — never transport, never authority)
  ↓
Human Decision (the ONLY approval that exists)
  ↓
Permit (execution-layer artifact; sandbox path used frozen MockSigner)
  ↓
Bridge Adapter (admission: lease/writer/expiry/sync-hazard)
  ↓
Mutation Gate (controlled mutation: byte-exact, exactly-once, audited)
  ↓
Knowledge (vault append; plugin presents read-only)
```

**Handoff never grants authority.** Every handoff in this workflow
carried work results and lineage only; the decision record, the Permit,
and the execution request each lived in their own layers. The decision
was made by the Human and recorded by the Approval Assistant — **the
Agent did NOT make the decision**. No consensus, confidence, timeout,
or automatic approval exists anywhere in this chain.

## 5. Evidence Matrix

| Capability | Status | Evidence source | Boundary |
|---|---|---|---|
| Shared-workspace model transition (one logical workspace, two devices, in-place artifacts) | REPORTED_PASS | sandbox workspace.md + stage artifacts; trial reports | Not in repo; model itself IS repo-PROVEN (design W1–W7) |
| Sequential Agent role transitions (research→review→revision→review→decision) | REPORTED_PASS | timeline artifacts §3 | Single tested workflow |
| Artifact lineage preservation (revision_reference / input_references intact) | REPORTED_PASS | research-r2/review-r2/handoff chain | Sandbox artifacts external |
| Independent review loop (proposer ≠ reviewer; recommendations ≠ approval) | REPORTED_PASS | review-r1/r2 records | Independence is declared context, not cryptographically proven |
| Human decision boundary (explicit decision + executor selection, recorded) | PROVEN (record) + REPORTED_PASS (execution consequences) | `human-decision-r2.md`; binding quoted §6 | Record inspected read-only at freeze; lives in sandbox |
| Real frozen Bridge Adapter execution in sandbox | REPORTED_PASS | validation-execution-r2.md (BRIDGE_EXECUTED=true) | Raw runtime artifacts not included in package |
| Real frozen Mutation Gate execution in sandbox | REPORTED_PASS | validation-execution-r2.md (MUTATION_GATE_EXECUTED=true, APPLIED) | Same |
| Frozen component existence + behavior | PROVEN (repo) | `mutation-gate/` + `bridge_adapter/` source; test suite 42/42 incl. cross-process locking | Component-level; does not prove this trial's execution |
| Exact byte append (B+S, readback, single occurrence) | REPORTED_PASS **with independent freeze re-verification** | hashes §6 re-computed from sandbox bytes: before/after/payload all match; `note == before+payload` byte-identity True; occurrences=1 | Re-verification is a snapshot at freeze time, not continuous proof |
| Duplicate permit rejection (tested scenario) | REPORTED_PASS **with independent freeze re-verification** | audit record 2 = REJECTED:duplicate; repo AuditLog run over sandbox jsonl: chain=True, blocked={RD-V082S-PERMIT-0001} | Tested scenario only; not production-scale concurrency |
| Execution records with verification (per-record digest) | REPORTED_PASS | 2 records, digests 1a2fd9b6… / 728b2312…, chain True | See audit-language precision below |

**NOT_PROVEN (explicit):** production Vault execution; production
deployment readiness; distributed system reliability; Syncthing
security guarantees; strong cryptographic identity; arbitrary Agent
compliance; autonomous approval; AI authority; production-scale
concurrency; malicious adversarial resistance.

## 6. Execution Evidence Summary (exact recorded values)

```text
PROPOSAL_ID        = RD-V082S-EXEC-0001
PROPOSAL_DIGEST    = 47084d3e03b910955eee2f36575e7cc0df61d39f279c9e6904b7b097ab15825c
PERMIT_ID          = RD-V082S-PERMIT-0001 (frozen MockSigner / HMAC-SHA256 — see §8)
EXECUTOR           = deepseek-harness-executor (== Human-selected identity)
DECISION_BOUND_TO  = DC-V082S-R2-0002 (digest 65b0b4a086f351c38b2fa010aefce6b3dd230a8f453db02c9ba3421918ed1cf)
TARGET             = knowledge/KNOWLEDGE-SANDBOX-V082S.md
OPERATION          = APPEND_EXISTING_NOTE

BEFORE_SHA256      = cfa5dab1b49045079fd8eaf2b4a5265fa6e27ac58f96e10fd3397d50d4975547
PAYLOAD_SHA256     = 0a2b3ecff6cd25797732fd4ee0637d87211fa2fe5de76f018cd0e2d8b44cff2f
PAYLOAD_SIZE       = 1555 bytes
AFTER_SHA256       = 59e737d1aea517c99a78215fd0c0da23088a8d8cb24ad69c8df83e2c9e33432d
PAYLOAD_OCCURRENCE = 1 (exactly once)

FIRST_EXECUTION    = APPLIED
DUPLICATE_ATTEMPT  = REJECTED:duplicate permit execution: RD-V082S-PERMIT-0001
AUDIT              = audit/gate-audit.jsonl, 2 records, chain verified True
                     record digests: 1a2fd9b6d28fee0366cfb20edabb505646c29d5ff9d7d4d929727a386532772e
                                      728b231ff2a42b15e83a9aa89afb5c24e42dc46f598019a6d5fe4459859ba3d5
```

**Freeze-time independent re-verification (read-only, performed once
at freeze):** before/after/payload digests re-computed from the
sandbox bytes all matched the recorded values; the target note is
byte-identical to `before + payload`; payload occurs exactly once; the
repository's frozen `AuditLog` code run over the sandbox `gate-audit.jsonl`
returned chain=True with the permit in the blocked set. These checks
raise confidence in the reported results; they do not convert them into
PROVEN rows (the artifacts remain external to this package).

## 7. Work Product Taxonomy (as exercised by this trial)

Five kinds, per the frozen v0.8 protocol:

```text
evidence         — source material / traceable records of observations,
                   source statements, pre-existing state (epistemic basis)
proposal         — what change is being proposed
review           — what an independent reviewer finds
synthesis        — how multiple inputs are combined preserving disagreement
decision-context — informational assembly for Human consideration
                   (references reviewed state + exact operation; no authority)
```

Two trial-specific notes:

1. **The kind gap this trial surfaced.** The first Decision Context
   handoff (HO-V082S-DC-R2-0001) honestly reported that its work
   product did not fit the then-four-value kind enum rather than
   silently mislabeling it. The repository repair (commit 1d8ca39,
   `kind=decision-context` as fifth value) and the successor artifact
   (DC-R2-0002 / HO-V082S-DC-R2-0002) closed the gap. The trial's
   first DC artifact remains unmodified historical evidence.
2. **Outcome report classification.** The outcome report self-classified
   as `kind=evidence` under the "traceable records of pre-existing
   state" clause (commit fc9b500's evidence boundary). This is valid
   only because its primary semantic function is recording observed
   execution state — it is NOT approval, decision, or authority, as
   the artifact itself states.

**Audit-language precision.** This package speaks of execution records
with verification and per-record digest verification only.
**Verification of recorded digests does not by itself prove historical
completeness, deletion resistance, source authenticity, or knowledge
truth.** No stronger audit guarantee is claimed anywhere in this
document.

## 8. Known Limitations

- **MockSigner.** The tested permit path used the frozen documented
  MVP signer (MockSigner / HMAC-SHA256). This is NOT production
  identity, enterprise key management, cryptographic identity proof,
  or real user authentication.
- **Sandbox only.** All execution happened in the sandbox workspace;
  the production Vault was never accessed; no production deployment
  is claimed.
- **Single tested workflow.** One run (R1→R2→DC→decision→execution)
  on one workspace; no breadth or repeat statistics.
- **No distributed coordination proof.** Sequential-writer discipline
  (W5) was followed by honest behavior in this run; no distributed
  lock, consensus, or adversarial concurrency was exercised.
- **Transport not authority.** Syncthing moved bytes; nothing about
  its guarantees is claimed.
- **Identity declarations.** Agent/role identities in artifacts are
  declared, not cryptographically proven.

## 9. Final Status

```text
V0_8_CORE_VALIDATED=true
  (shared-workspace lifecycle executed end-to-end in sandbox with the
   frozen repo components, per the evidence matrix discipline above)

PRODUCTION_VALIDATED=false

NEXT_PHASE_READY=true
```

---

```text
DOCUMENT_CREATED=true
CODE_CHANGED=false / SKILLS_CHANGED=false / PROTOCOL_CHANGED=false
BRIDGE_CHANGED=false / MUTATION_GATE_CHANGED=false / PLUGIN_CHANGED=false
PRODUCTION_VAULT_CHANGED=false / SANDBOX_ARTIFACTS_CHANGED=false
CONCLUSION=FROZEN
STOP_AFTER_EVIDENCE_FREEZE=true
```
