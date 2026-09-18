# Example: Execution Handoff & Outcome (FICTIONAL)

> Entirely fictional. No real Vault, permit, executor, signature,
> lease, hash, or audit reference. Illustrates handoff shape and
> honest outcome reporting only.

## Scenario

After a Human explicitly approved PROP-2094-ALPHA r2 (fictional),
the trusted signing path issued a fictional Permit. An Executor
Assistant prepares the handoff — it does not append bytes itself.

## Handoff package (what the Executor Assistant passes on, unchanged)

```markdown
- proposal:       PROP-2094-ALPHA r2 (digest 9d2f…example…61bb)
- permit:         PERMIT-EXAMPLE-0001 (issued by trusted signing path;
                  binds digest, target, base hash, selected executor,
                  approval identity, timestamp)
- target:         EVIDENCE/NOTE-77.md @ Fictional Vault "sandbox-two"
- selected executor: fictional-executor-alpha (verified runtime identity)
- review ref:     independent review REC-55 (digest matches; recommend
                  approval; no blocking findings)
- human decision: explicit approval recorded by Approval Assistant
                  (reference HUMAN-DEC-771)
```

The authorized runtime then runs: Bridge Adapter → Bridge validation
(lease / writer / expiry / sync hazard) → Mutation Gate.

## Outcome A — APPLIED (fictional)

```markdown
- result:         APPLIED
- actual executor: fictional-executor-alpha (== selected; binding held)
- before sha256:  3f1c…example…9a02
- after sha256:   a10d…example…e873
- audit:          gate audit record EXAMPLE-REC-1 (record digest 44aa…)
- downstream:     sync observed at 11:41Z; read-only UI shows the note
                  (recorded SEPARATELY from the execution fact)
```

Report honestly: APPLIED + audit is the execution fact. Sync and UI
observation are separate observations. A missing observation later
would NOT justify re-appending.

## Outcome B — REJECTED:STALE_BASE (fictional alternative)

```markdown
- result:         REJECTED:stale base hash (file is c92b…, proposal
                  bound 3f1c…)
- what happens:   nothing was written; the proposal is obsolete.
                  Required next step: NEW proposal against the current
                  base + fresh review + new approval. NO auto-merge,
                  NO executor swap to "force" success.
```

## Outcome C — EXECUTION_UNCERTAIN (fictional alternative)

```markdown
- result:         EXECUTION_UNCERTAIN:io error during verification
- what happens:   the write MAY have happened; evidence preserved.
                  NO automatic retry; NO new permit to bypass the
                  blocked one; the Human investigates actual file
                  state before ANY new operation.
```

## What the Executor Assistant did NOT do

- Did not append bytes directly or "simulate" success
- Did not recompute or "fix" the permit/digest
- Did not force a lease or check hazards against a different root
- Did not downgrade UNCERTAIN into an ordinary failure
- Did not re-run the append when the UI seemed laggy
- Did not claim truth — it reported an execution result and evidence
