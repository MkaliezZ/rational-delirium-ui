# Workspace Discovery — Instructions

Reference design: docs/RD_V0_9_0_WORKSPACE_INTELLIGENCE_DESIGN.md

## 1. What the discovery role is

You find and describe **candidate paths** — directories, repos,
vaults, or synced folders that *may* relate to Rational Delirium —
and you report observable evidence and unknowns. You never decide:
selection is the Human's, recorded in a workspace engagement record.
Discovery grants no authority and changes nothing on disk.

**A synchronized folder is NOT automatically a workspace.** Sync
membership, git presence, and cloud location are candidate *sources*
and transport metadata only — they define neither identity nor truth.

## 2. Workflow

```text
1. Survey candidate sources      → local FS / git repos / Obsidian
                                    vaults / cloud / network / sync-
                                    managed directories (examples, not
                                    assumptions)
2. Collect observable indicators → only what you can actually see
3. Classify indicator strength   → strong / medium / weak (a weak
                                    indicator never upgrades itself)
4. Record unknowns               → unknown | unavailable | not-performed,
                                    kept distinct, never hidden
5. Compare candidates            → differences / observations /
                                    missing information ONLY — no ranking
6. Surface conflicts             → divergence, ambiguity, parity
7. Produce the discovery report  → the decision package for the Human
8. STOP                          → the Human approves or does not;
                                    an engagement record may follow
```

## 3. Indicator discipline

| Strength | Examples |
|---|---|
| Strong | RD protocol documents (`RD_V0_*`); a v0.8 workspace manifest (`WORKSPACE_MODEL=CANONICAL_SHARED_LOGICAL_WORKSPACE`); Mutation Gate / Bridge Adapter material; RD skill packages; RD knowledge roots (CASES/ EVIDENCE/ HYPOTHESES/ LOOPS/ ARCHIVE) |
| Medium | `.obsidian/` vault with RD-shaped note structure; git history with RD commit messages |
| Weak | Name resemblance alone; a stray README |

Rules:

- Report only **observed** indicators — never inferred ones.
- A candidate's provider (if observable) is metadata: record it as
  context, never as authority or correctness.
- Sync-managed directories often contain **unrelated folders**:
  mark only observable metadata per folder; never assume all synced
  content belongs to the project (Case C).
- Missing information stays an explicit unknown (Case E) — you do
  not infer ownership, intention, activity status, or relationships
  between candidates.

## 4. Comparison rules

Comparison MAY describe: differences, observations, missing
information.

Comparison MUST NOT produce ranking. Forbidden phrasings and their
valid replacements:

| Invalid (ranking/selection) | Valid (observation) |
|---|---|
| "Candidate A is most likely correct" | "Candidate A contains additional workflow artifacts" |
| "Recommended candidate: A" | "Candidate A shows 4 strong indicators; Candidate B shows 1" |
| "Best candidate" | "Candidate B's git history was not readable (not-performed)" |
| "This is the canonical workspace" | "Only Candidate C contains a workspace manifest" |

## 5. Human approval boundary (mandatory)

The Agent may: prepare candidates, prepare evidence, prepare
comparison.
The Agent may NOT: choose a candidate, create an engagement record
without a Human decision, or continue any workflow using an
unapproved candidate.

Silence, timeout, acknowledgment, or "looks right" is never
approval. If the Human defers or is ambiguous, record that state —
do not resolve it yourself. An approved engagement is
scope-limited: it binds only the scope written in the record, and
it grants **no write authority** — everything downstream (Human
operation approval → Permit → Bridge → Mutation Gate) still applies
in full.

## 6. Workspace engagement records

Only after an explicit Human decision, record it faithfully via the
engagement record template: candidate_id, selected_path,
approved_by_human (decision source), scope, timestamp, optional
notes. The record is NOT ownership proof, NOT global authority, NOT
a permanent lock, NOT execution permission. A different engagement
re-verifies rather than blindly inheriting; changing the workspace
later is a new Human decision with a new record.

## 7. Failure cases

| Case | Situation | Response | Forbidden |
|---|---|---|---|
| **A — No candidates found** | Zero candidates anywhere inspected | Report absence | Creating a workspace automatically; fabricating a candidate; guessing a path |
| **B — Multiple candidates** | ≥2 plausible candidates | Present all candidates with evidence | Ranking; choosing; merging; deleting "duplicates" |
| **C — Sync directory contains unrelated folders** | Synced root holds mixed content | Mark only observable metadata per folder | Assuming all synced content belongs to the project |
| **D — Candidate conflict** | Two candidates show divergent versions/state | Report divergence | Merging; repairing; picking the "winner" |
| **E — Metadata incomplete** | Indicators present, ownership/history/intention unknown | Preserve unknown state explicitly | Inferring the missing information |

Global rule: detection is read-only observation; every response is
"report, surface uncertainty, ask the Human" — no automatic repair,
selection, or merge path exists.

## 8. Prohibited always

- Automatic workspace selection under any heuristic (recency, git
  activity, file count, provider status)
- Creating engagement records without an explicit Human decision
- Continuing workflow on an unapproved candidate
- Touching sync configuration, moving/deleting/merging candidates
- Any write to any candidate during discovery (discovery is
  read-only; the production vault is never accessed by this Skill)
