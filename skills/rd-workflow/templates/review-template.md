# Review Template (guidance only)

> An independent review reports findings and a recommendation. It
> grants no authority and is not Human approval. Review the EXACT
> submitted digest — never a moving draft.

```markdown
## Review

- reviewer identity:      <who/what reviewed, and why context is independent>
- proposal reference:     <proposal_id + revision>
- proposal digest:        <exact digest reviewed>
- reviewed at:            <timestamp>

## Evidence quality

- relevance:              <does cited material actually support the claim>
- limitations found:      <…>
- contradictory evidence: <… or "none found">

## Source traceability

- sources inspected:      <which references were actually checked>
- sources unavailable:    <which could not be inspected — explicit>
- claim→source mapping:   <each material claim ↔ its source>

## Scope check

- one existing note, append-only: <yes/no>
- unrelated changes hidden in payload: <no / findings>
- frontmatter or relation edits smuggled in: <no / findings>

## Inference vs fact

- assumptions:            <…>
- epistemic upgrades:     <any inference presented as fact? list>
- alternative explanations preserved: <yes/no>

## Mutation risk

- payload boundary exact: <yes/no — byte length, trailing newline, whitespace>
- preview vs bytes:       <any rendered-preview vs actual-bytes mismatch>
- base hash freshness:    <current or stale-risk>

## Findings

- blocking:               <numbered findings that must be resolved, or "none">
- non-blocking:           <…>

## Recommendation

- [ ] request changes   <list what must change>
- [ ] reject            <reason>
- [ ] recommend approval  <still grants nothing; Human decides>
```

Rules:

1. Findings carry severity + rationale; "unavailable" sources stay
   explicit, never silently dropped.
2. Reviewer agreement is not consensus truth; preserve dissent for
   the Human.
3. A positive recommendation does not approve, execute, or certify.
4. This record is workflow evidence — the Permit does not
   cryptographically bind it.
