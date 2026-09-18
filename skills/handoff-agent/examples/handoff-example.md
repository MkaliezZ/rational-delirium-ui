# Example: Handoff Packaging & Validation (FICTIONAL)

> Entirely fictional. No real vault, machine, proposal, digest, or
> secret. Demonstrates a conformant package and three malformed
> ones.

## A. Conformant package (proposal-for-review, abbreviated)

```markdown
- protocol_version: RD-handoff-v0.8
- handoff_id: HO-FICT-501
- handoff_type: proposal-for-review
- creator_identity: Research Agent, session 21, device context C
- timestamp: 2026-04-02T10:00Z
- work_product_reference: { kind: proposal, id: PROP-FICT-90,
                            digest: <fictitious 64-hex> }
- proposal_reference: PROP-FICT-90 r1, digest <same as above>
- source_information: Fictional Vault "sandbox-four";
  NOTES/TOPIC-FICT-3.md; base hash <fictitious, actually observed>;
  observed 2026-04-02T09:55Z
- payload_reference: artifact P90-payload.bin, 262 bytes,
  payload sha256 <fictitious>
- assumptions: [ threads describe the same fictional service ]
- unknowns: [ unavailable: fictional source [Q] — expired link ]
- dissent: none recorded
- revision_reference: (absent — r1)
- input_references:
    - { kind: evidence, handoff_id: HO-FICT-480, digest: <fict.> }
```

Validation pass: all required fields; type pattern satisfied;
digests well-formed; lineage coherent; no prohibited fields →
**accept as conformant** (acceptance is shape/binding only — the
content's truth is for review).

## B. Malformed: prohibited field

```markdown
… - approval: granted-by reviewer-9 ✗
```
→ `malformed:prohibited-fields` → report, refuse.

## C. Malformed: missing honesty field

```markdown
… - assumptions: [ … ]
    - unknowns: (entire field absent) ✗
```
→ `malformed:missing-fields(unknowns)` → report, refuse. (An
empty list would have been VALID — "none declared".)

## D. Digest-inconsistent (distinct from malformed)

The payload artifact, when actually obtained, hashes to a value
different from the recorded `payload_reference` digest.
→ Report `digest-inconsistent` with both values; refuse to build
on it. Do NOT re-digest the artifact and continue; do not assume
the modification was benign. (And remember: had it MATCHED, that
would prove consistency only — never authenticity.)

## What the Handoff Agent did NOT do

- Did not repair, re-digest, or "complete" any malformed package
- Did not create an approval, permit, signature, or execution
  request — and refused packages pretending to carry them
- Did not treat validation as a judgment of content truth
