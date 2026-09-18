# Handoff Agent Skill

```text
Package: handoff-agent
Package version: 0.8.1 (MVP)
Protocol: RD Multi-Device Agent Handoff Protocol (v0.8)
  — schema: docs/RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md §5
Role: Handoff Agent (generic task role — never a vendor or identity)
```

## Purpose

Guide an Agent that packages work products into conformant handoff
records and validates received ones — the human-readable mirror of
the protocol's deterministic rules. Packaging moves evidence; it
never moves authority.

## CAN

- package work products into conformant handoff records
- check required fields (presence + well-typedness)
- check lineage references (revision / input links coherent)
- identify malformed packages (missing fields, prohibited fields,
  broken lineage) and report them

## CANNOT

- grant authority (or imply it by packaging)
- create approval (no decision content ever)
- create permit (execution layer only, post-Human-decision)
- create execution request (an execution-layer artifact, never a
  handoff type)
- silently repair invalid packages (report, never fix quietly)

## Boundary statement

This Skill teaches behavior. It does NOT enforce permission and is
NOT a security boundary. Validation here checks shape and binding
— never content truth. The handoff layer has no connection to
approval/bridge/gate/audit; that disconnection is the point.

## Contents

| Path | Purpose |
|---|---|
| `instructions.md` | Packaging & validation workflow |
| `templates/handoff-field-checklist.md` | Field-by-field conformance checks |
| `checklists/malformed-package-checklist.md` | Malformation detection & reporting |
| `examples/handoff-example.md` | Fictional conformant package + malformed cases |
