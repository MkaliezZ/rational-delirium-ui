# Review Checklist

Concrete checks for an independent Review Agent. Findings are
recommendations — never authority. Bind the exact digest first.

## Binding & independence

- [ ] Exact proposal_id + revision + digest recorded (frozen target)
- [ ] Independence statement written (distinct session/context from
      the author) — or honestly declared absent
- [ ] Author's relabeled second pass NOT accepted as this review

## Consistency (not authenticity)

- [ ] Payload digest vs covered object compared where both available
      (match = consistency only; mismatch = digest-inconsistent,
      report and refuse; unavailable = "not-checkable")
- [ ] revision_reference / input_references coherent; gaps listed
- [ ] No prohibited fields present in the package (approval/permit/
      signature/lease/authority → malformed, report)

## Evidence & sources

- [ ] Each material claim maps to a source reference
- [ ] Reachable sources inspected (cited how)
- [ ] Unreachable sources declared unverifiable — not guessed,
      not counted against the proposal
- [ ] Provenance labels intact (source-statement / observation /
      inference never blurred)
- [ ] No manufactured citations found

## Reasoning quality

- [ ] Assumptions identified and challenged
- [ ] Inference presented as fact? → blocking finding
- [ ] Alternative explanations preserved
- [ ] Contradictory evidence carried, not reconciled away

## Scope & mutation risk

- [ ] One existing note, append-only
- [ ] No hidden edits (frontmatter/relations/rewrite) in the payload
- [ ] Byte disclosures present (length, newline, whitespace)
- [ ] Base hash freshness assessed; staleness risk flagged

## Output honesty

- [ ] Findings have severity + rationale
- [ ] Dissent preserved verbatim (or "none present")
- [ ] Recommendation is one of the three allowed values, phrased as
      a recommendation — no approval wording anywhere
