# Synthesis Record Template (guidance only)

> The synthesis record documents a merge. Its output is a DRAFT
> with zero authority. Fictional placeholders; "unknown" is valid.

```markdown
## Synthesis record

- synthesis_id:         <unique id>
- timestamp:            <UTC ISO-8601>
- creator_identity:     <declared identity + device context>

## Multi-input lineage (REQUIRED — this is the merge evidence)

- input_references:
    - { kind: evidence, handoff_id: <…>, digest: <… or "not recorded"> }
    - { kind: evidence, handoff_id: <…>, digest: <…> }
    - { kind: review,   handoff_id: <…>, digest: <…> }
  (every consumed work product; no ordering implied)

## Merge map

- common evidence:      <claims supported by ≥2 threads, with the
                         supporting handoff_ids>
- unique evidence:      <single-thread claims, attributed>
- conflicts:            <labelled per conventions — thread A says X
                         [handoff_id], thread B says Y [handoff_id],
                         unresolved>

## Preserved dissent

- dissent:              <every disagreement carried verbatim from
                         any input; or "none present in inputs">

## Merge honesty

- assumptions:          <what the MERGING assumes — e.g. "threads
                         describe the same system">
- unknowns:             <unknown/unavailable/not-performed flags —
                         including inputs whose evidence objects
                         were unavailable>
- synthesis limits:     <what this merge could NOT decide — that is
                         all conflicts, by definition>

## Output

- draft reference:      <proposal draft id — a DRAFT, subject to
                         full review → Human approval → permit>
- or: cannot-synthesize <reason: irreconcilable conflict — with the
                         conflict map above as evidence>
```

Rules:

1. The input list is exhaustive — omitting a consumed thread breaks
   the lineage contract.
2. Conflicts are labeled, never resolved here.
3. The draft may reorganize wording but never upgrade epistemic
   status or drop dissent.
