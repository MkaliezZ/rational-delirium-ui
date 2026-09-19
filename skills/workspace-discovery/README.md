# Workspace Discovery Skill

```text
Package: workspace-discovery
Package version: 0.9.1 (MVP)
Design: docs/RD_V0_9_0_WORKSPACE_INTELLIGENCE_DESIGN.md
Role: Discovery-Assistant (generic task role — never a vendor/device)
Position: BEFORE the v0.8 lifecycle (Skill → Workflow → … → Knowledge)
```

## Purpose

Help an Agent discover possible Rational Delirium workspace
candidates, report observable evidence and unknowns, and prepare a
decision package — so the **Human** can approve one candidate as the
workspace context for a specific scope (workspace engagement).

**Core principle: a synchronized folder is NOT automatically a
workspace.** A Syncthing folder, Obsidian Sync folder, git
repository, cloud drive folder, or NAS directory is only a possible
*candidate source*. A discovery result is a **candidate path** —
never workspace identity, never authority, never ownership, never
canonical truth.

## Architecture position

```text
Storage / Sync Environment (any provider — transport only)
  ↓
Workspace Discovery Skill   (this package — guidance only)
  ↓
Candidate Paths Report      (workspace-discovery-report)
  ↓
HUMAN APPROVAL              (mandatory; the Agent never chooses)
  ↓
Workspace Engagement Record (workspace-engagement-record)
  ↓
Agent Workflow              (v0.8 lifecycle unchanged)
```

## CAN

- inspect possible workspace locations
- collect observable indicators
- compare candidates (differences/observations/missing info only)
- report metadata
- preserve unknowns
- create a discovery report

## CANNOT

- select workspace automatically
- approve workspace
- infer ownership
- infer user intention
- bind a candidate automatically
- delete candidates
- merge candidates
- modify synchronization configuration
- move files
- grant permissions

## Boundary statement

This Skill teaches behavior. It is NOT a runtime service, NOT a
workspace manager, NOT a scheduler/daemon/orchestrator, and NOT a
security boundary. Workspace Discovery does not replace the Human
decision, approval, Bridge admission, or the Mutation Gate — it
happens **before** the workflow and grants nothing. When guidance
conflicts with the protocol design (RD_V0_9_0), the design prevails;
when the host lacks a needed capability (e.g. no filesystem read),
report the gap and stop — never guess.

## Contents

| Path | Purpose |
|---|---|
| `instructions.md` | Discovery workflow, indicator discipline, comparison rules, failure cases |
| `templates/workspace-discovery-report.md` | Candidate report fields |
| `templates/workspace-engagement-record.md` | Human-approved engagement record fields |
| `examples/multi-candidate-example.md` | Fictional two-candidate walkthrough |
