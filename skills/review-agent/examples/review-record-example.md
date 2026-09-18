# Example: Review Record (FICTIONAL)

> Entirely fictional. No real reviewer, proposal, digest, or vault.

## Scenario

A Review Agent on a different machine from the author reviews the
fictional proposal PROP-FICT-77 r1 (a throughput note append).

## Filled record (abbreviated)

```markdown
## Review record
- review_id: REV-FICT-31
- reviewed digest: <fictitious digest of PROP-FICT-77 r1>
- proposal reference: PROP-FICT-77 r1
- reviewer identity: Review Agent, session 4, device context B
- independence statement: separate session and source access from
  the authoring context; no shared state; author is on device
  context A
- timestamp: 2026-03-02T11:00Z

## Findings
- blocking:
    B-1 [major] conclusion says "confirms divergence" — EV-3 is
        agent-inference; wording must be "is consistent with
        divergence" (epistemic upgrade)
- non-blocking:
    NB-1 [minor] [M] maintenance table is declared unavailable;
         acceptable, but suggest noting it in the payload itself

## Sources
- inspected: [P §2] (fictional report — reachable, read directly);
  [L entry 551] (fictional log artifact — reachable, opened)
- unverifiable: [M] — archive unreachable from this context

## Consistency checks
- payload digest: consistent (covered object matches recorded
  digest — consistency only, no authenticity implied)
- lineage: revision_reference absent (r1 — correct); input
  references list the two evidence records — coherent

## Dissent
- preserved: none present

## Recommendation
- [x] request changes   (B-1 must be addressed in a successor
  revision; this record binds r1's digest only)
```

## What this reviewer did NOT do

- Did not approve anything (request-changes ≠ approval even if fixed)
- Did not edit the proposal to "fix" B-1 itself
- Did not guess what the unreachable [M] table says
- Did not treat the digest match as proof of authenticity
- Did not accept the author's self-review as independence evidence
