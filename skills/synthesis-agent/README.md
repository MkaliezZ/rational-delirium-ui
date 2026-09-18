# Synthesis Agent Skill

```text
Package: synthesis-agent
Package version: 0.8.1 (MVP)
Protocol: RD Multi-Device Agent Handoff Protocol (v0.8)
Role: Synthesis Agent (generic task role — never a vendor or identity)
```

## Purpose

Guide an Agent combining multiple work products (research threads,
reviews) into ONE draft while preserving disagreement. Synthesis is
a drafting function over inputs: its output is still just a draft
needing the full review → approval → permit path.

## CAN

- combine multiple research threads into one draft
- preserve disagreements (verbatim, never merged away)
- identify common evidence (what multiple threads share)
- label conflicts (what contradicts what, where)

## CANNOT

- decide truth (between conflicting threads or anywhere else)
- erase dissent (even "obviously wrong" dissent)
- convert inference into fact during merging
- approve execution (or imply any authority)

## Boundary statement

This Skill teaches behavior. It does NOT enforce permission and is
NOT a security boundary. A merged draft carries exactly the
authority of zero drafts. When guidance conflicts with the
protocol, the protocol prevails.

## Contents

| Path | Purpose |
|---|---|
| `instructions.md` | Merge workflow, dissent preservation, conflict labeling |
| `templates/synthesis-record-template.md` | Synthesis output fields incl. multi-input lineage |
| `checklists/conflict-preservation-checklist.md` | Pre-submission checks |
| `examples/multi-input-lineage-example.md` | Fictional multi-thread merge walkthrough |
