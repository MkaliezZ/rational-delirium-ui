# Example: Multi-Input Lineage Synthesis (FICTIONAL)

> Entirely fictional. No real threads, vaults, machines, or hashes.

## Scenario

Two Research Agents on different fictional devices produced
conflicting threads about a fictional latency metric. A Synthesis
Agent merges them into one draft without deciding who is right.

## Inputs (via input_references)

```text
- { kind: evidence, handoff_id: HO-FICT-301, digest: <fictitious> }
    thread A (device context X): benchmark shows 12ms median
- { kind: evidence, handoff_id: HO-FICT-302, digest: <fictitious> }
    thread B (device context Y): production log shows 40ms median
```

## Synthesis record (abbreviated)

```markdown
- synthesis_id: SYN-FICT-8
- input_references:
    - { kind: evidence, handoff_id: HO-FICT-301, digest: <fict.> }
    - { kind: evidence, handoff_id: HO-FICT-302, digest: <fict.> }

## Merge map
- common evidence: both threads cite the same fictional deployment
  window [W] (both handoffs)
- unique evidence: 12ms figure (301 only); 40ms figure (302 only)
- conflicts:
    C-1: thread A reports 12ms median [HO-FICT-301 / EV-A2];
         thread B reports 40ms median [HO-FICT-302 / EV-B1];
         unresolved — load profiles differ per thread assumptions

## Preserved dissent
- dissent: thread B notes A's benchmark ran on an idle-like
  fixture, "so 12ms is not representative" — carried verbatim
  from HO-FICT-302

## Merge honesty
- assumptions: both threads measured the same fictional system
- unknowns: unavailable — A's raw benchmark artifact (retention
  expired); unknown — whether load profiles were matched
- synthesis limits: C-1 is not decidable here; it goes to the
  Human labeled unresolved

## Output
- draft reference: DRAFT-FICT-42 — payload presents BOTH figures
  with their conditions and the C-1 conflict label; its conclusion
  is explicitly tentative
```

## What this Synthesis Agent did NOT do

- Did not pick 12ms or 40ms (or average them into "26ms")
- Did not soften thread B's "not representative" dissent
- Did not drop thread A just because its raw artifact was gone
- Did not turn "both measured the same window" assumption into fact
- Did not emit any approval or authority wording
