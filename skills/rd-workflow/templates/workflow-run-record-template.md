# Workflow Run Record Template (guidance only)

> Records ONE complete multi-Agent workflow execution. Every value is
> a placeholder — `<…>`. Never fabricate approvals, decisions, or
> execution results: unknown/unavailable/not-performed are valid and
> expected values, recorded explicitly.
>
> Reference: docs/RD_V0_7_MULTI_AGENT_WORKFLOW_MVP_DESIGN.md §3, §9.

```markdown
## Run record

- run_id:                <stable unique id>
- protocol_version:      <…>
- started:               <timestamp>
- ended:                 <timestamp, or "open">

### Proposal

- proposal_id:           <…>
- revision:              <…>
- proposal digest:       <exact digest>
- target:                <vault context + one existing note path>
- operation:             APPEND_EXISTING_NOTE
- base_sha256:           <…>

### Research

- agent role:            <Research Agent; independence context if
                          multiple threads — session/context identity>
- research handoff ids:  <…>
- evidence collected:    <source references + excerpts/artifact ids
                          + acquisition context + limitations>
- sources:               <inspected list + explicitly-unavailable list>
- unresolved questions:  <carried forward, or "none open">

### Synthesis (optional — only when multiple research threads merged)

- agent role:            <Synthesis Agent>
- input threads:         <handoff ids merged>
- dissent preserved:     <disagreements kept verbatim, or "none">
- merge notes:           <conflicts labeled, not silently resolved>

### Review

- reviewer role:         <Review Agent — distinct identity + context
                          from the author; declare the separation>
- review handoff id:     <…>
- findings:              <blocking + non-blocking, severity+rationale>
- recommendation:        request changes | reject | recommend approval
- third review (if any): <tie-break reviewer + its record, or "none">

### Human decision

- decision reference:    <explicit recorded reference — the Human's
                          own decision artifact/id>
- decision:              approve | reject | request revision
- acknowledged dissent:  <what disagreement the Human explicitly
                          accepted, or "none present">
- selected executor:     <verified runtime executor identity>
- approval assistant:    <role that presented the package — recorder
                          only, NOT the decider>

### Execution

- executor assistant:    <role that prepared the handoff>
- permit reference:      <issued by trusted signing path>
- Bridge result:         <verdict from Bridge Adapter — lease/writer/
                          expiry/sync-hazard; verbatim reason>
- Mutation Gate result:  APPLIED | REJECTED:<reason> |
                         EXECUTION_UNCERTAIN:<reason>   (verbatim)

### Final

- audit reference:       <Gate audit record id + record digest, or
                          "unavailable — reported as such">
- before sha256:         <…>
- after sha256:          <…, or "not applicable (rejected)">
- sync result:           <propagation observation + timestamp — a
                          SEPARATE fact from execution>
- plugin observation:    <read-only UI showed updated state — also
                          separate; "pending" is valid>

### Notes

- deviations:            <any step that differed from the standard
                          lifecycle, and why>
- gaps:                  <capability gaps discovered during the run>
```

## Rules

1. This record **describes**; it never approves, executes, or
   certifies. Approval lives only in the Human decision reference;
   execution truth lives only in the Gate result + audit.
2. Execution, audit availability, sync, display, and truth are five
   separate facts — never merge them.
3. Placeholders stay placeholders until real values exist. A run
   record with fabricated content is worse than no record.
