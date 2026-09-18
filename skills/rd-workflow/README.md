# RD Workflow — Universal Skill Package

```text
Package: rd-workflow
Package version: 0.6.2 (MVP)
Protocol: Rational Delirium Universal Workflow (v0.6)
  — docs/RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md (authoritative)
  — docs/RD_V0_6_1_AGENT_SKILL_PACKAGE_DESIGN.md (package design)
Supported operation: APPEND_EXISTING_NOTE (append to ONE existing note)
```

## What this package is

A **Skill Adapter** package of instructions, templates, review guides,
and fictional examples that teach any compatible Agent how to
participate in the Rational Delirium knowledge workflow:

```text
Research Agent → Review Agent → Human Approval
              → Permit → Executor Assistant handoff
              → Bridge Adapter → Bridge validation → Mutation Gate
              → Vault append + Audit
```

It is vendor neutral: any Agent that can follow the instruction
contract can participate. Host products (any coding assistant,
research assistant, or agent runtime) are examples, never protocol
roles or trusted identities.

## What this package is NOT

**This Skill is not a security layer and has no authority.**

### The Skill CAN

- explain the Rational Delirium workflow and its states
- guide proposal creation (target, evidence, provenance, base hash,
  exact append payload)
- guide independent review of a fixed proposal digest
- prepare the approval presentation for a Human decision
- explain execution results, failures, and uncertain outcomes
- explain how to hand off execution to the authorized runtime

### The Skill CANNOT

- approve changes (only a Human can)
- grant permissions, leases, or executor eligibility
- bypass the Bridge or its lease/sync validation
- bypass the Mutation Gate or its exactly-once/audit enforcement
- directly modify the Vault or append bytes itself
- certify truth or upgrade inference into fact
- mint, sign, or simulate a Permit
- retry an uncertain or already-consumed execution

When these instructions conflict with the protocol, **the protocol
prevails**. If the host runtime lacks a required capability, the
Skill explains the gap and stops the dependent handoff — it never
invents permission or an alternate write path.

## Package contents

| Path | Purpose |
|---|---|
| `instructions.md` | The workflow, roles, lifecycle, handoff and failure rules |
| `templates/proposal-template.md` | Guidance fields for preparing a proposal |
| `templates/review-template.md` | Guidance fields for an independent review |
| `templates/approval-request-template.md` | The single decision package for the Human |
| `review-guides/review-checklist.md` | Concrete review checks |
| `examples/proposal-example.md` | Fictional proposal walkthrough |
| `examples/review-example.md` | Fictional review walkthrough |
| `examples/execution-handoff-example.md` | Fictional handoff + outcome walkthrough |

Templates are **guidance only**. They contain no approval fields and
no pre-issued authorization. Examples are **entirely fictional**.

## Known limitations

- The Permit does not cryptographically bind a review digest or
  revision; independent review is a workflow prerequisite enforced by
  the Human, not a new Gate check.
- Cross-Vault replay protection depends on trusted runtime
  configuration; always present the intended Vault context.
- No host wrapper, installer, or discovery API is provided — hosts
  translate presentation only, never policy.
