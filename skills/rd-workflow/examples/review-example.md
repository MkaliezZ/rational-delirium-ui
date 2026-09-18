# Example: Review (FICTIONAL)

> Entirely fictional. No real reviewer, Vault, digest, or decision.
> A review reports findings and a recommendation — it is not
> approval.

## Scenario

A Review Agent (different session/context than the author)
independently insests proposal PROP-2094-ALPHA r2 (fictional).

## Filled review (guidance fields)

```markdown
## Review
- reviewer identity:   review-assistant (independent session 12;
                       no shared context with authoring session)
- proposal reference:  PROP-2094-ALPHA r2
- proposal digest:     9d2f…example…61bb   (exact digest reviewed)
- reviewed at:         2026-01-15T11:03Z

## Evidence quality
- relevance:           [S1] §3.2 supports the timing claim;
                       [S2] FICT-LOG-881 supports the value claim
- limitations found:   [S1] is 6 days older than [S2]; drift possible
- contradictory evidence: none found in available fictional sources

## Source traceability
- sources inspected:   [S1], [S2]
- sources unavailable: [S3] — could not be retrieved (explicit)
- claim→source mapping: timing→[S1]; value→[S2]; none unmapped

## Scope check
- one existing note, append-only: yes
- unrelated changes hidden in payload: no
- frontmatter or relation edits smuggled in: no

## Inference vs fact
- assumptions:         both fictional reports describe the same unit
- epistemic upgrades:  none — hypothesis labeled as inference
- alternative explanations preserved: yes (sensor drift noted)

## Mutation risk
- payload boundary exact: yes — 418 bytes, trailing newline disclosed
- preview vs bytes:    none — preview matches byte disclosures
- base hash freshness: observed same day; low risk

## Findings
- blocking:            none
- non-blocking:        NB-1 conclusion wording "confirms" too strong;
                       suggest "is consistent with" (addressed in r2)

## Recommendation
- [x] recommend approval   (workflow meaning only — Human decides)
```

## What the reviewer did NOT do

- Did not approve the change (recommendation ≠ approval)
- Did not edit the proposal "helpfully" (immutability — findings only)
- Did not re-review r1's digest and call it valid for r2
- Did not drop [S3] silently — unavailability stays explicit
- Did not certify the hypothesis as fact
