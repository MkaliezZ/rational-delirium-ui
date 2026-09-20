<!-- RD v1.7.2 — Proposal example. ENTIRELY FICTIONAL: all
     identifiers are FICT- prefixed placeholders; no real knowledge
     claims are made. Demonstrates a Researcher-role agent proposing
     a hypothesis revision grounded in cited evidence. -->

# Proposal

## Metadata

- proposal_id: PROP-20260920-001
- author_agent: "FICT-AGENT-RESEARCHER-1 (example host, researcher role)"
- created_at: "2026-09-20T08:15Z (host clock, UTC)"
- target_object_id: "FICT-KO-20260919-0007"
- target_object_type: "HYPOTHESIS"

## Requested Change

Revise the target HYPOTHESIS object's wording from "the fictional
process always completes in one pass" to "the fictional process
completes in one pass under condition C (single observed run);
multi-pass behavior is unknown", and add a `supports` relation from
the evidence object FICT-KO-20260919-0042 to the revised object.
No change is applied by this proposal.

## Evidence

- FICT-KO-20260919-0042 (EVIDENCE object): fictional log line
  "single pass, condition C observed" — acquired from the fictional
  workspace's EVIDENCE folder, read 2026-09-20.
- Inference (labeled): the one observed run does not establish
  "always"; the revision narrows the claim to the observed scope.

## Reasoning

The hypothesis currently asserts an unbounded "always". The only
available evidence covers one run under one condition. Narrowing
the claim preserves the hypothesis's usefulness while keeping the
unobserved cases explicitly unknown. Alternative considered:
rejecting the hypothesis entirely — rejected because the evidence
does not contradict the narrow reading.

## Expected Impact

If a Human applies this: a successor HYPOTHESIS object (revises
the target), one new `supports` relation (FICT-KO-20260919-0042 →
successor), target becomes superseded per normal revision
semantics. Lineage and prior wording preserved.

## Status

pending
