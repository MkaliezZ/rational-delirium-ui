# RD v1.6.0 — Obsidian Product Experience Design

PROJECT=RATIONAL_DELIRIUM
PHASE=V1_6_0_OBSIDIAN_PRODUCT_EXPERIENCE_DESIGN
STATUS=DESIGN_ONLY
BASE_COMMIT=4e5d9446b3f1b5d92c1a6e21f0f26a5d703f7c1a

This document defines how the frozen Rational Delirium knowledge
system becomes a usable Obsidian product experience. It is a design
specification only: no code, plugin change, TypeScript, CSS, schema
change or UI implementation is created by this phase.

Frozen context this design builds on:

- [Semantic graph projection contract](RD_V1_2_1_IMPLEMENTATION_REPORT.md) (v1.2.1).
- [Graph Intelligence presentation boundary](RD_V1_3_0_GRAPH_INTELLIGENCE_PRESENTATION_DESIGN.md) (v1.3.0).
- Knowledge Intelligence Surface (v1.3.1 Phase 1 + Phase 2: Knowledge
  Panel with provenance surface, lineage explorer, relation inspector,
  diagnostics inspector; commits `618a7f9`, `2e81de2`).
- [Visual Design System v1.0](RD_VISUAL_DESIGN_SYSTEM_V1_0.md) (v1.3.5).
- [Collaborative Knowledge Workspace Design](RD_V1_4_0_COLLABORATIVE_KNOWLEDGE_WORKSPACE_DESIGN.md) (v1.4.0).
- [Agent Knowledge Workflow Design](RD_V1_5_0_AGENT_KNOWLEDGE_WORKFLOW_DESIGN.md) (v1.5.0).

Every boundary stated in those documents remains in force. Where
this document describes screens or journeys, it describes meanings
and structure, not implementation.

---

## 1. Product Experience Philosophy

### What the user should feel

Using Rational Delirium should feel like working in a **calm,
governed research archive**: patient, legible, exact. The user
should feel that nothing is hidden from them and nothing is being
decided for them — every claim shows where it came from, every
change shows its history, every disagreement stays visible, and
every advancement of knowledge traces to an explicit Human act.

Concretely, the experience targets:

- **Grounded confidence** — "I can see why this is here" rather
  than "the system seems smart".
- **Investigative calm** — comparison, tracing and reading, not
  notification pressure or dashboard urgency.
- **Honest gaps** — unknown, unavailable, unresolved and missing
  are first-class visible states, never papered over.
- **Authority clarity** — the interface never implies that stored
  knowledge is certified true, nor that an Agent or a view decided
  anything.

### Normal Obsidian usage vs the RD experience

| | Normal Obsidian | Rational Delirium |
| --- | --- | --- |
| Unit of work | A note (a file) | A Knowledge Object with identity, kind, lifecycle and provenance |
| Linking | Wikilinks and folders (structural) | Declared semantic relations between object ids (meaning) |
| History | File versions if the user maintains them | Lineage: predecessor/successor, revises/supersedes, review and decision records |
| Trust model | Whatever the user remembers | Explicit provenance layers; adoption is a recorded Human act |
| Conflict | Coexists unnoticed | Represented (`contradicts`), inspectable, never auto-resolved |
| Agents | Not applicable | Contributors with roles, work products and stated limitations — never authorities |

Obsidian remains the host: the user keeps their editor, files,
native graph, search and plugins. RD adds a governed knowledge
layer with its own inspection surfaces; it does not seize the
vault or reinterpret ordinary notes.

### Human, Knowledge Object and Interface

- The **Human** governs: adopts, rejects, defers, revises; every
  lifecycle advancement is their recorded act.
- The **Knowledge Object** is the governed representation: declared
  metadata, provenance, lineage and relations, evolving only
  through the authorized path.
- The **Interface** displays knowledge. It makes declared structure
  understandable and explorable. It does not create knowledge
  authority: no styling, ordering, animation or convenience
  converts display into adoption, proof or permission.

## 2. Obsidian Integration Boundary

### What the plugin layer does

The plugin provides **presentation and inspection only**:

- **Visualization** — renders the derived semantic graph snapshot
  and declared object data (read-only, deterministic).
- **Navigation** — explicit, exact-id navigation between objects,
  lineage steps and declared relations; resolved source opening as
  a Human-initiated action.
- **Workspace experience** — an RD workspace surface inside
  Obsidian where knowledge inspection happens (see §4–§5).
- **Inspection tools** — provenance reading, lineage tracing,
  relation and diagnostics inspection, collaboration and agent
  contribution views.

### What the plugin never becomes

- **Not a knowledge authority** — presence in a view is not
  validity, adoption or truth (v1.3.0 §2; "projection eligibility
  is not KO validity").
- **Not a lifecycle controller** — status transitions, promotion
  records and revisions are recorded Human-supervised acts through
  the authorized mutation path; the plugin displays them and can
  at most *prepare* metadata for a Human.
- **Not an agent executor** — no Agent is started, scheduled,
  called or granted anything by the UI; Agent contributions appear
  as inspectable records (v1.5.0 §11).
- **Not a permission system** — no Permits, leases, Bridge or
  Mutation Gate integration; historical decisions displayed are
  records, never standing authorization (v1.4.0 §5).

### The three-layer relationship

```text
Obsidian (host)
  files, editor, panes, native features, user preferences
        |
        | hosts, without being modified or reinterpreted
        v
Rational Delirium Plugin (presentation layer)
  reads derived state (v1.2.1 artifact) + declared frontmatter
  via exact-id source resolution; renders; navigates; inspects
        |
        | displays, never owns
        v
Knowledge Model (governed content)
  KO storage + lifecycle + collaboration/agent records;
  authority lives in recorded Human acts and the existing
  authorized mutation path — outside the plugin
```

The plugin is a **guest in the vault**: scoped styles, read-only
ports, no write verbs (already enforced by the repository's
read-only boundary tests). Deleting the graph artifact, a view
cache or the plugin itself deletes no knowledge.

## 3. Core User Journey

### Primary flow

```text
Open Vault
   ↓
Enter RD Workspace (explicit command/ribbon; nothing auto-opens)
   ↓
Select Knowledge Object (exact object_id query; explicit resolution)
   ↓
Inspect:
   Identity   — id, kind (declared classification), status
                (declared lifecycle, not a validity badge)
   Provenance — Observation → Evidence → Inference → Conclusion,
                each layer labeled, gaps shown as gaps
   Relations  — declared edges both directions, endpoint
                availability, unresolved declarations
   Lineage    — predecessor/successor, revises/supersedes,
                historical statuses visible
   History    — review records, decision records, revision records
                (collaboration/agent surfaces, §4)
   ↓
Explore connected knowledge (navigate a relation endpoint,
follow lineage to a predecessor, open a cited source)
```

Every step is read-only and reversible; every navigation preserves
a clear return path (v1.3.5 §5).

### First-time user experience

The first run must teach the model honestly rather than impress:

- **No snapshot ≠ no knowledge.** When the v1.2.1 artifact is
  missing, malformed or unsupported, the workspace shows an
  explicit unavailable state with an explanation of where the
  derived snapshot comes from — never an empty graph implying an
  empty vault (v1.3.0 §7).
- **Empty states explain the pipeline** — "Knowledge Objects are
  Markdown notes with declared frontmatter; the semantic graph is
  a derived snapshot you regenerate with the projector; the plugin
  reads, it does not build."
- **No onboarding theater**: no sample content, no auto-created
  notes, no wizards that write into the vault. First-time guidance
  is textual, in-surface, and dismissible.
- The panel's own states (available/missing/ambiguous/unavailable/
  invalid/not_loaded) are self-explaining labels, not error codes.

### Daily usage experience

- Open the RD workspace (or a focused Knowledge Panel), query an
  object id, read identity + provenance, glance at relations and
  lineage, open a source when needed.
- Frequent tasks map to the v1.3.5 question table: *what is this,
  why does it exist, where did it come from, what does it affect,
  how did it change.*
- Refresh means "re-read available data" — clearly labeled,
  never implying rebuild, sync or repair.
- Nothing interrupts: no background indexing, no notifications,
  no auto-updates of knowledge state.

### Investigation workflow (deeper journey)

Triggered by disagreement or doubt:

1. Notice a `contradicts` relation (or a diagnostics entry).
2. Open both objects; read each provenance trail side by side;
   scopes often dissolve false conflicts (v1.2.0 §6).
3. Follow lineage to see whether one side was superseded or
   revised, and read the decision/review records bound to exact
   revisions (v1.4.0 §§4–5).
4. Inspect agent contributions and their stated limitations
   (v1.5.0 §3) when relevant.
5. Conclude as a Human: request a revision, prepare a candidate,
   or record a scoped decision — through the existing authorized
   workflow, not through the view.

## 4. Information Architecture

Six inspection areas. Each answers a user question, reads only
frozen contracts, and keeps the v1.3.1 availability states. This
section defines meaning and content, not components or code.

| Area | User question | Shows | Data source (frozen contract) |
| --- | --- | --- | --- |
| **Knowledge Panel** | "What is this object?" | object identity, kind, status, origin metadata, declared relations, diagnostics; validation-not-established note | v1.2.1 snapshot + exact-id source frontmatter reads (v1.3.1 Phase 1–2) |
| **Provenance Explorer** | "Why do we believe this?" | the four layers — Observation → Evidence → Inference → Conclusion — each labeled with its own state; cited sources as resolvable references; gaps as gaps | declared source frontmatter provenance mapping (v1.1.0 §4); snapshot bindings |
| **Lineage Explorer** | "How did this change?" | predecessor/successor, revises/supersedes (fields and declared edges, distinguished), revision history with recorded reasons; superseded/archived objects remain reachable | snapshot lineage fields + declared edges + revision/promotion records (v1.1.0 §9, v1.4.0 §3) |
| **Relation Explorer** | "What is it connected to?" | all six relation types with direction, exact source/target objects, endpoint availability, unresolved declarations; inverse listings labeled as readings | snapshot declared edges only; no inferred relations (v1.2.0 §4) |
| **Collaboration View** | "Who worked on this and what happened?" | contributors (declared, attributed), work products, review history (findings, dispositions, independence statements), decision history (who/what/when/scope) | v1.4.0 work-product/review/decision records — inspectable history, never execution channels |
| **Agent Contribution View** | "What did Agents do here?" | agent role (v1.5.0 model), work products, source references actually inspected, stated limitations and unknowns | v1.5.0 work products + evidence/provenance integration; assistance is not authority |

Structural rules across all areas: snapshot vs current-source-read
distinctions stay labeled; collaboration and agent records render
as records (recommendations, decisions as decided — never pending
authority); no area fabricates absent data; every area degrades to
explicit unavailable states.

## 5. UI Architecture Principles

- **Panels.** Three-plane discipline from v1.3.5 §5: navigation
  rail (what exists), primary reading panel (the inspected
  object), optional inspection panel (supporting context). The
  reading panel always wins; graphs and overviews are supporting
  views, never replacements for readable records.
- **Navigation.** Explicit and exact: object-id-precise moves,
  declared-relation hops, lineage steps, and source opening as a
  Human action. Back/return paths and scroll/selection
  preservation. Switching logical workspace is explicit and clears
  pending context — no cross-workspace substitution.
- **Workspace.** One RD workspace concept (entered explicitly),
  hosting the six areas; focused single-object panels remain
  available for quick lookups. The workspace does not auto-open,
  auto-refresh or background-index.
- **Information hierarchy.** Identity → provenance → relations →
  lineage → diagnostics, origin beside identity; blockers and
  availability accompany identity rather than hiding at the bottom
  (v1.3.5 §5).
- **Gradual complexity.** Complexity is revealed on demand:
  collapsed sections, drill-in from summaries, progressive
  disclosure of deep trails. The first screen an object offers is
  legible without training; depth is one explicit step away.
- **Avoided shapes.** No overwhelming dashboard (no KPI tiles, no
  metric walls — counts appear only as snapshot counts); no
  excessive panels (six areas, one workspace, three planes); no
  AI-assistant interface — there is **no chat surface**, no
  assistant persona, no suggestion feed. Agents appear as
  attributed contributors inside records, never as an interlocutor
  that acts on the vault.

## 6. Theme Architecture

Grounded in the v1.3.5 semantic token system. The invariant core
is the **semantic layer** — what each token *means* (identity,
provenance layer, lifecycle state, availability state, relation
type, conflict, archival distinction). Themes are interchangeable
**presentation layers** over that fixed semantic layer.

```text
Semantic system (invariant meanings, labels, hierarchy, states)
        +
Theme (colors, typography flavor, decoration, motion character)
```

Future themes:

| Theme | Character | Notes |
| --- | --- | --- |
| **Rational Archive** | The default RD identity: dark archive palette, paper text, archival restraint (v1.3.5 baseline) | Reference implementation of the theme contract |
| **Professional** | Business/research usage: neutral, denser, print-adjacent formality | Same semantics; quieter character |
| **Apple Minimal** | Clean personal knowledge: light, spacious, understated | Requires the separately validated light palette path (v1.3.5 §3: no mechanical inversion) |
| **Cute Companion** | Friendly emotional theme: warmer, softer, personable | Delirium budget may grow; never at data's expense |

**Theme contract.** Themes may change: colors (within the v1.3.5
contrast and grayscale-distinguishability contract), typography
flavor, decoration, motion character. Themes may NOT change:
knowledge semantics, lifecycle meaning (status is not validity),
provenance meaning (layers never merge or reorder in meaning),
authority boundaries (no theme may style anything into looking
approved, verified or ranked). Every theme must pass the same
acceptance scenarios (v1.3.5 §8) — mouse/keyboard, reduced motion,
narrow panes, text zoom, missing data — before shipping.

## 7. Motion and Interaction Architecture

Based on the v1.3.5 motion philosophy: motion **explains
inspection or a recorded change** — nothing else.

Future interaction principles:

- **Reveal information gradually** — expanding a provenance layer
  or a lineage branch animates the inspection act (what the user
  just asked to see), at archival tempo.
- **Show lineage transitions** — moving predecessor → successor
  visualizes the recorded evolution step; the motion presents the
  recorded fact, it does not dramatize progress or improvement.
- **Visualize exploration** — relation hops and return paths can
  carry light spatial continuity so the user knows where they
  traveled; history is a trail, not a spectacle.
- **State changes are labeled first** — any availability or
  snapshot/source difference is textual; motion never carries the
  meaning alone (color- and motion-independent comprehension).

Prohibited motion (v1.3.5 §7 restated as product law):

- **No truth animation** — nothing pulses, glows or resolves to
  signal correctness or proof.
- **No confidence animation** — no strength meters, probability
  bars, growing certainty effects.
- **No AI authority animation** — no agent "thinking", "acting" or
  "deciding" theatrics; agents have records, not performances.

Reduced-motion settings receive equivalent information with no
motion at all; motion is always supplementary.

## 8. Migration From v0.4 UI Foundation

Previous UI work is **re-homed, not discarded**. The v0.4.x
foundation already implements read-only, deterministic, safe-DOM
presentation with scoped styles, port-injected views and
runtime-wiring discipline — exactly the plugin this product
experience needs. Nothing is thrown away and nothing is rewritten
for rewriting's sake.

| Existing surface | Becomes, in the product experience |
| --- | --- |
| Knowledge Panel (v1.3.1) | The Knowledge Panel area of §4 — already the correct seed |
| LOOP Workspace (v0.4.3) | An inspection lens over recurrence-type declared assertions; later bridges to `process`/`observation` objects where the user declares them |
| Graph Intelligence view (v0.4.4) | The supporting graph overview inside the workspace (v1.3.5 §5) over the file-assertion layer |
| Relation display & runtime navigation (v0.4.1–v0.4.4) | The navigation substrate for relation hops and source opening (GI-RT-01 lifecycle contract preserved) |
| Investigation Dashboard (v0.4.2) | Attention entry points into the workspace (cases, unresolved assertions) |

Two-layer discipline preserved: the v0.4.x **file/body-assertion
layer** and the v1.2.1 **KO semantic layer** remain distinct
(v1.3.0 §7); migration re-homes views, it never merges layers or
migrates data. Migration happens at v1.6.3 implementation time
under its own review; this document performs none of it.

## 9. Future Implementation Roadmap

Design-first discipline continues: each phase below receives its
own specification and review before any code.

| Phase | Scope (meaning, not committed implementation) |
| --- | --- |
| **v1.6.1 Plugin Architecture** | Workspace shell structure, view registry, port surface (snapshot provider, KO detail reader, navigation host), state and availability plumbing — the load-bearing frame the product hangs on |
| **v1.6.2 Theme System** | Semantic-token runtime honoring the §6 theme contract; Rational Archive as reference theme; theme acceptance harness (contrast, grayscale, reduced motion) |
| **v1.6.3 Knowledge Workspace UI** | The six §4 areas integrated into the §5 workspace; v0.4 surface re-homing (§8); journeys of §3 realized |
| **v1.6.4 Animation and Polish** | §7 motion application across surfaces; full v1.3.5 §8 acceptance scenario pass; accessibility and narrow-pane hardening |

Sequencing note: theme system before workspace UI so that semantic
invariants are enforceable while areas are built; animation last so
motion never drives structure.

## 10. Non-goals

Explicitly excluded from this design and the product experience it
defines:

- **AI autonomous assistant** — no chat surface, no acting agent,
  no suggestion feed (§5).
- **Automatic note organization** — the plugin never rewrites,
  files, tags or "cleans up" notes.
- **Automatic graph creation** — edges come only from declared
  frontmatter relations; no link/text-derived edges, ever.
- **Knowledge scoring / truth ranking** — no scores, rankings,
  winner selection or correctness badges anywhere.
- **Permission management** — no Permit/lease/approval surfaces;
  displayed decisions are history, not authority.
- **Bridge implementation** — no Bridge, Mutation Gate or mutation
  path integration in the product layer.
- **Synchronization system** — transport stays outside the product;
  no sync UI claims beyond reporting observable file state.

Also excluded: replacing Obsidian's native surfaces, forcing a
whole-vault theme, background services, onboarding wizards that
write to the vault, and any UI that advances a lifecycle state by
itself.

---

## Document Validation

| Check | Result |
| --- | --- |
| Single design document only | PASS — this file; no code/schema/plugin/UI changes |
| Boundaries inherited intact | PASS — §§1–2, 5–7 restate v1.3.0/v1.3.5/v1.4.0/v1.5.0 authority boundaries without weakening any |
| Presentation layer read-only | PASS — §2 plugin contract: display/navigate/inspect; no authority, lifecycle control, agent execution or permissions |
| No inference anywhere | PASS — §4 areas consume declared data only; §5 forbids assistant-style interfaces |
| Theme invariants | PASS — §6 separates semantic system (invariant) from themes (presentation), with the NOT-change list |
| Motion neutrality | PASS — §7 prohibits truth/confidence/AI-authority animation; reduced-motion parity |
| v0.4 foundation preserved | PASS — §8 re-homes existing surfaces; two-layer discipline kept; no migration performed |
| Roadmap is design-only | PASS — §9 defines phases; no implementation started |

These are author design-consistency checks, not an independent
review or a claim that any UI exists.

DESIGN_VALIDATION=PASS
UI_IMPLEMENTED=false
CODE_CHANGED=false
STOP_AFTER_DOCUMENT_COMPLETION=true
