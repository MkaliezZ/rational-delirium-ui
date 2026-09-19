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
      proposal | review | synthesis | evidence | decision-context;
      ONE primary product. NOTE: handoff_type and kind are
      SEPARATE concepts (workflow transition vs carried product) —
      never assume identical enum values; classify the actual
      product truthfully.
      - `evidence` = source material / traceable record of
        observations, source statements, or pre-existing state
        (epistemic basis: what was observed / what the source
        stated / where from / under what conditions). NOT
        proposals, recommendations, review findings, synthesis
        conclusions, decision-context, approvals, or inference
        relabeled as source fact. An artifact does not become
        evidence merely because it cites/summarizes/depends on
        evidence — classification follows the artifact's
        PRIMARY SEMANTIC FUNCTION. Boundary test: strip all
        workflow intentions,
        recommendations, judgments, and approval context — does it
        still represent observations/source material/pre-existing
        state? (semantic test only, no authority)
      - `decision-context` = informational work product assembled
        for Human consideration (references to reviewed workflow
        state + proposed exact operation; NO approval, NO
        execution authority — not a decision record, not a Permit,
        not an Execution Request). MAY reference evidence; IS NOT
        evidence.
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
