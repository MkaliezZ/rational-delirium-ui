# Rational Delirium — v0.5 Mutation Gate MVP Freeze

```text
PROJECT=RATIONAL_DELIRIUM
VERSION=v0.5.0-alpha
COMPONENT=mutation-gate (Python 3.11 stdlib, standalone)
FREEZE_BASE=b620cece8da1b2472f02bbf5a4ec45d04dffee91
TAG=v0.5.0-alpha-mutation-gate
VALIDATION=python -m unittest discover -s mutation-gate/tests → 24/24 OK
```

## 1. Purpose

The Mutation Gate exists to let a **prepared Agent Proposal** be
**human-approved** and **safely applied exactly once**, with complete
audit evidence. It is a governance primitive, not a workflow engine:
no autonomy, no background service, no agent-side decision making.

## 2. Architecture boundary

```text
Agent
  ↓  Proposal (id, actor, target, operation, payload, base_sha256, digest)
Review / Approval (human, out of band)
  ↓  Permit (permit_id, proposal_digest, target, base_sha256,
             selected_executor_id, approval_identity, timestamp,
             approval_signature)
Mutation Gate
  ↓  validation → admission → byte-exact append → readback verify
Controlled mutation (B + S) + immutable audit record
```

## 3. Supported mutation

Only:

```text
APPEND_EXISTING_NOTE
```

Final file bytes MUST equal `B + S` exactly — no frontmatter rewrite,
no formatting normalization, no newline conversion, no metadata
update. No create / delete / rename / relation mutation.

## 4. Security invariants

- **Approved payload equals executed payload.** The proposal digest
  binds the payload (base64 in canonical JSON); `Proposal` snapshots
  bytes-like input into immutable `bytes` at construction (MG-03), so
  a caller-owned buffer mutated after approval cannot change what
  executes; a tampered payload fails the digest check.
- **One permit produces at most one mutation.** Admission is
  serialized by a two-layer lock keyed on the canonical shared-state
  identity + permit_id (in-process shared lock + OS advisory file
  lock), covering duplicate check → admission → mutation → audit
  persistence. Path aliases of the state file converge to one lock
  key (MG-02).
- **Audit identity records the actual executor.** Every audit record
  carries `executor` = the processing executor; the permit's
  requested executor is stored separately (MG-06). Records are
  append-only JSONL with per-record self-digests (`verify_chain`).
- **Uncertain execution is not reported as ordinary failure.** Any
  failure after the write begins is recorded as
  `EXECUTION_UNCERTAIN:<reason>` — evidence preserved, and the permit
  is blocked from automatic retry (MG-04). Both `APPLIED` and
  `EXECUTION_UNCERTAIN` permits can never enter the append stage
  again.
- **Mutation scope is restricted.** Targets are vault-relative `.md`
  paths without traversal/absolute/drive forms; every path component
  is checked against symlink / Windows reparse points; the file is
  opened once (`O_RDWR|O_APPEND`) and the whole component identity
  chain is re-verified after open ("identity sandwich") so the write
  object is the validated object. Empty payloads are rejected;
  whitespace payloads are preserved byte-exactly (MG-05).

## 5. Trust boundary (MG-01, documented assumption)

The stdlib implementation does **not** claim absolute filesystem
TOCTOU elimination against a hostile concurrent actor.

**Assumption:** the mutation root and its ancestor directories are
trusted — they are not concurrently renamed or replaced by an
external actor during execution.

Within that boundary, the preserved symlink/reparse checks, the
identity sandwich around the single `open()`, and safe-failure
behavior reject the realistic replacement races. This Python build
has no `dir_fd` support (verified), so handle-based binding is
approximated by file-ID identity; a kernel-level path-resolution
layer is out of scope for this MVP.

## 6. Known limitations

- **MockSigner**: approval identity uses a local HMAC mock; interface
  is ready for Ed25519, but no real key management yet.
- **No distributed executor coordination**: locking is local
  (single machine, shared filesystem state); no network/quorum.
- **No Bridge integration yet**: the Mutation Gate is standalone; the
  governed bridge is untouched.
- **No Obsidian integration yet**: not wired into any plugin UI.
- Concurrency: file append is guarded by the permit lock, but there
  is no general file locking for unrelated writers on the same note.
- No transaction journal: crash between append and audit is covered
  by `EXECUTION_UNCERTAIN` semantics, not by rollback.

## 7. Future integration point

```text
Future:  Mutation Gate → controlled write primitive for a Bridge Adapter
```

The gate is intended to become the ONLY path through which governed
agents append to notes, behind human approval. Bridge integration,
executor discovery, and real signing are future work — **not
implemented in this freeze**.
