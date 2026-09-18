# Rational Delirium — v0.5.1 Bridge Adapter Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_5_1_BRIDGE_ADAPTER_DESIGN
STATUS=DESIGN ONLY — NO IMPLEMENTATION
BASE_TAG=v0.5.0-alpha-mutation-gate
BASE_COMMIT=af9e7c697e14a7fdca7546382145561fbc6e0a96
```

---

## 1. Architecture Overview

### Why Mutation Gate and Bridge are separate

The two systems answer different questions:

| | Mutation Gate (v0.5.0, frozen) | Bridge (v0.3.x, frozen) |
|---|---|---|
| Question | "Is THIS mutation authorized, intact, and executed exactly once?" | "WHO may write to THIS note right now, across two synced machines?" |
| Trust basis | Human approval (signed Permit) | Transferable lease (platform-detected writer identity) |
| Scope | one permit → one append → one audit record | whole-vault write coordination, journal, sync safety |
| Time axis | single execution instant | continuous multi-device lifetime |

Separation is deliberate: the Gate never learns about leases or
sync; the Bridge never learns about approvals or signatures. The
Adapter composes them without merging them — if either system
changes internally, the Adapter contract stays stable. This also
preserves the v0.4.x plugin's READ-ONLY guarantee: no layer in this
stack turns the plugin into a write engine.

### Data flow

```text
Agent (research / reasoning / proposal drafting)
  ↓ Proposal
Human Review / Approval (out of band; signer → Permit)
  ↓ Permit (signed; binds proposal_digest/target/base_sha256/executor)
Bridge Adapter (v0.5.1 — orchestration ONLY)
  │ 1. Proposal + Permit validation        → delegates to Mutation Gate
  │ 2. Lease precheck (read-only query)    → delegates to Bridge
  │ 3. Execute via Mutation Gate executor  → single append + audit
  │ 4. Mirror audit facts into Bridge journal (append-only)
  ↓
Mutation Gate → Rational Delirium Vault (B + S exactly once)
  ↓
Obsidian plugin (READ-ONLY UI) renders the update
```

---

## 2. Interface Boundary

### Adapter input

```text
Proposal   (id, actor, target, operation=APPEND_EXISTING_NOTE,
            payload, base_sha256, proposal_digest)
Permit     (permit_id, proposal_digest, target, base_sha256,
            selected_executor_id, approval_identity, timestamp,
            approval_signature)
context    (executor_id, device platform identity)
```

### Adapter output

```text
APPLIED                    mutation verified, file == B + S
REJECTED:<reason>          nothing was written (validated pre-write)
EXECUTION_UNCERTAIN:<reason> write MAY have happened; human follow-up required
```

### Decision ownership (who decides what — one owner each)

| Decision | Owner | Rationale |
|---|---|---|
| Is the research/proposal worth doing? | Agent | reasoning, out of scope |
| May this mutation proceed at all? | Human approver (Permit signature) | the Gate verifies, never grants |
| Payload intact / digest / operation valid? | Mutation Gate (proposal validation) | frozen v0.5.0 semantics |
| Permit authentic + bound to this proposal? | Mutation Gate (permit verification) | signer abstraction |
| One-permit-once / duplicate / uncertain retry? | Mutation Gate (admission + audit) | cross-process lock |
| Byte-exact append + readback? | Mutation Gate (executor) | B + S contract |
| Does a valid lease cover this note+writer NOW? | Bridge (lease query) | single-active-writer model |
| Is the vault state safe to write (no pending sync hazard)? | Bridge | sync safety rules |
| Journal/audit records persisted? | Gate audit (primary) + Bridge journal (mirror) | §4 |
| How results are displayed? | Plugin (READ-ONLY) | never a write path |

The Adapter itself owns NO policy: it sequences and translates. Any
"no" from either subsystem terminates with that subsystem's reason
surfaced verbatim.

---

## 3. Lease Integration

### Existing Bridge lease model (reviewed, not redesigned)

From `BRIDGE_POLICY.json` (v0.3.2 schema), read-only review:

- `write_coordination: transferable_lease`,
  `single_active_writer_per_note: true`
- `lease_activation_required: true`; activation is explicit
- `auto_force_takeover: false`
- writers keyed by trusted platform detection:
  `windows: win-zcode-glm`, `macos: mac-codex-astra`
- odd/even ID sharding per platform; allowed write roots are the
  knowledge roots (CASES/EVIDENCE/HYPOTHESES/LOOPS/ARCHIVE)
- state lives under `.astra/bridge_state/`:
  `lease_requests/ lease_activations/ leases/ operations/ ownership/
  proposal_results/`

The Adapter is a NEW CALLER of this existing model — no lease
redesign, no schema changes.

### When lease validation happens

Sequence inside the Adapter:

```text
1. Gate: validate Proposal + Permit (pure; no I/O side effects)
2. Bridge: lease precheck for (target note, actual writer identity):
     valid active lease covering this note for THIS writer? 
3. If 1 and 2 both pass → Gate: execute (single append + audit)
4. Bridge: journal mirror (§4)
```

Lease check happens (a) after cryptographic validation so we never
touch Bridge state with an invalid permit, and (b) BEFORE the Gate
write, because the lease answers "am I the rightful writer NOW" —
the one question the Gate cannot answer.

### If no valid lease exists

```text
→ Adapter returns REJECTED:NO_ACTIVE_LEASE
→ NO automatic lease takeover
→ NO forced ownership transfer (policy: auto_force_takeover=false)
→ the Proposal/Permit remain valid cryptographically; a human may
  activate/transfer a lease explicitly and re-run the same permit
  (execution-uniqueness still guards double-apply)
```

The Adapter NEVER requests or activates leases itself: lease
acquisition stays a human/bridge-owned operation (mirrors
"no automatic takeover").

---

## 4. Journal Integration

### Mapping

```text
Mutation Gate audit (append-only JSONL, record_sha256-chain)
        ↓ (fact mirror, one journal entry per APPLIED / UNCERTAIN)
Bridge journal / operations records (.astra/bridge_state/operations/)
```

### What is SHARED (mirrored into the Bridge journal)

```text
permit_id, proposal_id, proposal_digest
target (vault-relative note path)
actor (from proposal)
actual executor (MG-06 semantics)
result (APPLIED / EXECUTION_UNCERTAIN:… / REJECTED:…)
before_sha256 / after_sha256
timestamp
gate-audit record_sha256   ← pointer, not a copy
```

### What remains SEPARATE

```text
Gate keeps:  approval signature, approval_identity, payload bytes
             (base64), selected vs actual executor detail, lock files
Bridge keeps: lease lineage (who held which lease when), sync
             observations, ownership history, writer identities
```

Rationale: signatures and payloads are approval-domain facts; lease
lineage is coordination-domain fact. The Bridge journal receives
**facts + a verifiable pointer** (the Gate record digest), so either
ledger can be audited independently; neither becomes a superset.
Mirroring is append-only and failure-tolerant: a mirror failure after
an APPLIED append is recorded as an Adapter-level warning, never as a
mutation failure, and never triggers re-execution.

---

## 5. Executor Identity

Multi-device model is first-class (already real today:
`win-zcode-glm`, `mac-codex-astra`):

```text
requested_executor  — the executor the PERMIT names (approval-time
                      intent; who the human expected to run it)
actual executor     — the executor that ACTUALLY ran it (recorded in
                      every audit record; MG-06) and whose platform
                      identity the Bridge lease check validates
approval identity   — the signer of the Permit (who approved), kept
                      independent from both executors
```

Rules:

- Executor identity maps to the Bridge's platform-detected writer
  identity (trusted runtime platform detection only — no
  self-declared names).
- NO permanent executor ownership: a permit names an executor, but
  that binding is per-permit. Re-routing to a different executor in
  the future = a new approval (new permit), not a mutation of the old
  one.
- Adapter enforces: `actual == requested` at admission (existing
  Gate check). Any mismatch is a rejection, never a silent
  substitution.
- Future agents join by (a) becoming a Bridge writer identity and
  (b) being nameable in permits — no Adapter change.

---

## 6. First MVP Scope (v0.5.1)

Supported:

```text
APPEND_EXISTING_NOTE  (unchanged B + S semantics from the frozen gate)
```

NOT supported (explicitly out):

```text
delete
rename
multi-note transactions
relationship mutation (frontmatter semantic edits)
automatic conflict resolution
automatic lease management
```

Each unsupported operation must fail as `REJECTED:UNSUPPORTED_OPERATION`
at the Adapter boundary — never silently degraded into an append.

---

## 7. Failure States

| State | Meaning | File changed? | Retriable? |
|---|---|---|---|
| `REJECTED:INVALID_APPROVAL` | signature/binding invalid | no | only with new permit |
| `REJECTED:NO_ACTIVE_LEASE` | Bridge: writer lacks lease on note | no | yes, same permit after human lease action |
| `REJECTED:STALE_BASE_HASH` | note changed since proposal | no | no — new proposal needed |
| `REJECTED:DUPLICATE_PERMIT` | permit already applied/uncertain | no (already once) | never |
| `REJECTED:SYNC_HAZARD` | Bridge reports pending sync conflict | no | after human sync resolution |
| `EXECUTION_UNCERTAIN:<reason>` | write began, verification failed | MAYBE | never automatically — human decides |

Two global rules:

1. **Never pretend failure means "nothing happened"** — post-write
   failures are `EXECUTION_UNCERTAIN` with preserved evidence (frozen
   MG-04 semantics; the Adapter surfaces, never downgrades).
2. **Never re-run an uncertain permit** — blocked in the Gate's audit;
   the Adapter adds no bypass.

Sync-conflict note: Syncthing is not a distributed lock (policy
line); the Adapter treats any observed `.sync-conflict*` touching the
target as `REJECTED:SYNC_HAZARD` pre-write, and leaves resolution to
humans/existing tooling.

---

## 8. Real Usage Scenario

```text
1. Codex (macOS) researches a recurring evidence pattern
      → drafts Proposal: APPEND_EXISTING_NOTE to EVIDENCE/E-042.md
        (payload = new observation block, base_sha256 = current hash)
2. Codex submits Proposal + requested_executor = mac-codex-astra
3. ZCode (Windows) reviews content + hash + target
      → comments; Codex revises (new digest)
4. Human approves the final digest
      → signs Permit (approval_identity = human's signer)
5. Executor runs the Adapter:
      Gate validates ✓ → Bridge lease for mac-codex-astra on
      E-042.md ✓ → Gate executes one append (B+S) ✓ → audit ✓
      → Bridge journal mirror ✓
6. Syncthing propagates the append to Windows
7. Obsidian plugin (READ-ONLY) shows the updated note, its relations
   and the Investigation/LOOP/Graph views reflecting the new content
```

Failure walk-through in the same scenario: if the note drifted on
Windows before step 5, the Gate reports `REJECTED:STALE_BASE_HASH`;
Codex regenerates the proposal against the new base — nothing was
written, nothing was silently merged.

---

## Non-goals (restated)

No Astra runtime, no agent scheduler, no MCP server, no vector
database, no plugin write engine, no new mutation system. The plugin
stays READ-ONLY; Bridge stays the sole governed write authority; the
Gate stays the sole approval-verifier; the Adapter only composes.
