# Example: Research Thread (FICTIONAL)

> Entirely fictional. No real vault, machine, source, or hash.

## Scenario

A Research Agent investigates why two fictional status reports
disagree about a system's throughput.

## Handoff package (research-thread, abbreviated to the honesty core)

```markdown
- protocol_version: RD-handoff-v0.8
- handoff_id: HO-FICT-201
- handoff_type: research-thread
- creator_identity: Research Agent, session 12, device context A
                     (declared — not a proof)
- timestamp: 2026-03-01T09:14Z
- work_product_reference: { kind: evidence, id: EV-FICT-9,
                            digest: <fictitious> }

## Evidence records (template per record)

  EV-1  claim "report P claims 400 units/h"
        source [P §2] (source-statement); excerpt quoted;
        acquired 09:02Z via authorized read; limitation: report is
        6 days older than log L
  EV-2  claim "log L shows sustained 250 units/h"
        source [L entry 551] (source-statement); artifact id
        FICT-LOG-551; acquired 09:05Z; limitation: sampling interval
        undocumented
  EV-3  inference "load conditions may differ between P and L"
        (agent-inference) building on EV-1 + EV-2

## source_information
  vault context: Fictional Vault "sandbox-three"
  note: REPORTS/STATUS-FICT-7.md
  observed base hash: <fictitious — actually observed, not invented>
  observation time: 2026-03-01T09:00Z

## assumptions
  - both documents describe the same deployment (unverified)

## unknowns
  - unavailable: [M] maintenance window table — archive unreachable
  - unknown: whether L's sampling interval is uniform

## dissent
  - none recorded (sources disagree on values; that conflict is
    carried in EV-1/EV-2, not resolved here)
```

## What this Agent did NOT do

- Did not resolve the 400-vs-250 conflict (that is review/Human work)
- Did not edit STATUS-FICT-7.md or any note
- Did not invent the [M] table's contents because it was unreachable
- Did not claim its throughput theory (EV-3) was observed fact
- Did not add any approval or authority field
