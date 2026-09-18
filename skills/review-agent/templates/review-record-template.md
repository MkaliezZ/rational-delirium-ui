# Review Record Template (guidance only)

> A review record is a recommendation artifact. It is NOT approval.
> Fictional placeholders; "unknown" is valid, invention is not.

```markdown
## Review record

- review_id:            <unique id>
- reviewed digest:      <exact proposal digest — must match the
                         proposal_reference of the reviewed package>
- proposal reference:   <proposal_id + revision>
- reviewer identity:    <declared identity + device/session context>
- independence statement: <what makes this context independent of the
                         author's — separate session/source access/
                         no shared state; or "independence cannot be
                         established" (then the proposal stays
                         awaiting review)>
- timestamp:            <UTC ISO-8601>

## Findings

- blocking:             <numbered, each with severity + rationale;
                         or "none">
- non-blocking:         <same discipline>

## Sources

- inspected:            <references actually checked + how>
- unverifiable:         <references unreachable from this context —
                         explicit, never guessed>

## Consistency checks

- payload digest:       <consistent | inconsistent | not-checkable
                         (object unavailable)> — consistency only;
                         a match proves no authenticity
- lineage:              <revision_reference / input_references
                         present and coherent | gaps listed>

## Dissent

- preserved:            <any disagreement, verbatim, from any party;
                         or "none present">

## Recommendation

- [ ] request changes     <list what must change>
- [ ] reject               <reason>
- [ ] recommend approval   <a recommendation for the Human — grants
                            nothing; the Human decision is the only
                            approval that exists>
```

Rules:

1. The reviewed digest is frozen for this record; if the proposal
   changes, that is a successor revision needing fresh review.
2. Findings carry severity + rationale — bare adjectives are not
   findings.
3. Never edit the proposal; never insert approval language; never
   drop dissent.
