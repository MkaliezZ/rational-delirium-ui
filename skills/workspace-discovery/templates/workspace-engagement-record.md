# Workspace Engagement Record Template (guidance only)

> Records that the **Human approved using one discovered candidate**
> as the workspace context for a specific scope. Created ONLY after
> an explicit Human decision. It is NOT ownership proof, NOT global
> authority, NOT a permanent lock, NOT execution permission.

```markdown
## Workspace engagement record

- engagement_id:       <unique id>
- candidate_id:        <from the discovery report>
- selected_path:       <the candidate path the Human approved>
- approved_by_human:   <decision source — the explicit Human
                        message/reference; never an Agent judgment>
- scope:               <what this engagement covers — e.g. "v0.9.1
                        discovery-followup engagement"; binds ONLY
                        this scope>
- timestamp:           <UTC ISO-8601>
- notes:               <optional — e.g. alternatives the Human
                        considered, conditions stated>

## Context (links, not authority)

- discovery_report:    <report_id this engagement is based on>
- alternative candidates: <candidate_ids considered but not selected>
- recorded_by:         <Agent Instance id — recorder only, the
                        Agent did NOT decide>
```

Rules:

1. **Human decision is mandatory.** No record exists without an
   explicit approval; silence/timeout/acknowledgment never qualify.
2. The Agent records faithfully — including refusal, deferral, or
   ambiguity (recorded as such, not resolved).
3. Scope-limited: this record binds only the written scope; a
   different engagement re-verifies; switching workspaces later is a
   NEW Human decision with a NEW record.
4. **No authority granted:** selection authorizes using this path as
   workflow context — every downstream boundary (Human operation
   approval → Permit → Bridge admission → Mutation Gate execution)
   still applies unchanged.
