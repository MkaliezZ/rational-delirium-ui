# Malformed Package Checklist (detection & reporting)

A malformed package is reported and refused — never silently
repaired. Fictional field names below follow the v0.8 schema.

## M-1 · Prohibited fields present

Detection: any approval / permit / signature / lease / execution-
authority field or wording.
Examples (all FICTIONAL, all malformed):

```text
- approval: granted-by reviewer-9        ← authority content
- permit_id: PERMIT-XYZ + signature      ← execution-layer material
- lease: held until 2030                 ← bridge-layer material
- authorized: true                       ← authority wording
```
Response: mark `malformed:prohibited-fields`, report, refuse.

## M-2 · Missing required fields

Detection: any of protocol_version / handoff_id / handoff_type /
creator_identity / timestamp / work_product_reference /
assumptions / unknowns / dissent absent (or not well-typed).
Note: an EMPTY assumptions/unknowns list is valid ("none
declared"); a MISSING one is malformed.
Response: `malformed:missing-fields(<list>)`, report, refuse.

## M-3 · Unknown protocol version

Detection: `protocol_version` not recognized by the receiving
context.
Response: `malformed:unknown-protocol-version(<value>)` — report;
do NOT guess compatibility or "interpret the intent".

## M-4 · Bad handoff_type or type/field mismatch

Detection: type outside the six-value enum; or a type whose
required pattern is violated (e.g. proposal-for-review without
proposal_reference; synthesis-inputs without input_references).
Response: `malformed:type-mismatch`, report, refuse.

## M-5 · Digest problems

Detection:
- digest field not a real SHA-256 (64 hex) → `malformed:digest-format`
- covered object available AND mismatch → `digest-inconsistent`
  (distinct from malformed: the package may be intact but its
  object differs — report both facts)
- digest recorded for an object the creator could not have held →
  treat as integrity concern; report
Response: report precisely which case; NEVER re-digest the new
content and continue; never assume benign modification.

## M-6 · Broken lineage

Detection: revision_reference/input_references point at nothing
reachable; an input list obviously incomplete vs the creator's own
claims (e.g. synthesis citing one thread while describing two).
Response: `malformed:lineage-gap(<details>)`, report, refuse.

## Reporting format (guidance)

```markdown
- package: <handoff_id or "unidentified">
- finding: malformed:prohibited-fields | missing-fields | …
- evidence: <the precise field/value observed>
- action: refused (not built upon); reporter <identity+context>
```

## Never

- silently repair / re-digest / normalize a malformed package
- "fix" missing honesty fields by inserting empty defaults
- forward a malformed package as if valid
- treat malformedness as evidence about the CONTENT's truth (it is
  a shape/binding fact only)
