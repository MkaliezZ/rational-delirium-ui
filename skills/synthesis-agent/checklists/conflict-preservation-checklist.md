# Conflict Preservation Checklist

Run before emitting any synthesis output.

## Lineage completeness

- [ ] input_references lists EVERY consumed work product
      ({kind, handoff_id, digest?} per entry)
- [ ] No thread silently dropped (even one whose evidence was all
      unavailable)
- [ ] If this synthesis has a predecessor revision: both
      revision_reference (own line) AND input_references (threads)
      are present

## Dissent preservation

- [ ] Every disagreement from every input appears verbatim in the
      output or the record's dissent field
- [ ] No "broadly/essentially/generally" summarization of dissent
- [ ] Reviewer disagreement (if a review was among inputs) kept as
      a position, not an error

## Conflict labeling

- [ ] Each conflict shows: thread A claim + reference, thread B
      claim + reference, "unresolved" label
- [ ] No silent winner; no weighted average; no "most threads say"
- [ ] Common evidence cites ALL supporting threads, not just one

## Epistemic discipline

- [ ] No inference upgraded during merge (source-statement stays
      quotation; inference stays labeled)
- [ ] No new material absent from all inputs
- [ ] Merge's own assumptions and unknowns declared separately

## Output honesty

- [ ] Output is a DRAFT — no approval/authority wording anywhere
- [ ] "cannot-synthesize" used when conflicts are irreconcilable
      (with the conflict map as evidence) instead of a forced merge
