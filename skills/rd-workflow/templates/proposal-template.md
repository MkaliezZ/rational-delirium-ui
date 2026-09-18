# Proposal Template (guidance only)

> Fill every field honestly. "Unknown" is a valid, expected answer;
> invented values are not. This template creates no approval and no
> Permit. The authoritative serializer computes the proposal digest —
> never compute it with ad-hoc local JSON ordering.

```markdown
## Proposal

- proposal_id:            <stable unique id>
- revision:               <workflow revision, e.g. r1; successor = new id>
- supersedes:             <prior proposal_id + reason, or "none">
- actor:                  <authoring role/identity — NOT executor permission>

## Target

- vault context:          <which Vault this is intended for — present to Human>
- target note:            <ONE existing relative note path>
- operation:              APPEND_EXISTING_NOTE   (the only supported operation)

## Base state

- base_sha256:            <hash of exact current bytes via authorized read>
- base observation time:  <when observed>
- base freshness note:    <any risk the note changed since observation>

## Payload

- payload description:    <what this append says, in one paragraph>
- payload length (bytes): <N>
- payload sha256:         <SHA-256 of exact payload bytes — computed, not invented>
- byte disclosures:       <encoding, trailing newline, whitespace a preview may hide>

## Evidence

- evidence:               <source references + relevant excerpts/artifacts>
- provenance:             <source statement vs direct observation vs Agent inference — label each>
- uncertainty:            <limitations, contradictory evidence, alternative explanations>

## Epistemic labeling

- observation / evidence / hypothesis / conclusion kept distinct?
  <yes/no — inference is never upgraded into fact>
```

Rules (from the protocol, not optional):

1. Target must be ONE existing note. Never create, rename, delete, or
   switch targets on failure.
2. Payload is a non-empty append only — preserve encoding, line
   endings, whitespace, final newline exactly as approved.
3. Once submitted for review this revision is immutable; changes go
   into a successor proposal with a new id and digest.
4. Do not include any approval, signature, or Permit field here.
