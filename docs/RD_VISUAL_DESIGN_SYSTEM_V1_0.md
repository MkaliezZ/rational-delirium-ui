# Rational Delirium — Visual Design System v1.0

PROJECT=RATIONAL_DELIRIUM
MILESTONE=v1.3.5
STATUS=DESIGN_SPECIFICATION_ONLY

This is the visual, interaction and motion contract for future Rational
Delirium interfaces. It creates no UI, tokens in code, components, schemas,
assets or runtime behavior. “Must” and “must not” express future acceptance
requirements, not claims that the frozen product already implements them.

## 1. Visual Identity

### Direction and emotional tone

**Investigating the evolution of knowledge.** A calm research archive:
charcoal surfaces, paper-toned text, literary titles, precise metadata,
visible sources and restrained rules dividing a case file. The interface
should feel patient, legible, rigorous and slightly unusual. A research
terminal contributes precision, not a wall of glowing code. An investigation
room contributes careful comparison, not theatrical surveillance or crime
imagery.

“Rational” governs hierarchy, exact references, neutral comparison and
predictable interactions. “Delirium” lives in the tension between unresolved
claims and in modest archival character; it never distorts information.
As an art-direction heuristic: 80% rational, 15% mysterious, 5% delirious.
These are not measurable content proportions or permission to obscure data.

Use asymmetry only to express primary reading versus supporting references.
Use negative space and thin rules, not oversized KPI tiles. No neon, blue AI
branding, glass stacks, gradients suggesting intelligence, game HUDs, glitch,
ornamental redacted text, fake scanlines, noise over prose, or rotating graphs.
This is neither a SaaS administration panel nor an AI control dashboard.

### Baseline and compatibility

Grounding: repository `MkaliezZ/rational-delirium-ui`, commit
`2e81de2ee916c63814a682b892a6b8cad9ac4278`, including:

- [Presentation architecture](RD_V1_3_0_GRAPH_INTELLIGENCE_PRESENTATION_DESIGN.md).
- [Current scoped styles](../styles/styles.css): charcoal `#11110F`, paper
  `#D4D0C8`, warm secondary `#A19C92`, teal/ochre accents, small radii and
  reduced-motion handling.
- [Knowledge Panel read model](../src/semantic-graph/knowledge-panel.ts) and
  [Obsidian view](../src/views/knowledge-panel-view.ts): declared metadata,
  source/snapshot separation, provenance, lineage, relations and diagnostics.

The existing appearance is grounding, not proof of visual accessibility.
This specification introduces brighter semantic text accents and readable
minimum sizes as future targets; it does not change existing CSS or assert
that current screens conform. Keep the frozen v1.3.0 authority boundary.
The user identifies v1.3.1 as frozen; this task does not rerun its acceptance.

Roadmap v4 is represented, not implemented: v1.3.5 design system → v1.4
Collaborative Knowledge Workspace → v1.5 Agent Knowledge Workflow → v1.6
Obsidian Product Experience. Optional v2.0+ Bridge/governance infrastructure
is outside this document. A roadmap phase never grants implementation authority.

## 2. Typography System

### Families and hierarchy

Font names below are ordered local fallback preferences, not required assets.
No font download, bundled asset, dependency or remote resource is introduced.
Honor the reader's Obsidian font/zoom preferences and use generic fallbacks
when named faces are absent. A missing typeface must not lose text or layout.

| Role | Direction / local fallback order | Default size / line height | Weight and use |
| --- | --- | --- | --- |
| Investigation or case title | Georgia, Charter, Songti SC, SimSun, generic serif | 28 / 36 px | 600 if available; otherwise normal serif, no fabricated condensed styling |
| KO title | Same serif family | 22 / 30 px | 600; full meaningful title, not its ID |
| Section heading | Same serif or reader's body font | 18 / 26 px | 600; real hierarchy, not decorative capitalization |
| Human prose and evidence description | Obsidian body preference, system-ui, PingFang SC, Microsoft YaHei, generic sans-serif | 16 / 26 px | 400; 600 for short emphasis |
| UI navigation and action label | Same readable body family | 14 / 20 px | 400–600; sentence case |
| Metadata, IDs, relations, timestamps | Obsidian monospace preference, ui-monospace, SFMono-Regular, Menlo, Consolas, generic monospace | 13 / 20 px | 400; exact identifier casing preserved |
| Compact annotation | Body or metadata family by content | 12 / 18 px minimum | Never the primary reading size or hidden low-contrast disclaimer |

Sizes are reference defaults at 100% zoom, implemented later as scalable
values. Support 200% text zoom without hiding data or overlapping controls.
Chinese glyphs may use the body fallback inside a monospace metadata row;
character coverage takes priority over artificial fixed-width alignment.
Do not split combining marks or rely on Latin-only fonts for mixed-language
content. Avoid letter spacing in Chinese prose; use at most 0.04em for short
Latin metadata headings, never IDs or quoted source text.

### Readability rules

- Prose measure: approximately 55–75 Latin characters or 28–40 CJK characters
  per line where space permits. Use wrapping rather than shrinking fonts.
- Separate evidence quotations from interpretation with an explicit layer
  label and source reference. Italics alone must not denote uncertainty.
- IDs are monospace and selectable. Line wrapping is visual only; copying
  returns the exact original identifier. A shortened ID always has a full
  inspect/copy route; do not require hover to recover it.
- Titles can wrap. Dense relation tables may scroll horizontally inside their
  own region; the whole workspace must not require horizontal scrolling.
- All excerpts retain original wording. Mark truncation explicitly and allow
  expansion; never replace unknowns or dissent with an agent-written summary.

## 3. Semantic Color System

### Separate the axes

A provenance layer, KO kind, lifecycle status, data availability and focus
state are different concepts. Display each with its own text label. A KO
may simultaneously be `kind: hypothesis`, `status: active`, with an Evidence
section whose source is unavailable. A single card-wide color must not
collapse those states. “Evidence” is a provenance concept, not a KO kind.

Color communicates a declared category/state, never correctness, strength,
confidence, popularity or authorization. Categories may share a family;
labels and shapes disambiguate. No green-success badge for an adopted claim.

### Base tokens — opaque dark archive palette

These are specification token names, not new CSS variables committed here.

| Token | Value | Contract |
| --- | --- | --- |
| background | `#11110F` | Deep charcoal, not pure black |
| surface.base | `#171714` | Primary reading surface |
| surface.raised | `#1D1C19` | Supporting panel or contextual inspection |
| surface.hover | `#22211D` | Small local hover response only |
| surface.selected | `#2B302C` | Current navigation selection; not active lifecycle |
| border.decorative | `#34322D` | Quiet 1 px separators; never sole control boundary |
| border.control | `#817D74` | Boundary where required to identify an interactive control |
| text.primary | `#D4D0C8` | Old-paper text |
| text.secondary | `#A19C92` | Supporting metadata; still readable |
| focus | `#D8C89D` | Visible 2 px outline with 2 px offset; independent of semantics |

### Semantic tokens

| State / layer | Accent | Required additional cue | Must not imply |
| --- | --- | --- | --- |
| Observation | `#A8B6AD` | “Observation” label and field-record marker | Direct access to objective truth |
| Evidence | `#91B5B0` cold teal | “Evidence” plus source/citation marker | Verified source or strong evidence |
| Inference | `#C6B477` muted ochre | “Inference” and derivation label | Fact or proof |
| Conclusion | `#D4D0C8` paper | “Conclusion” and declared-summary label | A stronger truth tier than other layers |
| Conflict | `#C78683` muted blood red | `contradicts` label, equal-sided pair | Error, danger or falsehood on either side |
| Unknown | `#D0B77C` pale ochre | “Unknown” with question marker | Zero value or missing object |
| Unavailable | `#AAA69E` stone | “Unavailable” with access/source reason | Nonexistence, rejection or false content |
| Active | `#91B5B0` cold teal | “Active — declared lifecycle” rectangular badge | Approval by this UI, correctness or selected navigation |
| Superseded | `#A19C92` warm gray | “Superseded” plus historical/lineage marker | Deleted, unreadable or disproven |

Candidate/reviewed/archived retain explicit lifecycle labels using neutral
paper/secondary tones. Reviewed never receives an approval checkmark.
Missing, ambiguous, invalid and not loaded receive explicit availability
labels; ambiguity can use the Unknown accent but must literally say
“Ambiguous”. Invalid describes a particular input/format problem, not the
truth of its knowledge. Focus/hover/selection never change semantic accents.

### Contrast and theme contract

Use accent colors for short labels, markers or a thin rule; long prose stays
paper-colored. Do not place white text on filled semantic badges, reduce
semantic text opacity, or depend on low-opacity color mixing. Default badges
use opaque base surfaces. Color is always paired with text; marker differences
remain visible in grayscale and high-contrast settings.

Design targets: normal text at least 4.5:1 contrast; necessary control/focus
boundaries at least 3:1 against adjacent surfaces. Decorative separators do
not qualify as accessible control boundaries. Palette calculations against
the lightest listed dark surface (`#2B302C`) give primary text 8.74:1,
secondary 4.92:1 and Conflict 4.59:1; other listed semantic accents exceed
4.5:1. These are opaque-swatch calculations, not rendered UI certification.

Do not dim archived/superseded content below these targets. Do not force a
whole Obsidian theme: future styles stay scoped to RD surfaces and respect
user font scaling and contrast preferences. This version defines the dark
archive palette only. Light/forced-color contexts must use accessible host
colors with the same labels and hierarchy rather than mechanically invert
these hex values; a branded light palette needs separate visual validation.

## 4. Component System

### Common structure and interaction

Use a 4 px spacing unit: 4, 8, 12, 16, 24, 32 px. Standard card padding is
16 px (12 px in narrow panes), with 8 px between related fields and 24 px
between sections. Corners are 4 px on cards, 2–4 px on controls, never large
floating dashboard bubbles. Use 1 px rules; no glass blur or decorative glow.
Depth comes from opaque surface hierarchy, not stacked shadows.

An interactive target should occupy at least 32 × 32 px on desktop and
44 × 44 px in touch contexts, without forcing metadata text to enlarge.
Pointer hover, keyboard focus, selected navigation, expanded disclosure and
source-declared status are separately represented. Selected rows use a text
or outline cue in addition to background. Hover never carries exclusive data.
Disclosure controls announce expanded/collapsed state; focus order follows
reading order. Escape returns from temporary inspection to its origin.

Read-only actions are Inspect, Open source, Expand, Copy reference, Filter,
Back and Re-read available data. No component contains Repair, Promote,
Approve, Resolve, Execute or auto-synthesis actions. An unavailable action
must explain its local reason without removing the related evidence.

### Knowledge Object Card

Order: serif title; exact object ID/workspace; separate kind and lifecycle
labels; origin/reference summary; a clearly bounded inspect action. Optional
relation counts are counts within the snapshot, never popularity badges.
No hero metric, avatar authority badge or confidence bar. Show “projection
eligibility does not establish KO validity” at inspection level. Selecting a
card changes the inspected object only, not its lifecycle or authority.

Source/snapshot differences use adjacent labeled values rather than a merged
value. A stale snapshot cannot silently inherit a current source title/status.
Duplicate identity is a diagnostic with all available matches, not a normal
card for the first file. Do not choose one by date, title or apparent quality.

### Provenance Card

Four labeled sections in fixed reading order: Observation, Evidence,
Inference, Conclusion. Each has declared text, source reference and explicit
availability. The connector is a reading guide, not a proof pipeline. Keep
empty, not declared, unknown, unavailable and not loaded distinct. A missing
Evidence section must not disappear and make Observation look like proof of
Conclusion. Expand each layer independently without collapsing another's
visible uncertainty. No confidence gradients between layers.

`derived_from` points to another KO only. `created_from`, evidence references
and source references open separately labeled artifacts/citations; they do
not become graph nodes. An artifact preview has an “Artifact — not a KO”
header. Body links and typography create no semantic relation.

### Lineage Component

Show predecessor, inspected object and successor with exact IDs, relation
labels, declared dates where available and lifecycle badges. Use “inspected”
for the centered object: visually central does not mean latest, active or
correct. Previous/successor are declared lineage roles, not file-order guesses.
Branches remain branches; cycles receive an explicit loop marker and stop
unbounded expansion. Undated events stay undated. Historical nodes remain
legible and reachable when a general overview filter hides them.

Artifact → Candidate → Review → Human Adoption → Active → Revision is an
explanatory sequence only. Display actual transitions only with actual
records. Review is not approval; a new revision is a new object, not automatic
activation. `updated_at` alone does not establish an adoption or review event.

### Relation Component

Every row names source, relation, target, declaring subject and resolution
state. Inverse browsing changes reading direction, not stored declarations.

| Relation | Display wording/direction | Visual contract |
| --- | --- | --- |
| supports | A supports B | Source → target; neutral connector, no weight/strength encoding |
| contradicts | A contradicts B | Equal pair; symmetric reading, original declaring direction inspectable |
| derived_from | A derived from B | Derived object → source KO; explicit inference/derivation label |
| depends_on | A depends on B | Dependent → dependency; no implied failure propagation |
| revises | A revises B | Successor → predecessor; retain both |
| supersedes | A supersedes B | Replacement → predecessor; retain history, no erasure |

Use constant line thickness/endpoint size; counts and animation speed must
not encode importance. Labels make line shapes optional aids, not a code
users must memorize. Grouping reciprocal contradictions retains both original
declarations. Unresolved targets remain labeled placeholders, never invented
KO cards. Truncated traversal says what limit was reached.

### Diagnostics Component

Group system observations by snapshot, source resolution and unresolved
references. Each row shows observation type, affected ID/reference, exact
available detail and source context. Keep diagnostics separate from Conflict:
a valid disagreement is not a system error. Diagnostic counts are counts,
not health/trust scores. Unknown diagnostic types remain inspectable.

For missing/ambiguous data, offer inspection or copying of available details,
not repair. No automatically chosen duplicate, substituted endpoint, revised
hash or status change. A blocking diagnostic appears at the affected content
and in the diagnostic list; it is never delayed behind a reveal animation.

## 5. Investigation Workspace Layout

| User question | Primary location | Supporting context |
| --- | --- | --- |
| What is this object? | Identity header + KO card | Logical workspace, declared kind/status |
| Why does it exist? | Provenance reading column | Four layers, exact cited references |
| Where did it come from? | Origin and lineage section | Artifact/source previews, predecessor |
| What does it affect? | Relation/dependency inspection | Exact declared paths, unresolved branches |
| How did it change? | Lineage/history section | Recorded review/adoption/revision references |

Use a reading-first layout, not a wall of equal tiles. Wide RD content areas
(approximately 1100 px or more) may have a 200–240 px navigation rail, a
flexible primary reading panel and a 280–340 px optional inspection panel.
The reading panel has priority; a graph overview is an optional supporting
view and never replaces the readable list/record.

Between roughly 700 and 1099 px, collapse navigation and show one supporting
panel at a time. Below 700 px, including a narrow Obsidian pane, use one
column with labeled disclosure sections and Back navigation. Breakpoints are
based on allocated pane width, not whole window width. At higher text zoom,
collapse sooner rather than squeeze prose. These are layout targets, not
implementation code.

Order is identity → provenance → relations → lineage → diagnostics, with
origin available next to identity. Status and immediate availability accompany
identity; blockers do not wait at the bottom. Supporting inspection preserves
selection, scroll position and a clear return path. Switching workspace must
be explicit and clear the context of any pending object read; no automatic
cross-workspace object substitution.

Show “Snapshot” and “Current source read” labels where they differ. “Re-read
available data” means exactly that, not rebuild, synchronization, currentness
certification or mutation. A filter reports hidden counts within known data;
“No matching items in this snapshot” is not “No knowledge exists”.

## 6. Collaboration and Agent Compatibility

These are representation principles for v1.4/v1.5, not new roles, records,
authorization rules, workflow implementation or automatic dispatch.

| Representation | Required visible context | Prohibited implication |
| --- | --- | --- |
| Contributor | Declared role/context, associated work product and source | Product logo/device/avatar as authority or trust |
| Reviewer | Exact reviewed revision/digest where recorded; recommendation and independence declaration | Recommendation as Human approval; independence inferred from vendor |
| Candidate artifact | Artifact type, version, origin and available review references; distinct from a candidate KO | Every artifact is knowledge or eligible for execution |
| Decision history | Human decision as recorded, its scope, target, timestamp and binding; simulation label when applicable | Standing permission, auto-renewal or inferred approval |
| Agent work product | “Agent-authored”/declared actor, inputs, assumptions, unknowns and dissent | AI-generated content is automatically accepted or true |

Roles, identities, contribution and authority are separate axes. Unknown
identity remains unknown. Avatars may aid navigation but not replace role
labels; no vendor-specific visual prestige. Decision records are inspectable
history only, not approval controls. Missing recorded bindings remain visible.

Parallel work products are shown as separate attributed alternatives, with
stable ordering and preserved dissent. No merged consensus card, majority
badge or contributor leaderboard. A new revision does not inherit the prior
review's verdict. Readiness for Human consideration is worded as readiness,
not adoption. A handoff moves work results, never permissions.

## 7. Motion Design System

### 7.1 Motion philosophy and shared tokens

**Understanding is unfolding.** Motion is deliberate, calm and investigative.
It explains a change of inspected context, a declared relationship or an
explicitly inspected historical step. It does not reveal correctness,
importance or an autonomous system making decisions.

| Motion token | Duration | Use |
| --- | --- | --- |
| immediate | 0 ms | Data truth, diagnostics, reduced motion, focus and status labels |
| feedback | 100 ms | Local hover/disclosure feedback |
| reveal | 180 ms | Small newly inspected region |
| context | 260 ms | Human-triggered panel/context transition |
| stagger | At most 35 ms per region | Optional first-object reveal accents only |

Default easing is a non-overshooting ease-out, conceptually
`cubic-bezier(0.2, 0, 0, 1)`. No springs, bounce, overshoot, parallax, zooming
camera, typewriter text, particles, pulse, flicker or auto-looping highlights.
Spatial movement, if used, is at most 4 px on an entering container. Never
animate height of a reading paragraph, reorder content mid-read or pan a
graph without a Human action. Deliberate feeling comes from hierarchy and
low amplitude, not forced waiting. No mandatory minimum loading delay.

Meaningful text and interaction become available immediately. Optional reveal
motion affects container emphasis or nonessential connectors, not information
availability or text contrast. A complete reveal takes at most 400 ms; user
interaction cancels it. Fast navigation cancels the outgoing sequence, and
late data from the previous selection must never animate into the new object.
No animation queue blocks inspection or continues after its context is gone.

Reduced-motion preference disables all stagger, translation and animated
connectors (0 ms), keeping identical labels, relationships and focus order.
A static highlight replaces motion. Screen readers receive semantic content
in logical order immediately, with one concise update for a completed
user-requested read, not an announcement for each animated layer. Actual
accessibility and motion behavior must be tested during future implementation.

### 7.2 Object reveal motion

Reading sequence: Identity → Status → Provenance → Relations → Lineage →
Diagnostics. Optionally emphasize the container boundaries in that order on
first inspection using reveal + stagger tokens; no text is progressively
withheld. Source status and missing/ambiguous/invalid alerts appear immediately
alongside identity, regardless of their later diagnostic section position.

The sequence is a consistent reading aid for every object, never tailored by
kind, activity, popularity, perceived certainty or agent confidence. Revisiting
an object needs no replay. Layout space is stable while source details load.

### 7.3 Provenance flow motion

A Human selecting a layer may reveal its declared text and briefly emphasize
the next reading connector. The four layer labels stay visible throughout.
There is no packet travelling from Evidence into Conclusion and no automatic
completion checkmark. This is inspection of declared provenance, not a visual
proof process. Missing layers interrupt the displayed trail explicitly; no
animated bridge can conceal the gap. Quoted text, inference labels and source
limitations remain unchanged during expansion.

### 7.4 Relation discovery motion

“Discovery” means the Human inspects an already declared relationship.
Endpoints appear first, then the relation label, then a subtle connection
emphasis, within the 400 ms overall ceiling. All three are available as text
from the start; motion is optional. Line travel is not a simulated computation.
Only existing relation data is drawn; no speculative edge preview, proximity
snap or similarity animation. Missing/ambiguous endpoints stay unresolved.
Direction follows the stored declaration; inverse inspection is explicitly
labeled. Identical duration/weight applies to every relation instance.

### 7.5 Lineage evolution motion

Timeline steps are revealed by explicit expansion or selection, not autoplay.
Artifact → Candidate → Review → Adoption → Active → Revision is shown only
to the extent that corresponding records exist, with gaps and undated events
visible. Do not interpolate missing states or animate a badge turning from
reviewed to active as though inspection approved it.

A new source-declared status can be highlighted as “displayed record changed”;
this neither performs nor certifies the transition. The previous object or
available historical record remains inspectable. No dissolving, striking out,
burning away or shrinking a predecessor to imply that it was wrong. Revision
moves focus to another ID while maintaining the visible lineage reference.

### 7.6 Conflict representation motion

**Two knowledge states coexist.** Reveal both sides simultaneously with the
same duration, size and emphasis. Bring in the `contradicts` label neutrally.
No red flash, warning siren, shake, collision, tug-of-war, winner animation or
confetti. Muted red is a static category accent only. Expanding one side
must leave the other side and disagreement label identifiable. Motion never
selects, resolves, hides or ranks a side, including historical claims.

### 7.7 Loading and empty states

| State | Honest presentation | Behavior |
| --- | --- | --- |
| not loaded | “Not loaded” with the expected read action/context | Static placeholder structure; do not claim absence |
| loading | “Reading available data…” only during an actual read | Stable layout, no fake percentage or advancing timeline; end when result arrives |
| unavailable | “Unavailable” plus actual access/source reason if known | No success checkmark, guessed retry time or automatic repair |
| missing | “Not found in this snapshot/source scope” | Preserve requested ID; do not create an object or conclude it never existed |
| ambiguous | “Multiple declarations for this identity” plus actual matches | No selected winner or morph into a resolved card |
| invalid | “Input could not be read/validated” with scoped reason | No judgement about knowledge truth; no silently empty graph |
| unknown | “Unknown” where the source explicitly declares it | Not a loading animation or an empty string |
| declared empty | “Declared empty” / exact empty-list meaning | Distinct from a missing field or unperformed read |
| loaded, zero matches | “No matches within the current snapshot/filter” | Show context/filter; no global “all clear” |

Prefer static progress wording to endless shimmer/spinners. If no read is
in flight, never leave an activity cue running. Retained last-loaded content
is explicitly labeled as such during re-read, not represented as current.
Errors do not destroy useful prior context. Reduced motion preserves every
state and message. No automatic transport, retry or synchronization behavior
is specified here.

## 8. Design Principles and Acceptance Contract

1. **Human authority:** display recommendations and decision records without
   turning either into execution authority. No action gains power from styling.
2. **Derived state:** the UI is a view of declared knowledge, not a knowledge
   source. Snapshot presence is neither KO validity nor current truth.
3. **Explicit uncertainty:** unknown, unavailable, not performed, absent and
   empty stay distinguishable. Visible diagnostics cannot be suppressed for
   aesthetic simplicity.
4. **No hidden inference:** text, graph positions, color, grouping, motion and
   empty states must not imply conclusions absent from the source model.
5. **Motion neutrality:** animated transition explains inspection or a recorded
   change, never strength, judgement, proof or correctness.
6. **Historical fidelity:** superseded/archived content and dissent remain
   readable. A source update is not permission to invent an event sequence.
7. **Accessibility before atmosphere:** text contrast, selectable IDs, keyboard
   operation, clear focus, mixed-language readability and reduced motion take
   precedence over cinematic character.

Future acceptance must compare the same component with mouse/keyboard,
reduced motion, narrow panes, text zoom and missing data. Inspect an active
hypothesis with unavailable evidence, an isolated duplicate identity, a
one-sided contradiction, a lineage gap and a stale-snapshot/current-source
mismatch. All must remain understandable without color or animation. These
are future design acceptance scenarios, not tests or UI created in v1.3.5.

## 9. Non-goals

This system does not define synchronization UI, Bridge UI, automatic AI
generation UI, an autonomous agent control panel, knowledge scoring, truth
ranking, automatic knowledge repair, collaboration transport, an agent
scheduler, approval signing or mutation controls.

It does not change KO schemas, semantic relations, the graph projection
engine, the v1.3.1 read model, plugin code, tests, README or dependencies.
It does not install fonts, create image assets, ship CSS, implement components,
rewrite existing screens, or launch v1.4/v1.5/v1.6. Optional governance work
remains outside this visual contract. The only artifact is this document.

## 10. Document Validation

| Check | Result and bounded evidence |
| --- | --- |
| Visual identity specified | PASS — §1 fixes archive/research direction and rational/delirium balance |
| Typography specified | PASS — §2 separates serif titles, mono metadata and readable body text with CJK fallback |
| Semantic colors specified | PASS — §3 covers all requested states and separates provenance/lifecycle/availability/interaction |
| Components and workspace specified | PASS — §§4–5 define identity, provenance, lineage, relations, diagnostics and pane hierarchy |
| Collaboration compatible | PASS — §6 preserves attribution, review/approval separation and artifact/KO separation |
| Motion complete and neutral | PASS — §§7.1–7.7 define timing, reveal, provenance, relations, history, conflict and loading, including reduced motion |
| Authority and provenance preserved | PASS — §§3–8 prohibit implied validity, hidden inference and automated decisions |
| Documentation only | PASS — this specification defines future behavior; no implementation or assets are created |

The checks above are design consistency review. Swatch contrast calculations
are not a rendered accessibility audit. No screenshot, Obsidian runtime,
font rendering, motion performance or user testing was performed in this
phase; those claims await separately authorized implementation validation.

DESIGN_VALIDATION=PASS
IMPLEMENTATION_STARTED=false
STOP_AFTER_DOCUMENT_COMPLETION=true
