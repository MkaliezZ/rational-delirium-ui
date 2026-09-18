# Handoff Field Checklist (v0.8 schema conformance)

Field-by-field guidance per
docs/RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md §5.

## Required on every package

- [ ] `protocol_version` — recognized version; unknown → report
- [ ] `handoff_id` — stable unique id
- [ ] `handoff_type` — one of: research-thread | proposal-for-review
      | synthesis-inputs | review-record | decision-context |
      outcome-report (NOTHING execution-initiating exists)
- [ ] `creator_identity` — declared role + device context (a
      declaration, not a proof)
- [ ] `timestamp` — UTC ISO-8601
- [ ] `work_product_reference` — `{ kind, id, digest? }`; kind ∈
      proposal | review | synthesis | evidence; ONE primary product
- [ ] `assumptions` — possibly empty list (empty = "none declared")
- [ ] `unknowns` — possibly empty; unknown/unavailable/not-performed
      kept distinct
- [ ] `dissent` — possibly "none recorded"; verbatim otherwise

## Type-dependent

- [ ] `receiver_identity` — optional routing hint
- [ ] `proposal_reference` — id + revision + exact digest (required
      when discussing a proposal; must match the authoritative
      serializer's digest)
- [ ] `evidence_reference` — source refs + excerpts/artifact ids +
      acquisition context (research/proposal types)
- [ ] `source_information` — vault context + note path + observed
      base hash + observation time
- [ ] `payload_reference` — exact-byte artifact ref + byte length +
      payload SHA-256 (whenever a payload exists; computed only)

## Lineage (two kinds — never conflated)

- [ ] `revision_reference` — same-line succession only (r2 → r1/D1;
      supersedence semantics)
- [ ] `input_references` — list of `{ kind, handoff_id, digest? }`;
      REQUIRED for synthesis-inputs (every consumed thread); no
      ordering, no merge semantics implied
- [ ] A revised synthesis carries BOTH kinds

## Prohibited — presence makes the package malformed

- [ ] approval content or fields
- [ ] permit content
- [ ] signature material
- [ ] lease content
- [ ] execution authority / mutation permission of any wording
- [ ] any execution-initiating type or field

## Digest precision (state it when asked)

Digest = consistency between covered object and recorded digest
when both are available. It does NOT prove source authenticity,
complete tamper detection, historical immutability, provenance, or
truthfulness.
