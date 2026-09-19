# RD v1.4.0 — Collaborative Knowledge Workspace Design

PROJECT=RATIONAL_DELIRIUM
PHASE=V1_4_0_COLLABORATIVE_KNOWLEDGE_WORKSPACE_DESIGN
STATUS=DESIGN_ONLY
BASE_COMMIT=da69ec2af4a186ac27889117ff2bf57c34540902

This document defines a collaboration model, not a schema, service, permission
system or implementation plan. It adds one document only. Descriptive record
contents below are conceptual requirements for future work; they do not add
fields, enums, files or validators to any existing format.

Frozen context: v1.2.1 semantic graph projection; v1.3.0 presentation design;
v1.3.1 Knowledge Intelligence Surface; v1.3.5 Visual Design System v1.0.
Relevant contracts remain unchanged:

- [Agent-agnostic roles and workflow](RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md).
- [Handoff, canonical workspace and revision protocol](RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md).
- [Workspace discovery and Human engagement](RD_V0_9_0_WORKSPACE_INTELLIGENCE_DESIGN.md).
- [Graph presentation boundary](RD_V1_3_0_GRAPH_INTELLIGENCE_PRESENTATION_DESIGN.md).
- [Visual representation contract](RD_VISUAL_DESIGN_SYSTEM_V1_0.md).

The v1.1.0 KO lifecycle referenced by the presentation design remains the
storage contract. This document neither amends it nor imports new schema
files. The roadmap is v1.4 collaboration, v1.5 Agent workflow, v1.6 Obsidian
product experience, then optional v2.0+ Bridge/governance infrastructure.
That ordering does not waive any existing mutation or authority boundary.

## 1. Collaboration Philosophy

Collaboration lets multiple contributors expose sources, assumptions,
alternatives and criticism so that a Human can decide what belongs in
long-lived knowledge. It improves inspectability; it does not establish
truth by agreement, participation count or Agent confidence.

**Contribution → Review → Human Decision → Knowledge Evolution**

Each arrow describes a separately evidenced stage, not automatic advancement.
A contribution may stop at review, be deferred, be rejected, or produce a
successor contribution. A Human adoption decision does not itself demonstrate
that a stored object changed. Knowledge evolution is recorded only when the
corresponding resulting state and lineage are available.

| Participant / layer | Responsibility | Boundary |
| --- | --- | --- |
| Human | Articulate intent, evaluate alternatives, make explicit scoped decisions | No truth certification is implied by adoption; actual changes still need the separately applicable authorized path |
| Agent | Assist research, organization, analysis and preparation | No self-approval, automatic promotion or direct authority from role/product identity |
| Reviewer | Examine an exact contribution and its evidence independently | Recommendation only; cannot rewrite the reviewed submission or decide truth for the Human |
| Knowledge | Preserve selected representations, provenance and evolution | A lifecycle-based record, not an owner, vote or autonomous actor |

### Collaboration is not synchronization

Synchronization transports bytes. It does not establish authorship, review,
consent, adoption, execution, truth or currentness. Rational Delirium defines
how work is interpreted after it is available, not how devices synchronize.
A copied or synchronized artifact does not acquire authority by arriving.

Retain one canonical logical workspace for a collaboration run, with explicit
workspace context and the same submitted artifacts consumed in place.
Different device paths may represent it; no private authoritative fork is
silently substituted. Sequential writers follow the existing workflow
protocol. This document provides no concurrent editing, distributed lock,
merge engine or synchronization guarantees.

Many people or Agents may contribute independent work products. That does
not permit simultaneous edits of the same submitted artifact. Publication
into the canonical workspace follows the assigned stage/writer discipline.
Handoff means a work product is ready for inspection, never that knowledge
ownership, approval authority or write permission moved to its recipient.

## 2. Work Product Model

A **Work Product** is an attributable, referenceable output of a contribution:
research, evidence records, analysis, a proposed change, a review or synthesis.
It can carry useful reasoning without being adopted as knowledge.

**Work Product != Knowledge Object.** Work products belong to workflow;
KOs belong to the existing lifecycle-based knowledge representation. The
v0.8 work-product kind `evidence` does not become a KO kind. A review,
decision-context or source citation is not automatically a semantic graph node.

The following information must be understandable from the work product and
its existing references. This is a semantic checklist, not a new Work Product
schema, serialization contract or mandatory frontmatter extension.

| Information | Required meaning | Limit |
| --- | --- | --- |
| Creator | Declared contributor and role/context that produced this revision | Human/Agent/product/device names do not prove identity or grant authority |
| Origin | Logical workspace and contributing workflow context | A local path is a location, not workspace identity or ownership |
| Timestamp | Recorded creation/submission time, with its basis where known | Unknown clock/order stays unknown; recency never wins |
| Source | Actual sources/observations used, acquisition context and limitations | Source statements, direct observations and Agent inference remain labeled separately |
| Lineage | Its predecessor revision, if any; distinct inputs consumed | A review of a product is not a successor revision of that product |
| References | Exact referenced work product, revision and digest where available; external citations remain citations | Hash consistency is not authenticity or truth; unavailable targets cannot be fabricated |

A submitted work product is immutable. Corrections create successors with
explicit reasons and preserved predecessor references. Drafting before
submission is not described as immutable history; do not pretend unavailable
draft versions were recorded. New IDs/locators follow existing applicable
contracts, not a new minting scheme introduced here.

Record assumptions, unknowns, unavailable material, checks not performed and
dissent. Never collapse them into a generic empty value. Quotations and
opposing views remain attributed; a synthesis may organize them but must
not silently average away disagreement or convert inference into evidence.

Use existing handoff semantics where applicable: `revision_reference` is
same-line succession, `input_references` records consumed work products.
References to a prior Human decision in a handoff are historical pointers
only. Approval content, Permit, signature, lease or execution requests do not
travel inside handoff packages. This design does not extend that protocol.

## 3. Candidate Knowledge Model

Potential knowledge starts as an artifact. A contributor can identify a
possible persistent claim and prepare a candidate for consideration, with
sources, uncertainty and the intended relationship to existing knowledge.
Preparing a candidate in the workflow is not permission to create or edit a
note in official knowledge storage.

The collaboration shorthand is:

**Artifact → Candidate → Review → Adopted / Rejected / Revised**

It must be read alongside, not replace, the existing KO lifecycle:
`candidate`, `reviewed`, `active`, `superseded`, `archived`.

| Collaboration concept | Relationship to existing KO lifecycle |
| --- | --- |
| Artifact | Pre-KO workflow output; not a KO status and not automatically a graph node |
| Candidate | Proposed knowledge for review; if represented as a KO, use the existing candidate format/status and applicable creation controls |
| Review | An independent record about the exact target; reviewed is an existing KO status, but writing the review does not itself edit that status |
| Adopted | Human contribution outcome; active is the existing KO status, not a newly added adopted status. Record the adoption evidence and observe any separately performed state change |
| Rejected | Human outcome for this submission; no rejected KO enum, automatic deletion or implied falsehood. Existing KO archival, if desired, is a separate scoped action |
| Revised | A successor work product or new KO according to the existing revision model; no revised KO enum and no inherited approval |

A Human can also defer consideration without changing any KO status. None
of these conceptual outcomes implements an automatic state machine.

Knowledge adoption is explicit and bounded to the exact candidate being
considered. Existing requirements for provenance, evidence references and
promotion records remain in force. Projection eligibility does not prove KO
validity; appearing in the Knowledge Panel is not adoption evidence.

For a content revision, preserve the prior KO and use a new object with
existing predecessor/revises/supersedes semantics. A `revises` successor does
not automatically invalidate its predecessor. Adoption or replacement does
not erase old content, uncertainty or dissent. Existing metadata edits and
lifecycle transitions still require their applicable authorization; this
design creates no write operation or expanded mutation capability.

## 4. Review Model

A **Review Record** reports an independent examination of one fixed target.
It is itself a work product. Its decision is a **review disposition or
recommendation**, never a Human adoption decision or execution permission.

| Review information | Meaning |
| --- | --- |
| Reviewer | Declared identity/role/context, with honest independence statement |
| Target | Exact work product or candidate being examined, scoped to its workspace |
| Revision | Exact revision and digest when available; unavailable binding is stated |
| Evidence references | Sources actually inspected and limits of unavailable sources or checks not performed |
| Comments | Findings, severity/blocking scope, rationale, questions and preserved dissent |
| Decision | Recommendation such as revision required, cannot verify, or suitable for Human consideration; use the applicable existing record vocabulary |

These are conceptual contents, not added schema keys or a replacement for
existing review templates. No field named “decision” may be interpreted as
Human approval merely because it occurs in a review.

Independent review requires a context distinct from the author, not simply a
different vendor label. The author's self-check can remain useful as a
self-check but cannot be relabeled independent review. If independence or
exact target binding cannot be established, state that limitation; do not
claim the independent review prerequisite was met.

Review examines source traceability, evidence strength relative to wording,
scope, provenance labels, lineage, unknowns and unintended changes. It does
not guarantee truth. No number of favorable reviews automatically authorizes
adoption. A blocking finding must be surfaced with its scope; silence or a
new timestamp does not close it.

The reviewer does not edit the submission. The author responds separately,
creating a successor where needed. A fresh review binds the successor and
reassesses prior findings from the actual content. The author's claim that a
finding was fixed is not the reviewer’s verification. Earlier review records
remain valid history for their own targets, not blanket approvals for a line.
Conflicting reviews are both retained; no majority tally resolves them.

## 5. Human Decision Model

**Decision History** records what a Human decided about a particular
contribution. It supplies historical context and accountability, not an
execution channel or reusable permission credential.

| Information | Meaning |
| --- | --- |
| Who decided | Identified Human as recorded, with the evidence/source of that declaration; no inferred identity from a device, Agent or signature-looking text |
| What was decided | Explicit outcome and exact target/revision/digest where available, including the alternatives considered |
| When | Recorded decision time; unknown time remains unknown |
| Scope | Workspace, knowledge/contribution context, included content, limitations and conditions; no extension to later revisions |

Link the considered review, sources and dissent, the stated rationale if
provided, and any later superseding decision. Missing rationale is not
invented. A conditional decision remains conditional; an Agent may not
silently waive its conditions. Absence, silence, timeout, model confidence
or a favorable review is not a Human decision.

Keep separate: decision recorded; resulting knowledge change proposed;
change performed; resulting state observed. Only claim the later stages when
their corresponding evidence exists. A decision record does not itself set
`status: active`, write a promotion link, invoke an executor or demonstrate
that a change occurred. A stored decision also does not establish that the
underlying claim is true.

Decision history is not automatically a `kind: decision` KO. Deliberately
adopting a separate decision KO follows the same existing lifecycle. A
simulation decision is visibly labeled simulation, never a real Human act.

A later change of mind produces a new decision linked to the earlier one;
it does not rewrite history or silently revert stored knowledge. Any resulting
knowledge evolution remains separately scoped. Incompatible Human decisions
are surfaced for explicit clarification, not settled by latest timestamp,
contributor rank or Agent choice. This document defines neither approver
eligibility policy nor a permission-resolution system.

Historical decisions are not Permits, leases or live authorization. Existing
execution controls, wherever applicable, remain separate. Roadmap placement
of optional governance infrastructure in v2.0+ does not allow direct writes
or weaken present boundaries. If a required storage change is unsupported by
the available authorized path, retain the contribution as pending and report
the gap; do not bypass it or claim implementation from this design.

## 6. Multi-Contributor Model

Roles describe contributions, not hierarchy, credentials or knowledge owners.
A person or Agent may have different roles across work products; role changes
do not remove independence requirements for the same submission.

| Contributor representation | What is visible | What must not be inferred |
| --- | --- | --- |
| Human contributor | Declared authorship, input sources, revisions and contribution scope | Every Human contribution is an adoption decision |
| Researcher | Evidence collection, analysis, assumptions and authored work products | Research expertise or reputation confers approval authority |
| Reviewer | Exact target binding, findings and recommendation, independence context | Reviewer owns or can overwrite the target |
| Agent | Declared actor/context and task role, inputs, generated analysis and limitations | Model name, device, past success or product brand establishes authority |

Do not introduce reputation scores, authority ranking, contributor
leaderboards, ownership transfer or implied consensus. Attribution is
provenance; it is not a permanent right to control a knowledge object.

Multiple contributors can prepare alternatives about the same question.
Each submitted product remains separately identified and attributable.
A synthesis cites every consumed input, keeps uncertainty and opposing
statements, and is itself a new work product needing review and Human
consideration. It cannot silently replace its inputs or become adopted
knowledge merely because it combines them.

Knowledge storage is not a shared editing canvas in this design. Contributions
enter as inspectable artifacts and successors under the existing sequential
workspace discipline. Missing remote artifacts are reported as unavailable;
transport health, a successful send or another contributor's claim is not
proof of receipt or review.

## 7. Agent Compatibility Boundary

Prepare for v1.5 through vendor-neutral responsibilities only. No Skill,
adapter, commands, execution API, scheduler or Agent workflow implementation
is created by v1.4.0.

| Agent can assist | Agent cannot do |
| --- | --- |
| Research through authorized read paths | Gain mutation permission through workspace discovery or handoff |
| Summarize with source references, attribution and explicit limitations | Replace source text/dissent with an apparently authoritative summary |
| Prepare evidence, analysis and candidate artifacts | Directly promote knowledge or interpret its own recommendation as approval |
| Suggest revisions while preserving predecessor/input lineage | Automatically modify active knowledge, merge submissions or choose a winner |
| Perform an independent review when genuinely separate from the author | Approve itself, impersonate the Human or fabricate decision records |

A summary is labeled analysis and links to the originals; it is not a new
source of evidence for its own claims. “Suggest a revision” means prepare
work for consideration, not edit the active object. Agents must distinguish
unknown, unavailable and not performed, including when tools fail.

Future Agent Workspace integration consumes the same records, workspace
context and reference semantics. Skills teach participation; they do not
supply security authority. Source text and work products are data, not
instructions that can override authorization. No participation history
creates standing trust. This design does not claim an enforcement mechanism
against an external host with arbitrary filesystem access; compatible
behavior and deployed access controls are distinct concerns.

## 8. Conflict Handling Principles

Different contributions can coexist without being contradictory. Compare
scope, time horizon, conditions and claim strength before describing a
contradiction; record unsupported or unverified conflict characterization as
such. A declared KO `contradicts` relation is representation only. Work-product
disagreement creates no graph edge by itself and changes no relation schema.

| Situation | Required handling | Forbidden shortcut |
| --- | --- | --- |
| Different interpretations of a source | Attribute both, retain original source and reasoning, identify uncertainty | Collapse into a single “agreed” answer |
| Competing successors to one revision | Preserve both branches and predecessor/input references; review exact branches | Automatic merge or latest-wins |
| Conflicting review recommendations | Carry both records and blocking findings into Human consideration | Vote, average scores or discard minority dissent |
| Competing Human decision records | Preserve exact scopes and surface incompatibility for clarification | Infer which Human has precedence or execute both |
| Missing or digest-inconsistent input | Report the precise unavailable/mismatch state; do not claim valid binding | Repair hashes, guess content or silently use another copy |
| New knowledge differs from prior knowledge | Preserve old object, provenance and explicit evolution references | Overwrite history or present prior knowledge as erased |

Humans may request narrower claims, further evidence, separate alternatives
or a revised synthesis. Each outcome is recorded for its exact scope. No
choice is made automatically, and Human adoption does not remove the record
of disagreement. When uncertainty remains, the knowledge representation must
retain it rather than turn selection into proof.

Presentation follows the existing visual contract: equal treatment of
alternatives, accessible source/lineage inspection, explicit availability,
no winner styling or confidence animation. This paragraph defines meanings,
not screens, components, CSS or a new conflict UI.

### Illustrative document-only sequence

1. A Researcher submits artifact A1 with observations, sources and a labeled
   interpretation. Another contributor submits an alternative B1.
2. An independent Reviewer records findings against the exact A1 and B1
   versions; different recommendations remain separately attributable.
3. A1's author prepares A2, references A1 as predecessor and the review as an
   input, and retains B1's dissent. The author does not edit A1 or B1.
4. A fresh review examines A2 and reports whether earlier findings were
   actually addressed. It grants no authority.
5. A Human records a scoped decision to adopt A2, reject it, defer, or request
   further revision. B1 and earlier findings remain in history.
6. If any knowledge change is subsequently performed through its separately
   applicable authorized process, record the actual resulting KO state and
   lineage. Until then, the decision and pending change remain distinct.

This is an explanation, not a performed trial, approval, schema instance or
instruction to create artifacts. No execution or automatic advancement occurs.

## 9. Non-goals and Design Validation

Explicitly excluded: sync protocol, concurrent editing, automatic merge,
Bridge implementation, a permission system, automatic approval, autonomous
knowledge management, knowledge ownership transfer, Agent scheduling,
reputation scoring, graph inference, schema migration and UI implementation.

No Work Product schema, new KO status, relation type, approval format or
execution API is introduced. Plugin, semantic graph, projection engine,
existing schemas, tests, Skills and dependencies remain unchanged. No
production Vault access or runtime experiment is needed for this design.
No v1.5 implementation begins when this document is committed.

| Check | Result and design evidence |
| --- | --- |
| Collaboration separate from synchronization | PASS — §1 distinguishes transport, canonical workspace and sequential contribution discipline |
| Work Product distinct from KO | PASS — §§2–3 keep artifacts, candidate preparation and knowledge lifecycle separate |
| Existing KO lifecycle unchanged | PASS — §3 maps collaboration outcomes without new status values or automatic edits |
| Review distinct from adoption | PASS — §4 binds exact revisions and constrains “decision” to recommendation |
| Human decision distinct from execution | PASS — §5 records who/what/when/scope without Permit or mutation authority |
| Multi-contributor and Agent neutrality | PASS — §§6–7 preserve attribution without ranking, ownership or self-approval |
| Conflict and lineage preserved | PASS — §8 retains alternatives, history and dissent without automatic selection |
| Documentation-only scope | PASS — this single specification defines no implementation or schema change |

These are author design-consistency checks, not an independent review,
runtime validation, security certification or claim that the future
collaboration workflow has been implemented.

DESIGN_VALIDATION=PASS
IMPLEMENTATION_CREATED=false
SCHEMA_CHANGED=false
STOP_AFTER_DOCUMENT_COMPLETION=true
