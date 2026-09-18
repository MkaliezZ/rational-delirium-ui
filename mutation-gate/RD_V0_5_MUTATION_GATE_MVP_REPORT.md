# RD v0.5 — Mutation Gate MVP Implementation Report

```text
Platform: Windows
Agent: ZCode (GLM-5.3)
Date: 2026-09-18
Location: mutation-gate/ (this repository) (standalone, Python 3.11 stdlib)
```

## Objective met

"Allow a prepared Agent Proposal to be human-approved and safely
applied once, with audit evidence." — implemented as an isolated
library + executor; no engine, no autonomy, no background service.

## Changed files (all NEW; nothing existing modified)

```text
mutation_gate/__init__.py       package surface
mutation_gate/model.py          Proposal / Permit / canonical JSON digests
mutation_gate/signer.py         Signer protocol + MockSigner (HMAC-SHA256) + VerifyingParty
mutation_gate/validation.py     pure proposal/permit validation (Rejection reasons)
mutation_gate/executor.py       admission → checks → byte-exact append → readback → audit
mutation_gate/audit.py          append-only JSONL audit log with self-digesting records
tests/test_mutation_gate.py     11 isolated tests (3 PASS + 5 reject required + 3 model edges)
RD_V0_5_MUTATION_GATE_MVP_REPORT.md   this report
```

## Design notes

- **Proposal** binds: id, actor, target, operation (only
  `APPEND_EXISTING_NOTE`), payload bytes, `base_sha256`.
  `proposal_digest` = SHA-256 over canonical JSON (sorted keys, tight
  separators, payload as base64) — any later payload tampering breaks
  the digest. Target validation: vault-relative, no absolute /
  traversal / drive letters, `.md` only.
- **Permit** binds: permit_id, proposal_digest, target, base_sha256,
  selected_executor_id, approval_identity, timestamp, and an
  `approval_signature` over the canonical permit content. Signer is
  an interface (`sign`/`verify`) — MockSigner (HMAC-SHA256, local
  secret) for MVP; an Ed25519 implementation drops in without
  touching validation/executor. No key management attempted.
- **Executor** sequence: proposal validation → approval verification
  (signature + digest/target/hash/identity bindings) → executor
  admission (this executor is the selected one) → duplicate-permit
  check (an APPLIED permit never re-executes; tracked via the audit
  log's APPLIED records) → current file hash vs base (stale check) →
  append payload bytes in binary append mode (no rewrite, no
  frontmatter/formatting/newline touch) → `fsync` → readback must
  byte-equal `B + S` and hash-equal the predicted after-hash → audit.
  Every rejection produces an audit record with
  `result=REJECTED:<reason>` and leaves the file untouched.
- **Audit**: append-only JSONL; each record carries the required
  fields plus its own `record_sha256` (digest of the canonical record
  body), so in-place edits are detectable (`verify_chain()`).

## Test results (python -m unittest, run 3×)

```text
11 tests, 0 failures — OK (×3)
PASS cases: valid append (exact B+S), audit record fields + chain,
            before/after hashes correct
Reject cases: invalid approval signature, payload modified after
              approval (digest mismatch), stale base hash,
              duplicate permit execution, wrong executor
Model edges: missing field, invalid operation, traversal targets
Determinism: proposal digest stable across constructions
Read-only scan: only append-mode opens; no remove/rename/network/subprocess/.astra
```

## Limitations (explicit)

- Mock signer is symmetric and local — NOT real approval identity;
  Ed25519 + key handling is future work (interface ready).
- One-permit-once tracking derives from the audit log of the SAME
  state directory; no cross-machine replay protection.
- Append is not transactional across power loss (fsync + readback
  verify is best-effort MVP hardening, no journal).
- Concurrency: no file locking — concurrent appends to the same note
  are unguarded.
- No CLI/REST surface, no UI, no Bridge integration — library only.

## Production integration touched?

**No.** The Obsidian plugin repo (`MkaliezZ/rational-delirium-ui`,
still at `8a6ea72`), v0.4.4 artifacts, `the production vault`
production vault, `.astra` and Bridge are all untouched. All tests
ran inside `tempfile` sandboxes. Nothing deployed, nothing pushed.
