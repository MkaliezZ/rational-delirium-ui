# RD v1.2.1 — Semantic Graph Projection MVP Implementation Report

Date: 2026-09-19 · Phase: V1_2_1_SEMANTIC_GRAPH_PROJECTION_MVP_IMPLEMENTATION
Mode: PRIMARY_IMPLEMENTER, minimal-change, strict non-goals honored.
Review fix applied (same date): SGP-01 + SGP-02, see "Review fix"
section at the end. Test count after fix: 14.

## Projection eligibility vs Knowledge Object validity (SGP-01)

Stated explicitly, because the earlier phrasing could be read too
broadly: **projection eligibility is NOT Knowledge Object
validity.**

- The projector checks exactly the fields the graph projection
  needs: `object_id` format, `kind` enum, `status` enum, non-empty
  `title`. Nothing else.
- The projector is **NOT a full Knowledge Object validator**. Full
  schema and lifecycle validation — all v1.1.0 required fields,
  provenance completeness, evidence_reference discipline, promotion
  records, status-transition legality — belongs to the Knowledge
  Management validation workflow (Skill instructions §6/§11).
- A file that becomes a graph node is NOT thereby declared a valid
  Knowledge Object; and incomplete provenance or evidence never
  blocks projection — the projector reads neither, so it can neither
  validate nor invalidate them.

## What was built

The smallest Semantic Graph Projection MVP: a standalone, pure,
stdlib-only Python module that projects existing Markdown files
carrying the v1.1.0 Knowledge Object frontmatter into a derived
semantic-graph JSON artifact. It proves the v1.2.0 design's core
claim: the semantic graph is **derived state** — rebuildable from
frontmatter alone, with every authority boundary preserved. It is
not a graph system: no database, no runtime service, no UI, no
inference.

## Files created

| File | Purpose |
|---|---|
| `semantic-graph/projector.py` | The projection module (~250 lines, Python 3.11 stdlib only) |
| `semantic-graph/tests/test_projection.py` | 11 tests: the 8 required + 3 boundary proofs |
| `docs/RD_V1_2_1_IMPLEMENTATION_REPORT.md` | This report |

No existing file was modified (git: untracked additions only).

## Design of the projector

**Input**: Markdown files / directories. **Output**:
`rd-semantic-graph-projection/1` artifact:

```json
{
  "schema": "rd-semantic-graph-projection/1",
  "nodes":  [ { "object_id", "kind", "status", "title", "predecessor", "successor" } ],
  "edges":  [ { "source", "target", "relation" } ],
  "unresolved": [ { "source", "target", "relation" } ],
  "diagnostics": [ { "type": "duplicate_identity", "object_id", "paths": [...] } ]
}
```

Boundaries are **structural**, not advisory:

1. **Body is never scanned.** `extract_frontmatter()` discards the
   note body; nothing downstream can see wikilinks, markdown links,
   filenames, or prose. Edges from non-frontmatter sources are
   impossible by construction (test 4, 10).
2. **Node gate**: a file becomes a node iff its frontmatter carries
   a well-formed `object_id` (`ko-<yyyymmdd>-<seq>`), `kind` in the
   7-value enum, `status` in the 5-value enum, and a non-empty
   `title`. The projector is NOT a full schema validator — full
   validation is the knowledge-management Skill §11's job; the
   projection checks exactly the node-relevant fields.
3. **Edge gate**: only the six declared relation fields
   (`supports`, `contradicts`, `derived_from`, `depends_on`,
   `revises`, `supersedes`) produce edges. No inference of any
   kind; near-identical files produce zero edges (test 10).
4. **Evidence references never become nodes** — they are not read
   (only identity/lifecycle/lineage/relation keys are extracted;
   `evidence_reference`/`provenance` content never enters the
   artifact at all, so layers can never be merged or upgraded in
   projection; tests 5's negative assertions).
5. **Conflict is representation only**: the artifact schema has no
   rank/score/confidence/winner key, so none can be emitted
   (test 6 walks all keys and asserts absence).
6. **Duplicate `object_id` = ambiguous identity**: ALL copies are
   excluded (with their edges); no silent choice; a deterministic
   `duplicate_identity` diagnostic lists every declaring path
   (test 11 + SGP-02 tests).
7. **Dangling targets** → `unresolved` section: reported, never
   silently dropped, never auto-created (test 9; v1.2.0 §12 G).
8. **Determinism**: stable ordering (nodes by id; edges by
   source/relation/target), deduplication, no timestamps —
   regenerating yields byte-identical output regardless of input
   order (test 8 + real-input check below).

## Test results

`python -m unittest discover -s semantic-graph/tests` →
**14/14 OK** (11 original + 3 added by the review fix; first
original run had 1 failure: the test itself asserted the banned
substring "resolved", which matches the legitimate `unresolved`
key; fixed the test to ban key NAMES, not substrings. Projector
defect count: zero.)

| # | Required test | Result |
|---|---|---|
| 1 | Valid KO becomes node | PASS |
| 2 | Invalid markdown excluded (no frontmatter / missing id / bad kind `evidence` / bad status / empty title / malformed id / workflow artifact) | PASS |
| 3 | Declared relation becomes edge | PASS |
| 4 | Markdown link does not become edge (wikilinks, md links, aliases, filename mentions in body) | PASS |
| 5 | Evidence reference does not become node (and evidence data never enters the artifact) | PASS |
| 6 | Contradiction preserved exactly once; no resolution keys anywhere | PASS |
| 7 | Revision lineage preserved (revises edge + predecessor/successor fields + superseded node retained) | PASS |
| 8 | Regenerated twice → byte-identical output, input-order independent, no timestamps | PASS |
| 9 | Dangling edge → unresolved (never silent, never auto-created) | PASS |
| 10 | No inferred edges from similar text | PASS |
| 11 | Duplicate object_id → excluded, no silent choice, diagnosed | PASS |
| 12 | SGP-02: duplicate id with no incoming edges still produces diagnostic | PASS |
| 13 | SGP-02: duplicate never selects a winner (order-independent, deterministic, neither copy survives) | PASS |
| 14 | SGP-01: contract docs distinguish projection eligibility vs KO validity (module docstring + this report) | PASS |

## Real-input smoke test (read-only, v1.1.1 sandbox RD-V111-001)

Pointing the projector at the sandbox `workflow/` directory — the
directory that lived the full v1.1.1 lifecycle — produces exactly
the expected graph, read-only, writing nothing into the sandbox:

- nodes: `ko-20260919-0001` (active), `ko-20260919-0002` (candidate)
- edges: one `revises` edge (0002 → 0001)
- unresolved: none
- The seven workflow artifacts in the same directory (research ×2,
  review, decision input, decision sim, promotion record, revision
  record) correctly produced ZERO nodes.
- Determinism on real input: two runs byte-identical
  (SHA-256 prefix `24c46d1f…`).

Scanning the FULL sandbox directory instead additionally picks up
`validation/ko-r1-at-candidate.md` — the frozen candidate-state
snapshot, which declares the same `object_id` as the live
`ko-r1.md`. The projector excludes BOTH as ambiguous identity
(no silent choice), reports the orphaned `revises` edge under
`unresolved`, and — since the review fix — emits the
`duplicate_identity` diagnostic naming both declaring paths. This
is the duplicate-identity rule working as designed on real data:
identity copies inside a scanned tree are ambiguity, and ambiguity
is surfaced, not resolved.

## Review fix (v1.2.1-fix, MINIMAL_FIX_ONLY)

Codex lightweight review found two medium findings; the
implementation direction was accepted. Both fixed, nothing
redesigned:

- **SGP-01 — Projection input contract clarification.** Added the
  "Projection eligibility vs Knowledge Object validity" section
  above and the matching paragraph in the module docstring: the
  projector is NOT a full Knowledge Object validator; full
  schema/lifecycle validation belongs to the Knowledge Management
  validation workflow; projection verifies only the fields the
  graph needs; incomplete provenance/evidence neither blocks
  projection nor is declared valid. No new validation was added
  (no promotion_record/evidence-completeness/lifecycle/truth
  checks) — projector responsibility unchanged.
- **SGP-02 — Duplicate identity diagnostics.** The artifact gains
  a deterministic `diagnostics` list; duplicate identities emit
  `{type: "duplicate_identity", object_id, paths: [...]}` with
  paths sorted and entries ordered by object_id. No automatic
  resolution, merge, winner selection, or object mutation;
  duplicates remain excluded from nodes (behavior unchanged, now
  observable).

## Non-goals honored

No graph database, no runtime service, no plugin/UI changes, no
automatic relationship extraction, no text-derived edges, no
embeddings/vector search, no schema modification (v1.1.0 read
as-is), no Bridge/Mutation Gate changes, no production Vault
access (the only real inputs touched were read-only: the RD-V111-001
sandbox).

## Honest limits

- Node validation covers node-relevant fields only; a file with
  broken provenance/evidence frontmatter still projects as a node
  (full validation remains the Skill §11 checklist's job).
- The YAML subset parser covers the v1.1.0 template forms (quoted
  and plain scalars, inline `[]`, block lists of scalars, comments,
  CRLF/BOM tolerance). Exotic YAML (anchors, flow maps in relation
  lists) is treated as invalid rather than guessed.
- `semantic-graph/` ships no committed sample artifact: the output
  is derived state; regenerate on demand.

## Final Matrix

```
PROJECT=RATIONAL_DELIRIUM
PHASE=V1_2_1_SEMANTIC_GRAPH_PROJECTION_MVP_IMPLEMENTATION
CODE_CHANGED=true                        (new standalone module + tests only; zero existing code touched)
PLUGIN_CHANGED=false
BRIDGE_CHANGED=false
MUTATION_GATE_CHANGED=false
SCHEMA_CHANGED=false
PRODUCTION_VAULT_CHANGED=false
TEST_RESULT=PASS                         (14/14)
VALIDATION_RESULT=PASS
CONCLUSION=IMPLEMENTATION_COMPLETE
STOP_AFTER_IMPLEMENTATION=true
```

Not committed / not pushed: no git operation was specified for
this phase.
