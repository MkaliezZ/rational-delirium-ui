<!-- RD v1.9 — Agent workflow example: the COMPLETE lifecycle for
     the single MVP operation (ADD_RELATION). ENTIRELY FICTIONAL:
     FICT- identifiers; no real knowledge claims. This example
     DESCRIBES agent behavior — it does not implement it, and it
     authorizes nothing. -->

# Agent Workflow Example — ADD_RELATION (fictional)

The workflow this example walks through:

```text
Read RD Skill
   ↓
Inspect knowledge objects
   ↓
Create Proposal
   ↓
Wait for Human decision
   ↓
After approval: perform ONLY the approved work (externally)
   ↓
Create Contribution Record
   ↓
RD displays proposal → decision → contribution
```

## Step 1 — Read the Skill

FICT-AGENT-RESEARCHER-1 loads `skills/rational-delirium-agent-skill.md`
and accepts its boundaries: contributor role, no authority, five
principles.

## Step 2 — Inspect knowledge objects

The agent reads two objects by exact id (never by title):

- FICT-KO-20260918-0003 (EVIDENCE): declares a source statement
  about the subject of the hypothesis below.
- FICT-KO-20260919-0007 (HYPOTHESIS): declares no relation to
  that evidence.

It inspects both objects' provenance and existing relations, and
notes the absence of a declared `supports` relation between them.

## Step 3 — Create Proposal

The agent writes `.proposals/PROP-20260920-001.md` (fictional):

- Requested Change: **ADD_RELATION — create the declared relation
  `FICT-KO-20260918-0003 supports FICT-KO-20260919-0007`** (in the
  hypothesis object's frontmatter `supports` list).
- Evidence: both objects' declared content, cited by id.
- Status: pending.

## Step 4 — Wait for Human decision

The agent stops. It does not act on its own proposal. In Obsidian,
the Human inspects the proposal in the RD Collaboration Surface
and records a decision with the Approve control:

- Status becomes: **approved** — a recorded human action. Approval
  is not truth validation, not agent trust, and not permanent
  authority; it authorizes exactly this relation addition.

## Step 5 — Perform only the approved work

The agent — using its own tools, outside RD — adds exactly the
declared relation to the hypothesis object's frontmatter:

```yaml
supports:
  - FICT-KO-20260918-0003
```

Nothing else changes. No unrelated objects are touched; the scope
is not expanded.

## Step 6 — Create Contribution Record

The agent writes `.contributions/CONTRIB-20260920-001.md`
(fictional), recording:

- source proposal: PROP-20260920-001
- Human decision: approved (recorded human action)
- performed operation: ADD_RELATION
- affected objects: FICT-KO-20260919-0007 (relation added),
  FICT-KO-20260918-0003 (referenced)
- result description: the declared supports relation now exists in
  the hypothesis object's frontmatter.

The record describes an event. It does not prove truth,
correctness, or quality.

## Step 7 — RD displays the relationship

In the Collaboration Surface, RD shows the linkage:

```text
Proposal PROP-20260920-001 (approved — recorded human action)
   ↓
Contribution Record CONTRIB-20260920-001
   (ADD_RELATION · affected: FICT-KO-20260919-0007, FICT-KO-20260918-0003)
```

A Human can inspect each artifact and verify the chain. RD
displayed the workflow; it executed nothing.
