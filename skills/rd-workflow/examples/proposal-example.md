# Example: Proposal (FICTIONAL)

> Entirely fictional. No real Vault, note, path, hash, permit, or
> signature. Values are illustrative placeholders only.

## Scenario

A Research Agent examining a fictional case notebook notices a
recurring discrepancy between two fictional reports and prepares a
single append to an existing fictional evidence note.

## Filled proposal (guidance fields)

```markdown
## Proposal
- proposal_id:   PROP-2094-ALPHA
- revision:      r2
- supersedes:    PROP-2094 (r1 — reviewer asked for a narrower conclusion)
- actor:         research-assistant (session 7)

## Target
- vault context:   Fictional Research Vault "sandbox-two"
- target note:     EVIDENCE/NOTE-77.md
- operation:       APPEND_EXISTING_NOTE

## Base state
- base_sha256:           3f1c…example…9a02   (authorized exact-byte read)
- base observation time: 2026-01-15T09:12Z
- base freshness note:   note untouched for 40+ days; low drift risk

## Payload
- payload description: One Observation block, two linked fictional
  source excerpts, one labeled Hypothesis, one tentative Conclusion
- payload length (bytes): 418
- payload sha256:          b7e5…example…44c1   (computed from exact bytes)
- byte disclosures:       UTF-8, LF endings, trailing newline included

## Evidence
- evidence:
    [S1] Fictional Report A §3.2 — excerpt quoted
    [S2] Fictional Log B, entry 881 — artifact id FICT-LOG-881
- provenance:
    observation: reading note NOTE-77 and reports above (direct)
    quoted: [S1], [S2] (source statements)
    inference: hypothesis below is Agent-generated
- uncertainty: Report A predates Log B by 6 days; a third fictional
  source [S3] could not be retrieved — listed as unavailable

## Epistemic labeling
- observation / evidence / hypothesis / conclusion kept distinct: yes
```

## What the Agent did NOT do

- Did not modify NOTE-77, its frontmatter, or any relation
- Did not compute its own "digest" with ad-hoc JSON ordering
- Did not create NOTE-78 when tempted to "also fix" a sibling note
- Did not include any approval or signature field
- Did not treat r1's review as still valid for r2 (fresh review needed)
