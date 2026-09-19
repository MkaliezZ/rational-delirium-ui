# Workspace Discovery Report Template (guidance only)

> Observations and unknowns only — NO recommended candidate, NO best
> candidate, NO canonical candidate anywhere in this report.
> Fictional placeholders; "unknown / unavailable / not-performed"
> are valid, expected values.

```markdown
## Discovery report

- report_id:           <unique id>
- created_by:          <Agent Instance id + Discovery-Assistant role>
- timestamp:           <UTC ISO-8601>
- inspected scope:     <what locations/source classes this instance
                        could actually inspect; unchecked classes are
                        listed as not-performed>

# Candidate List

## candidate-001

- path:                    <as seen by THIS Agent Instance>
- provider:                <observable transport/context only —
                            e.g. a sync/cloud/network provider label,
                            or "unknown"; never authority>
- observed indicators:     <strong/medium/weak, each item listed>
- repository indicators:   <.git present? history readable? — or
                            not-performed>
- vault indicators:        <.obsidian present? note shape? — or
                            not-performed>
- recent activity:         <observable modification info — or
                            unavailable/not-performed>

Observed:
  - <e.g. .obsidian exists>
  - <e.g. docs directory exists>
  - <e.g. workflow artifacts found>

Unknown:
  - <e.g. user intention unknown>
  - <e.g. active/inactive workspace unknown>

## candidate-002
  …(same structure per candidate)

# Comparison

(Differences, observations, missing information ONLY — no ranking)

## candidate-001 vs candidate-002

- <e.g. candidate-001 contains additional workflow artifacts>
- <e.g. candidate-002's git history was not readable (not-performed)>
- <e.g. relationship between the two candidates (copy? fork?
   unrelated?) unknown>

# Conflict Report

- <e.g. multiple possible workspaces: candidate-001, candidate-002>
- <e.g. divergent versions observed between …>
- <e.g. ownership unknown for …>
- <e.g. missing metadata for …>

(or "no conflicts observed" — still list remaining unknowns)
```

Rules:

1. Every indicator is something actually observed; strength labels
   are honest (weak stays weak).
2. Provider fields are context metadata; no provider status implies
   correctness.
3. The report ends at evidence. Selection happens in the Human's
   workspace engagement decision — never here.
