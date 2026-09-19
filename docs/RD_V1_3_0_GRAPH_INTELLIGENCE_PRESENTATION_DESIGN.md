# RD v1.3.0 — Graph Intelligence Presentation Layer Design

Status: DESIGN_ONLY. No UI, adapter, runtime or schema implementation.

- Project: RATIONAL_DELIRIUM
- Baseline release: `v1.2.1-semantic-graph-projection-mvp`
- Baseline commit: `62ae8a55aa8f247b5b3d902d8d0e335e57914ca9`
- Output: this design document only.
- Authority: Human decisions remain outside the presentation layer.

## 1. Presentation Layer Philosophy

The presentation layer makes declared knowledge structure understandable:
what an object says, where it came from, what it cites, what disagrees with
it, and how it relates to earlier objects. It is a Human interpretation,
knowledge navigation and provenance visibility interface.

It is not an AI assistant, automatic knowledge organizer, truth evaluator,
graph prediction system, approval surface or autonomous actor. Automatic
inference and automatic relation extraction are explicitly prohibited.
There is no new “Knowledge Truth Layer” that computes truth: stored objects
record claims, provenance and lifecycle; Humans retain interpretation and
decision authority. Neither storage nor presentation certifies correctness.

The architecture remains:

```text
KO Markdown + frontmatter                 Workflow / evidence artifacts
        |                                           |
        | existing projection                       | read-only references
        v                                           |
v1.2.1 derived semantic graph                        |
        |                                           |
        +---- read-only presentation adapter -------+
                          |
                 Human exploration in Obsidian
```

All arrows above are reads or derivations, not authorization or mutation.
The adapter is a future integration boundary, not a new source of truth.
Deleting a graph or view cache must not delete knowledge, history or evidence.

### Baseline and reference discipline

The released `semantic-graph/projector.py` and
`RD_V1_2_1_IMPLEMENTATION_REPORT.md` define the actual projection contract.
Its artifact has `schema`, `nodes`, `edges`, `unresolved` and `diagnostics`.
Nodes carry only `object_id`, `kind`, `status`, `title`, `predecessor` and
`successor`. Edges carry `source`, `target` and `relation`.

The supplied design references below are inputs to this document. They are
not present as tracked documents at the baseline commit; no broken relative
repository links or claim of baseline inclusion is intended. Their filenames
and exact SHA-256 values identify the supplied versions without copying them
into this change:

| Supplied reference | SHA-256 |
| --- | --- |
| `RD_V1_1_0_KNOWLEDGE_OBJECT_SCHEMA.md` | `d609edc0e5a81587ae830e140e84dc3514e99610d26e631316b37a836320fbce` |
| `RD_V1_2_0_KNOWLEDGE_GRAPH_INTELLIGENCE_DESIGN.md` | `21b68b1fcb37191595c310635e718738e54b4b592c304afe58c94bebfae7619f` |
| `v1_1_1_validation_report.md` | `141a8ccd688aa871b5927b61efe33f22e9d2c58c622e261333448e4e8ea696ce` |

The v1.1.1 report describes a fictional sandbox simulation, not real Human
adoption or production validation. It informs examples, not runtime claims.
This design preserves v1.1.0 storage and v1.2.0 semantic direction while
respecting the narrower v1.2.1 artifact actually available.

## 2. Knowledge Panel Design

Selection is scoped by logical workspace plus `object_id`, never title,
filename, folder, model name or device. Two workspaces are not implicitly
merged. The panel labels source-declared values as such.

| Panel area | Display | Source and limitation |
| --- | --- | --- |
| Identity | Exact object ID, title, logical workspace; separate “open source” action | Graph snapshot plus explicit source resolution; a title is not identity |
| Object type | One of observation, fact, concept, hypothesis, decision, reference, process | Declared `kind`; `fact` means a recorded classification, not a verified truth badge |
| Lifecycle | candidate, reviewed, active, superseded or archived | Declared `status`; reviewed is not approved; active is declared adoption, not correctness |
| Origin | `workspace_context`, `creator_role`, `created_from` references | Read-only KO metadata; role is not an authenticated identity; explicit `created_from: []` is distinguished from missing metadata |
| Provenance | Four separately labeled excerpts/pointers: Observation, Evidence, Inference, Conclusion | Read-only declared `provenance`; no generated summary or relabeling |
| Lineage | predecessor/successor plus declared revises/supersedes, with historical status visible | Keep metadata pointers distinct from typed graph edges; inconsistent declarations are displayed without reconciliation |
| Relations | Incoming/outgoing declared relations, exact endpoints, type, declaring subject | Existing edges only; counts describe this snapshot and are not importance scores |
| Availability | Snapshot status, source availability, unresolved references and duplicate diagnostics | Unknown or missing is visible; presence in graph is not full schema validation |

**Projection eligibility is not KO validity.** v1.2.1 does not validate full
provenance, adoption evidence or lifecycle legality. Show “schema/lifecycle
validation not established by projection” rather than a validity checkmark.
A future read-only validation record may be linked with its scope and exact
binding; it must not be invented from the node's existence. An active object
with no available promotion record remains visible as “active (declared);
adoption record missing/unavailable”, not silently downgraded or endorsed.

Missing field, explicit empty value, unavailable referenced artifact and
not-yet-loaded data are different display states. Preserve source wording,
uncertainty and dissent. Long excerpts may be collapsed, but labels and an
expand/open action remain visible; truncation must be marked. No truth
score, confidence ranking, correctness color, centrality-as-importance,
AI judgement, or automatic “best answer” is permitted.

Navigation/filtering is read-only. Filtering must disclose hidden results;
it must not imply excluded historical objects or disagreements do not exist.
Default ordering is a neutral stable order such as object ID. Color is only
supplementary to text labels. Keyboard-accessible lists and explicit relation
labels must convey the same information as any future diagram.

## 3. Provenance Trail Design

The question is “Why does this knowledge exist?”, not “Is it true?”.
Two kinds of trail are presented separately.

### 3.1 The four declared layers inside an object

```text
Observation → Evidence → Inference → Conclusion
```

These arrows show reading order, not a proof algorithm or automatic promotion.
Each layer displays its exact declared summary, source location and available
reference. Empty layers remain explicitly empty; missing layers are marked
missing. A conclusion is never displayed alone as a verified answer.

The plugin may open the original note for full text. Body text, rendered
links and headings do not generate graph edges, fill missing provenance,
or classify prose into layers. Presentation may expose existing text only;
semantic extraction and automatic summarization remain prohibited.

### 3.2 Connections between objects and artifacts

The shorthand “KO → derived_from → Evidence / Artifact” must not change the
schema. `derived_from` targets **KO object IDs only**. The legal reading is:

```text
KO A --derived_from--> KO B
                         |-- provenance.evidence / evidence_reference --> evidence reference
                         |-- source_reference --> cited source
                         `-- created_from --> workflow artifact
```

Only the first arrow is one of the six semantic graph relations. Citation
and origin links are labeled reference navigation into a separate artifact
layer. Evidence, workflow records and external sources are not automatically
nodes. A deliberately authored `kind: reference` KO is a node representing
a pointer, not proof that its source is correct. A direct artifact path found
as a `derived_from` target stays unresolved; the adapter does not reinterpret
it as a valid semantic relation.

At every hop show declared kind/status, relation type, declaring subject and
availability. A `derived_from` hop carries an explicit “declared derivation /
inference, not proof” label. Do not infer additional provenance from a common
folder, wikilink, similarity or repeated citation.

Traversal is user-directed and bounded. Revisited IDs are shown as cycles,
not traversed indefinitely. Any depth/result limit is visible and can never
be presented as a complete evidence trail. Missing, ambiguous or inaccessible
references stop that branch visibly; they neither refute nor confirm a claim.

## 4. Timeline View Design

The conceptual reading sequence is:

```text
Artifact → Candidate → Review → Human Adoption → Active → Revision
```

This is a lifecycle explanation, not a promise that every object has all
six events. Artifact, review and adoption records are workflow artifacts,
not additional KO statuses or automatically created nodes. A review is a
recommendation; Human adoption requires its own recorded decision context.
A new revision creates another object, normally a candidate with a new ID.

The timeline has two distinguishable tracks:

1. **Objects:** current source-declared kind/status, `created_at`, `updated_at`,
   predecessor/successor and explicit revises/supersedes links.
2. **Recorded events:** existing origin, review, promotion and revision
   records, displayed only when explicitly referenced and available, with
   their actual target/revision/digest bindings where supplied.

The current KO schema supplies `created_from` and `promotion_record`, but not
an exhaustive event log or mandatory dedicated review-reference field. A
review may be reached through an explicit reference in a promotion/workflow
record. If no such reference exists, show “review event unavailable”; never
search by filename, proximity, role or date to manufacture the association.

`created_at` is a declared creation time. `updated_at` is the last recorded
metadata edit, not proof of every intervening status transition. Do not infer
an adoption date from it, file mtime, graph refresh time or current status.
Source timestamps may be displayed; no timestamp is added to the frozen graph
schema. Events with missing/invalid time go in an “undated” group. Ties use
stable IDs for display only, not implied causality; inconsistent temporal and
lineage declarations are shown rather than repaired.

A successor-to-predecessor `revises` relation expresses refinement. It does
not automatically invalidate the predecessor. `supersedes` expresses declared
replacement for active use, not deletion or proof of the successor. Keep all
historical objects visible in lineage traversal across status filters.
If successor, predecessor, relation and status declarations disagree, show
the disagreement; no “latest wins”, reciprocal link repair, status flip or
citation rewriting is allowed.

History preserves the basis of earlier reasoning and decisions. New content
belongs to a new object; the presentation layer neither overwrites the prior
content nor synthesizes a missing historical version from the current file.
The v1.1.1 simulated adoption must remain explicitly marked simulation when
used as an example; it must never render as a real Human decision.

## 5. Conflict View Design

A declared `A contradicts B` is shown as a pair with equal visual treatment:
ID, title, kind, lifecycle state, provenance and available source-declared
conditions on each side. “Scope” is displayed only if actually recorded in
accessible source material; it is not a new KO field or inferred summary.

One forward declaration suffices for a symmetric conflict reading. Preserve
its actual declaring subject and direction in the inspector. If both A → B
and B → A are declared, a view may group the pair, while listing both original
declarations. Grouping must not add a reverse edge to the stored projection.
Pair ordering uses IDs, not confidence, age, citation count or active status.

Conflict is a declared knowledge relationship, not a new lifecycle status or
proof that either claim is wrong. Missing endpoints appear as unresolved;
duplicate IDs appear as ambiguous diagnostics, with no selected substitute.
Historical or filtered endpoints must not silently hide the disagreement.

No winner, confidence, ranking, consensus, automatic resolution or proposed
synthesis is generated. A later Human-authored revision can be navigated as
recorded history; the view never infers that a conflict is resolved merely
because one side is archived, superseded or more recent. Existing dissent
remains available verbatim; the UI does not manufacture consensus text.

## 6. Dependency View Design

`Decision A depends_on Architecture Choice B` reads A (dependent) → B
(dependency). Kind labels are source-declared; the view does not require a
special new “architecture choice” kind. An inverse listing “What depends on
B?” is a read of existing edges, not another stored edge or relation type.

For revision impact inspection, show direct dependents first. An optional
bounded expansion may show transitively reachable objects with every
intermediate declared edge visible and the depth stated. Label this
“reachable through declared dependencies”, not “will break” or “invalid”.
There is no risk score, inferred dependency, automatic invalidation, rewrite
or notification workflow. Cycles and unresolved branches remain explicit.

A dependency marked superseded/archived can carry an informational
“dependency is historical; Human review may be needed” label. That label
does not change the dependent's status or establish that its content is
incorrect. Revision impact analysis is Human inspection of relationships;
decision tracing opens the actual cited objects and records.

## 7. Obsidian Integration Boundary

| Component | Responsibility | Must not do |
| --- | --- | --- |
| KO storage | Authoritative source-declared metadata/content and recorded references | Become automatically rewritten by a view |
| Semantic graph contract | Existing six typed relations and object-ID semantics | Absorb citations, folder relations, truth scores or guessed edges |
| Projection engine | Existing frontmatter-to-derived-artifact projection, including unresolved and duplicate diagnostics | Acquire UI, lifecycle decisions or provenance inference |
| Future presentation adapter | Read a snapshot, resolve explicit references, supply labeled source details and availability | Change projection/KO schema, write notes, mint objects or infer semantics |
| Future Obsidian views | Render, filter, inspect and navigate read-only data | Approve, execute, promote, resolve conflicts or become the source of truth |

The six relations remain supports, contradicts, derived_from, depends_on,
revises and supersedes. A predecessor/successor pointer can be displayed as
lineage metadata, but cannot create a typed graph edge absent its declaration.
The existing v0.4.4 file/body-assertion graph remains a separate layer; its
assertions, nodes and RDIndex readiness do not establish KO semantic readiness.
No implicit merge with Obsidian's native link graph is permitted.

### Read-only enrichment, not a second graph engine

The projection intentionally omits origin, provenance, citations, timestamps,
full validation and workflow events. A future adapter may retrieve those
fields from explicitly resolved source records through authorized read APIs.
This is detail presentation only: it must not rerun relation extraction with
a different parser, reconstruct excluded nodes or fill absent graph edges.

An object-ID resolver is scoped to the selected workspace and returns all
matching source locations or an explicit missing/ambiguous result. It must
not select the first file, most recent file, same-title file or another
workspace's object. Paths are navigation locations, not semantic identity.
Duplicate diagnostic paths are descriptive inputs, not permission to open
arbitrary files. Resolve within the selected workspace; inaccessible or
out-of-scope references stay unavailable. External URLs are displayed as
citations and opened only on explicit Human action, with no automatic fetch.

Displayed Markdown is untrusted content. It cannot trigger execution,
interpret approval instructions, load scripts or dispatch agents. Follow
Obsidian's safe rendering and explicit navigation boundaries. The presentation
API exposes no source write, relation edit, lifecycle edit, approval, Permit,
lease, Bridge or Mutation Gate execution capability.

### Snapshot freshness and consistency

The v1.2.1 artifact contains no source hashes, source revision token or build
time. Hashing the artifact identifies those artifact bytes only; it cannot
prove the current KO files match them. Do not invent “up to date” from a
successful JSON load or a plugin index refresh.

Render graph topology as one coherent snapshot. Source details loaded later
are labeled current-source reads, not necessarily details from that snapshot.
If fields disagree, show “source differs from projection” and retain each
value's origin; do not silently combine them into an apparently coherent view.
When alignment cannot be established, say “freshness unverified”. Missing,
malformed or unsupported artifacts produce an explicit unavailable state,
not an empty graph that suggests no knowledge exists.

A future provider may replace the whole snapshot through an existing,
explicitly arranged projection process. The presentation adapter's refresh
means re-read available data, not automatically spawn Python, mutate files,
install dependencies or invoke an Agent. Any local load time/cache token is
ephemeral presentation bookkeeping, outside the graph schema and not a source
event or portable identity. Duplicate paths may differ across hosts; this
design makes no cross-device byte-identity claim for diagnostic path strings.

## 8. Future v1.3.1 Implementation Preparation

The following names describe conceptual read contracts, not implemented APIs,
new persistent schemas or a promise of a particular TypeScript interface.
No files, dependencies or adapters are created by this design.

| Contract | Input | Read-only result and boundary |
| --- | --- | --- |
| Graph snapshot provider | Explicit logical workspace and configured artifact source | Existing graph artifact plus separate availability/schema/freshness state; unknown versions rejected without migration |
| Object resolver | Workspace + exact object_id | Unique authorized source location, missing, ambiguous or unavailable; never silent selection |
| KO detail reader | Resolved location and selected graph context | Source-declared origin, four provenance fields, references, lineage metadata and dates; field-level missing/empty/unavailable distinctions; no semantic extraction |
| Artifact reference reader | Explicit reference from an inspected source record | Available content and recorded binding, or missing/ambiguous/unavailable; artifact remains an artifact |
| Snapshot relation selector | Snapshot + object_id + one existing relation/direction | Existing edge rows, unresolved rows, declaring subject and diagnostics; inverse listings only, no new relations |
| Navigation host | Human-selected resolved local source or external citation | Explicit open/read action; never execution or a write permission grant |

Read results should distinguish `available`, `missing`, `ambiguous`,
`unavailable`, `invalid` and `not_loaded` as presentation states. These are
not KO lifecycle values. Unknown diagnostic types must remain inspectable
rather than disappearing. An identity ambiguity overrides source opening;
no convenient fallback can silently resolve it.

Review/adoption references are shown as records of assertions or decisions,
not executable authority. If a recorded digest can be compared with available
bytes, report consistency for that exact pair only. A mismatch is visible;
no automatic rebinding or repair. If the bound bytes are missing, binding is
unverified, not successful. An approval record is not a standing write permit.

### Future Agent Workspace compatibility

An explicitly selected workspace is the unit of read access and navigation.
Agents remain external: a future workspace consumer may inspect the same
read-only IDs, references and labeled views. No agent is started, assigned,
scheduled, approved or granted mutation permission by presentation. Research
artifacts and disagreements can be inspected without becoming KO nodes.
Any proposal, approval or execution workflow remains separate and requires
its existing authority path; this design neither authorizes nor implements it.

### Bounded future acceptance examples

These are implementation preparation criteria, not tests run in v1.3.0:

- An eligible node with incomplete provenance stays visible with missing
  fields and unestablished validation, without receiving a validity badge.
- A reference to evidence opens a labeled source detail, never a new node.
- A missing promotion/review record leaves a visible gap in the timeline;
  active status and updated_at do not fabricate the absent event.
- A revises edge retains the predecessor; an archived object remains reachable
  in history, even when an overview filter hides it.
- One contradiction declaration shows both sides and its original direction;
  reciprocal declarations are preserved if visually grouped.
- Duplicate identity remains diagnostic even without incoming edges; no copy
  is selected and missing/ambiguous endpoints are not synthesized.
- A changed source and old graph show their mismatch or unverified freshness;
  refresh does not mutate a KO or claim synchronization success.
- A cyclic dependency/provenance chain terminates visibly with bounded
  traversal, without resolving meaning or declaring content invalid.

The initial implementation may use simple panels and lists. This document
requires no force layout, new graph engine, background service, AI, database,
new schema, dependency installation or production deployment. v1.3.1 requires
a separate task; completing this document does not start implementation.

## 9. Design Validation and Stop Boundary

| Required question | Result | Design evidence |
| --- | --- | --- |
| Does presentation stay separate from knowledge truth? | PASS | §§1–2, 7: source declarations and Human interpretation, no scoring, validation or authority inferred from projection |
| Can a Human understand why an object exists? | PASS | §§2–4: origin, four labeled layers, explicit sources and recorded event references, with visible gaps |
| Are conflicts preserved rather than hidden? | PASS | §5: equal treatment, exact declarations and dissent, unresolved/historical endpoints retained |
| Is provenance visible? | PASS | §3 and §7: read-only source enrichment; artifacts and citations distinct from KO edges |
| Is automatic inference explicitly prohibited? | PASS | §§1, 3, 6–8: no extraction, semantic guesses, synthesized events or automatic decisions |
| Is the future implementation boundary clear? | PASS | §§7–8: frozen graph consumed; read contracts only; no write/approval/execution interfaces |

These are document-consistency checks, not runtime acceptance, security
certification, source-truth verification or evidence of Obsidian integration.
The only repository change for this phase is this design document. Plugin,
KO schema, graph schema, projection engine, Bridge, Mutation Gate, protocol,
Skills and dependencies remain unchanged. No production Vault is accessed.

DESIGN_VALIDATION=PASS
IMPLEMENTATION_CREATED=false
STOP_AFTER_DESIGN=true
