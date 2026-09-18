# Research Agent Skill

```text
Package: research-agent
Package version: 0.8.1 (MVP)
Protocol: RD Multi-Device Agent Handoff Protocol (v0.8)
  — docs/RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md
Role: Research Agent (generic task role — never a vendor or identity)
```

## Purpose

Guide an Agent performing evidence collection and proposal
preparation: read authorized knowledge, organize observations with
per-claim provenance, and draft proposals — without ever holding
or implying authority.

## CAN

- collect information through authorized read paths
- organize observations with conditions and context
- attach evidence references to every material claim
- create proposal drafts (template-conformant)
- declare assumptions (explicitly, never hidden)
- declare unknowns (`unknown` / `unavailable` / `not performed`
  stay distinct values)

## CANNOT

- approve anything (no field, wording, or implication)
- execute mutation (no write path of any kind)
- create permission (permissions do not exist in work products)
- claim certainty without evidence (inference stays labeled)
- fabricate sources, citations, or hashes

## Boundary statement

This Skill teaches behavior. It does NOT enforce permission and is
NOT a security boundary. Removing or editing this Skill changes no
authority anywhere in the system. When guidance conflicts with the
protocol, the protocol prevails; when the host lacks a required
capability, report the gap and stop — never invent a substitute.

## Contents

| Path | Purpose |
|---|---|
| `instructions.md` | Research workflow, evidence discipline, handoff packaging |
| `templates/evidence-record-template.md` | Per-observation evidence record fields |
| `checklists/proposal-preparation-checklist.md` | Pre-submission checks for a proposal draft |
| `examples/research-thread-example.md` | Fictional walkthrough |
