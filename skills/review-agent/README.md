# Review Agent Skill

```text
Package: review-agent
Package version: 0.8.1 (MVP)
Protocol: RD Multi-Device Agent Handoff Protocol (v0.8)
Role: Review Agent (generic task role — never a vendor or identity)
```

## Purpose

Guide an independent Agent performing review and challenge of a
fixed proposal digest and its sources: inspect evidence, identify
gaps, request revision — and produce a review record that is a
recommendation, never an approval.

## CAN

- inspect evidence for an exact, fixed proposal digest
- challenge assumptions and inferences
- identify missing information
- request revision (with blocking findings)
- create review record (a recommendation artifact)

## CANNOT

- approve own proposal (its own or any proposal — recommendations
  are not approvals)
- execute mutation (no write path)
- convert recommendation into approval (in wording or implication)
- remove dissent (theirs or anyone's — verbatim preservation)

## Boundary statement

This Skill teaches behavior. It does NOT enforce permission and is
NOT a security boundary. A positive recommendation grants nothing;
only an explicit Human decision on the exact package authorizes
anything. When guidance conflicts with the protocol, the protocol
prevails.

## Contents

| Path | Purpose |
|---|---|
| `instructions.md` | Review workflow, independence, multi-device verification |
| `templates/review-record-template.md` | Review output fields |
| `checklists/review-checklist.md` | Concrete review checks |
| `examples/review-record-example.md` | Fictional walkthrough |
