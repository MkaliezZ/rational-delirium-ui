# Rational Delirium — v0.9.0 Workspace Intelligence Layer Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_9_0_WORKSPACE_INTELLIGENCE_LAYER_DESIGN
STATUS=DESIGN_ONLY — NO IMPLEMENTATION
BASE=2d8ada2df08c2a23459926016cb3773b113aee2b
PREDECESSORS:
  docs/RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md (W1–W7)
  docs/RD_V0_8_3_SHARED_WORKSPACE_RUNTIME_EVIDENCE_FREEZE.md
SUPPORTED_MUTATION=APPEND_EXISTING_NOTE (unchanged; nothing here touches it)
```

---

## 1. Purpose

v0.8 validated the shared-workspace workflow — but it **assumes the
workspace is already known**. v0.9.0 answers the question that comes
*before* every workflow:

> "How does an Agent know which workspace it should work in?"

The Workspace Intelligence Layer defines how Agent instances
**discover** candidate workspaces, **report evidence and
uncertainty** about them, and how the **Human selects the canonical
workspace** — with the selection recorded as a workflow artifact.

What this layer is NOT: a runtime service, a scheduler, a sync
engine, a conflict resolver, or an authority. Discovery is
**reading and reporting**; selection is **Human**; nothing here
grants, moves, merges, or deletes anything.

### Position in the lifecycle

```text
Workspace Discovery   (Agent reads candidates, reports evidence)
  ↓
Workspace Selection  (HUMAN chooses canonical workspace)
  ↓
[ v0.8 lifecycle unchanged ]
Skill → Workflow → Handoff → Human Decision → Permit
  → Bridge → Mutation Gate → Knowledge
```

Discovery happens **before** workflow execution and **does not grant
authority**: knowing where a workspace lives confers no write
permission; every authority boundary (Human approval, Bridge
admission, Gate execution) is untouched.

---

## 2. Neutrality Model (binding)

The protocol operates on:

```text
Agent Instance * Role * Skill * Workspace * Artifact
```

NOT on: device, AI product, OS, or sync software.

- An **Agent Instance** is an id + role + skill set + workspace
  relationship — never a machine, never a vendor.
- A **workspace candidate** is a directory/repo/vault described by
  its **indicators** — never by which machine or product hosts it.
- A **sync provider** (if detected) is **transport metadata only**.
  It is NOT authority and NOT truth: two copies that a provider
  reports "in sync" may still both be non-canonical; a provider
  conflict says nothing about which side is correct.

The design mentions Windows/macOS/Syncthing/etc. ONLY as
illustrative examples of where candidates may be found — never as
assumptions, requirements, or identity.

---

## 3. Agent Instance Model

```text
Agent Instance:
  id                      <stable within a workflow engagement>
  role                    Research | Review | Synthesis | Handoff |
                          Approval-Assistant | Discovery-Assistant
  skill set               <which Skill packages this instance follows>
  workspace relationship  <which workspace it works in, AFTER Human
                          selection; "unbound" before selection>
```

Roles bind to instances per-engagement, never permanently, never to
hardware/vendor/location:

```text
Instance A: role=Research     Instance B: role=Review
Instance C: role=Synthesis    Instance D: role=Discovery-Assistant
```

The **Discovery-Assistant** role (new) runs the workspace-discovery
Skill: it may inspect, compare, and report — it may never select,
merge, move, or authorize.

---

## 4. Discovery Model (provider-neutral)

### 4.1 Candidate sources (illustrative, non-exhaustive)

| Source class | Typical indicators |
|---|---|
| Local directory | RD-named folder, README, docs/ layout |
| Git repository | `.git/`, history, README, docs |
| Obsidian vault | `.obsidian/`, markdown files, attachments |
| Cloud storage | iCloud / Dropbox / OneDrive / Google Drive mounted paths |
| Network storage | NAS / SMB / NFS mounts |
| Sync-provider folders | Syncthing/Obsidian Sync configuration pointing at a folder |

### 4.2 RD workspace indicators

Evidence that a candidate may belong to Rational Delirium (each is
an indicator, never proof):

- **Strong**: RD protocol documents (`RD_V0_*` docs), a v0.8
  workspace manifest (`workspace.md` with WORKSPACE_MODEL=
  CANONICAL_SHARED_LOGICAL_WORKSPACE), Mutation Gate /
  Bridge Adapter material, RD skill packages, RD knowledge roots
  (CASES/ EVIDENCE/ HYPOTHESES/ LOOPS/ ARCHIVE).
- **Medium**: `.obsidian/` vault + RD-shaped note structure; git
  history with RD commit messages.
- **Weak**: name resemblance alone ("Rational-Delirium" in a path),
  a stray README. Weak indicators must be labeled weak in the
  report; they never upgrade themselves.

### 4.3 Uncertainty reporting

Every candidate entry carries an explicit `unknowns` list using the
frozen three-value discipline (`unknown` / `unavailable` /
`not-performed`). Examples: ownership unknown; provider detected
but configuration unreadable; modification info unavailable; two
candidates' relationship (copy? fork? unrelated?) unknown. **An
unknown is data, not a failure to hide.**

### 4.4 What discovery must NOT do

No ranking-as-canonical, no ownership inference, no duplicate
deletion, no merging, no sync-settings modification, no file moves,
no authority grant, no mutation, and no "helpfully" picking the
best-looking candidate. Comparison presents evidence; the Human
decides.

---

## 5. Discovery Output: `workspace-discovery-report.md`

Template lives in `skills/workspace-discovery/templates/`. Required
sections:

### Candidate List (one block per candidate)

```markdown
- path:                <as seen by THIS Agent Instance>
  provider:            <sync/cloud/network provider if known | unknown>
  indicators found:    <strong/medium/weak, each listed>
  last modification:  <observed info or not-performed>
  repository info:    <git present? readable history? | not-performed>
  vault info:         <.obsidian present? note shape? | not-performed>
  unknowns:            <explicit list>
```

### Comparison (evidence only — NO canonical ranking)

```markdown
Candidate A: git history exists; latest workflow documents;
             active artifacts under workflow/
Candidate B: old copy; missing metadata; unknowns: [ownership,
             divergence-from-A]
```

### Conflict Report

At minimum, surface: multiple possible workspaces; divergent
versions; unknown ownership; missing metadata. Each conflict names
the candidates involved and the evidence observed.

---

## 6. Human Selection Boundary: `workspace-selection-record.md`

The **Human MUST select the canonical workspace.** The Agent
prepares options, evidence, and comparison; the Agent MUST NOT
choose automatically — not by recency, git activity, file count,
provider status, or any heuristic.

```markdown
- selected workspace:   <path chosen by the Human>
  selected at:         <timestamp>
  selected by:         <Human decision source — explicit message/reference>
  alternative candidates: <paths considered>
  decision basis:      <optional Human reason>
  agent role:          Discovery-Assistant (prepared report only)
```

Rules:

1. The selection record is a **workflow artifact**, not a global
   lock: it binds the engagement that recorded it. A different
   engagement re-verifies rather than blindly inheriting.
2. The Agent **records faithfully** — including ambiguity, refusal,
   or the Human deferring. Silence/timeout is never selection.
3. Changing the selected workspace later is a **new Human decision**
   with a new record; workflows already executed against the old
   selection remain historically valid where they were run.
4. Selection grants **no write authority**: everything downstream
   (Human approval → Permit → Bridge → Gate) still applies in full.

---

## 7. Relationship with v0.8 (compatibility table)

| v0.8 element | v0.9.0 relationship |
|---|---|
| Canonical shared workspace (W1) | v0.9.0 explains how the canonical workspace gets **identified and selected**; W1–W7 rules unchanged once selected |
| Handoff schema (16 fields) | Unchanged; discovery/selection records are workflow artifacts beside handoffs, not schema extensions |
| Work-product taxonomy (5 kinds) | Discovery report and selection record are Agent-prepared evidence/state artifacts; classified per the evidence boundary (primary semantic function test) — a selection record is NOT `decision-context` (it selects a workspace, not an operation) |
| Human decision boundary | Unchanged and extended: workspace selection is another Human-only decision |
| Bridge / Mutation Gate | Untouched; discovery never contacts them |
| Sequential writer (W5) | Unchanged; discovery is read-only and adds no writer |

---

## 8. Failure Cases

| Case | Scenario | Detection | Human decision required? | Forbidden automatic action |
|---|---|---|---|---|
| **A — No workspace found** | Zero candidates anywhere inspected | Empty candidate list | Yes: Human locates/creates a workspace or ends the engagement | Creating a workspace "helpfully"; fabricating a candidate; proceeding with a guessed path |
| **B — Multiple candidates** | ≥2 plausible candidates | Candidate list length ≥2 with indicators | Yes: Human picks canonical | Auto-ranking; picking newest; merging; deleting "duplicates" |
| **C — Two candidates appear equally valid** | Same indicators, comparable recency | Comparison section shows parity | **Yes — mandatory**; Human may inspect both directly | Coin-flip heuristics; recency tiebreak; provider status as tiebreak; silent choice |
| **D — Sync provider reports conflict** | Provider marks conflict between copies | Provider metadata read (transport info only) | Yes: Human resolves with the provider's own tooling, then re-runs discovery | Editing sync state; choosing the "winner" copy; deleting either side; treating provider verdict as truth |
| **E — Workspace metadata incomplete** | Indicators present but ownership/history unknown | `unknowns` lists on the candidate | Yes before canonical selection | Inferring ownership from names; upgrading weak indicators; proceeding as if metadata were complete |

Global rule: detection is read-only observation; the response to
every case is "report, surface the uncertainty, ask the Human";
there exists **no** automatic repair, selection, or merge path.

---

## 9. Skill Package Design: `skills/workspace-discovery/`

Guidance only — NOT a runtime service. Prospective contents:

| Path | Purpose |
|---|---|
| `README.md` | Package identity, CAN/CANNOT, boundary statement |
| `instructions.md` | Discovery workflow, indicator discipline, uncertainty reporting |
| `templates/workspace-discovery-report.md` | §5 report template |
| `templates/workspace-selection-record.md` | §6 record template |
| `examples/discovery-report-example.md` | Fictional two-candidate walkthrough |

### CAN / CANNOT

| CAN | CANNOT |
|---|---|
| inspect available workspace candidates | select the canonical workspace |
| read metadata | declare ownership |
| identify workspace indicators | delete duplicates |
| compare candidate states | merge workspaces |
| generate a discovery report | modify sync settings |
| report conflicts | move files |
| preserve uncertainty | grant authority / execute mutations |

(Implementation of this Skill package — markdown files only — is a
**later phase**; this document is its design specification.)

---

## 10. Non-Goals (explicit)

NO: distributed filesystem; synchronization engine; conflict
resolver; automatic workspace merge; ownership inference; autonomous
workspace selection; background daemon; scheduler; Agent manager;
any runtime code; any change to Bridge / Mutation Gate / plugin /
production Vault.

---

## 11. Evidence discipline

This is a design document: it demonstrates nothing runtime. Where
future validation occurs, the frozen terminology applies — PROVEN
only for facts supported by artifacts in the package/repository;
REPORTED_PASS for trial-reported results without included artifacts;
NOT_PROVEN for everything outside. The design explicitly rejects:
"AI knows the correct workspace", "sync provider defines truth",
"Agent can select authority", "automatic merging is safe".

---

```text
DOCUMENT_CREATED=true
SKILL_DESIGN_CREATED=true (specification; package files are a later phase)
CODE_CHANGED=false / PLUGIN_CHANGED=false / BRIDGE_CHANGED=false
MUTATION_GATE_CHANGED=false / PRODUCTION_VAULT_CHANGED=false
AGENT_VENDOR_BINDING=false / SYNC_PROVIDER_BINDING=false
HUMAN_SELECTION_BOUNDARY_DEFINED=true
WORKSPACE_DISCOVERY_BOUNDARY_DEFINED=true
CONCLUSION=DESIGN_COMPLETE
STOP_AFTER_DESIGN=true
```
