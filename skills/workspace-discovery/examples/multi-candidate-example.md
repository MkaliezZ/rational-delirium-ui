# Example: Multi-Candidate Discovery + Engagement (FICTIONAL)

> Entirely fictional. No real vault, machine, provider, or path.
> Demonstrates observation-only comparison, unknown preservation,
> the Human approval boundary, and a scope-limited engagement.

## Scenario

A Discovery-Assistant Agent Instance inspects two fictional
candidate directories for a new engagement.

## Discovery report (abbreviated)

```markdown
- report_id: DR-FICT-0042
- created_by: instance-17, Discovery-Assistant
- timestamp: 2026-05-01T10:00Z
- inspected scope: local filesystem (not-performed: network storage,
  cloud storage)

# Candidate List

## candidate-001
- path: ~/Work/FICT-RD-Workspace
- provider: unknown (no sync/cloud metadata observable)
- observed indicators:
    strong:  docs/RD_V0_8_… protocol documents present;
             workflow/ contains handoff + research artifacts
    medium:  .obsidian/ present with CASES/, EVIDENCE/ roots
    weak:    —
- repository indicators: no .git (observed absent, not unknown)
- vault indicators: .obsidian exists; RD-shaped note structure
- recent activity: workflow/ artifacts modified this week (observed)

Observed:
  - .obsidian exists
  - docs directory exists
  - workflow artifacts found

Unknown:
  - user intention unknown
  - active/inactive workspace unknown

## candidate-002
- path: ~/Archive/FICT-RD-Workspace-old
- provider: a fictional sync provider label observed in folder
  metadata (transport context only)
- observed indicators:
    strong:  —
    medium:  .obsidian/ present
    weak:    name resembles the project
- repository indicators: .git present; history not readable
  (unavailable)
- vault indicators: .obsidian exists; note structure differs
- recent activity: not-performed (mtime listing unavailable)

Observed:
  - .obsidian exists
  - folder name contains project-like words

Unknown:
  - ownership unknown
  - relationship to candidate-001 unknown (copy? predecessor?
    unrelated?)

# Comparison (observations only)

- candidate-001 contains additional workflow artifacts.
- candidate-002's git history was not readable (not-performed).
- Divergence: note structures differ between the two candidates.

# Conflict Report

- multiple possible workspaces: candidate-001, candidate-002
- ownership unknown for candidate-002
- missing metadata for candidate-002 (history, activity)
```

Note what the report does NOT contain: no "recommended", no "best",
no "canonical", no ranking of any kind.

## Human decision (the boundary)

The Agent presents the report. The Human explicitly replies:
"APPROVE candidate-001 for the v0.9.1 follow-up engagement."

## Engagement record (abbreviated)

```markdown
- engagement_id: WE-FICT-0007
- candidate_id: candidate-001
- selected_path: ~/Work/FICT-RD-Workspace
- approved_by_human: explicit Human message (quoted above)
- scope: v0.9.1 follow-up engagement only
- timestamp: 2026-05-01T10:05Z
- alternative candidates: candidate-002
- recorded_by: instance-17 (recorder only — the Agent did NOT decide)
```

## What this Agent did NOT do

- Did not rank, recommend, or choose (comparison stayed descriptive)
- Did not create the engagement record before the explicit approval
- Did not infer candidate-002's ownership or its relationship to
  candidate-001
- Did not treat the sync-provider label on candidate-002 as evidence
  of anything except transport context
- Did not merge, delete, move, or "clean up" either candidate
- Did not touch sync configuration; did not write into any candidate
- Did not consider the engagement a write permission — the v0.8
  authority chain remains fully in force
