# RD v1.5.0 — Agent Knowledge Workflow Design

PROJECT=RATIONAL_DELIRIUM
PHASE=V1_5_0_AGENT_KNOWLEDGE_WORKFLOW_DESIGN
STATUS=DESIGN_ONLY
BASE_COMMIT=4b9c725dd2017e11e205d6522b1a03e8d1a99d5e

This document defines how external AI Agents participate in Human-governed
knowledge evolution. It creates no Agent runtime, Skill, schema, permission,
UI or implementation. Conceptual record attributes and stage names below
are explanatory contracts, not new serialized fields or lifecycle enums.

Frozen foundations remain unchanged: v1.2.1 Semantic Graph Projection,
v1.3.0 Graph Intelligence Presentation Design, v1.3.1 Knowledge Intelligence
Surface, v1.3.5 Visual Design System and v1.4.0 Collaborative Knowledge
Workspace Design. Principal references:

- [Agent-agnostic workflow](RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md).
- [v0.8 handoff and revision protocol](RD_V0_8_MULTI_DEVICE_AGENT_HANDOFF_PROTOCOL_DESIGN.md).
- [v1.3.0 presentation boundary](RD_V1_3_0_GRAPH_INTELLIGENCE_PRESENTATION_DESIGN.md).
- [Visual Design System](RD_VISUAL_DESIGN_SYSTEM_V1_0.md).
- [v1.4.0 collaboration model](RD_V1_4_0_COLLABORATIVE_KNOWLEDGE_WORKSPACE_DESIGN.md).

Current repository research, synthesis, review and handoff Skill instructions
inform compatibility. They remain unchanged behavior guidance, never a source
of security authority. This design does not replace their protocol contracts.

## 1. Agent Philosophy

Agents extend a Human's capacity to collect information, compare explanations,
organize evidence and inspect alternatives. They assist research, analysis
and synthesis. They are not knowledge owners, final decision makers or
autonomous knowledge managers. **Human remains final authority.**

The core flow is:

**Research → Work Product → Review → Human Decision → Knowledge Object Evolution**

An arrow represents a separately evidenced stage, not permission for an
Agent to run the next step. Agent-generated text is not directly generated
knowledge. It begins as an attributed contribution, retaining its origin,
uncertainty and limitations. The Human decides whether and how a reviewed
contribution should affect persistent knowledge.

Assistance supplies observations, interpretations, questions and proposed
changes. Authority decides an exact scoped outcome. A confident answer,
favorable review, repeated use or multi-Agent agreement cannot bridge that
difference. Nor does Human adoption establish objective truth: adopted
knowledge remains a sourced, revisable representation.

Agents are external hosts participating in a protocol, not processes hosted
or managed by Rational Delirium. A role is a capability description, not a
model identity or verified executor credential. Participation creates no
standing permission over a workspace or Knowledge Object (KO).

## 2. Agent Role Model

| Role | Purpose and permissible contribution | Boundary |
| --- | --- | --- |
| Research Agent | Collect information through authorized reads, organize sources, record observations and produce research artifacts | No fabricated sources, inferred acquisition facts, direct adoption or unrequested scope expansion |
| Analysis Agent | Compare claims, conditions and alternatives; identify explicitly labeled relationship hypotheses; produce analytical work products | Proposed relationships stay in analysis; no silent frontmatter edit, graph edge creation or conversion of inference into evidence |
| Synthesis Agent | Combine exact reviewed materials into a new structured draft while retaining source attribution, assumptions and dissent | Inputs' reviews do not review the synthesis; combining material grants no authority, introduces no new source evidence and resolves no disagreement automatically |
| Review Assistant | Help a Human inspect evidence, inconsistencies, missing context and possible unintended changes | Assistance is not a Human decision and is not automatically an independent review record |

A Review Assistant can act as an independent Review Agent only when the
existing context-separation and exact-target requirements are met and
explicitly declared. An author's second pass remains a self-check, even
with a different role prompt. Vendor changes alone do not prove independence;
the same vendor does not preclude it. If independence cannot be established,
record the limitation and leave the independent review prerequisite unmet.

Roles may be performed in separate tasks or combined where compatible, but
role switching cannot erase authorship or create independence. No role has
permission to approve itself, promote a candidate, edit active knowledge or
invoke a mutation merely by being named. Executor identity, if involved in
a separately authorized later process, is distinct from all these roles.

Synthesis may list unavailable or unreviewed inputs for transparency, but
must not claim they were reviewed. If the chosen task requires reviewed
inputs, that condition must be met or reported unmet. A synthesis that cannot
preserve conflicting claims honestly may report that it cannot synthesize.

## 3. Agent Work Product Model

**Agent output first becomes a Work Product, not a Knowledge Object.**
It may be research, source material, analysis, synthesis, review or a proposed
change. Its primary semantic function determines its classification; merely
citing evidence does not make a recommendation or inference evidence.

The following are conceptual attributes carried in the existing artifact
and reference conventions. They are not a new Work Product schema.

| Attribute | Required meaning |
| --- | --- |
| Creator | Declared contributor and role that authored the submitted revision; preserve separate attributions for multiple inputs |
| Agent identity | Declared host/session/context, with product/model only as metadata; explicitly not identity proof or approval authority |
| Task context | Human-assigned question, purpose, scope, logical workspace and applicable constraints; discovery of a workspace is not authorization |
| Timestamp | Recorded creation/observation/submission time as available; distinguish producer declaration from independently observed time |
| Sources | Actual source references, inspected excerpts or artifacts, acquisition context and limitations; label inaccessible originals |
| Evidence references | Claim-to-observation/source mapping with exact references; not a list of links used to imply support for every claim |
| Lineage | Same-line predecessor revision separately from independent inputs consumed; retain reasons for revision |
| Related objects | Workspace-scoped exact KO IDs/revisions observed, with hashes where available; contextual pointers, not new semantic graph relations |

Keep assumptions, unknown values, unavailable material, checks not performed
and dissent explicit. Hashes must come from actual available objects; a
matching hash establishes byte consistency of the covered pair, not source
authenticity or correctness. A missing exact binding cannot be fabricated
from a title, file timestamp or remembered result.

Once submitted, retain the exact work product. Corrections are new successors;
do not edit what a review already binds. Unsubmitted drafts may change, but
must not be presented as a preserved history if earlier bytes were not saved.
Workflow artifacts, evidence pointers and Agent outputs do not become graph
nodes merely by being present in the workspace.

Agent outputs are derived contributions, not authoritative knowledge. This
does **not** mean they are disposable graph caches or deterministically
regenerable: source observations, submitted text and their review bindings
must be preserved. Rerunning an Agent is a new output, not recovery of the
original bytes. UI/graph views are derived state and confer no authority.

## 4. Agent Workflow Lifecycle

The following is a reading model, not a scheduler or an automatic state
machine:

**Agent Task → Research Output → Work Product → Candidate Knowledge → Human Review → Decision → Knowledge Adoption**

| Stage | Evidence/output | Boundary before advancing |
| --- | --- | --- |
| Agent Task | Explicit question, scope, allowed context and intended deliverable | A request to research does not authorize adoption, official note creation or mutation |
| Research Output | Attributed observations, source material and labeled analysis | Separate what was inspected from what was inferred or unavailable |
| Work Product | Submitted exact artifact with references and lineage | Preserve bytes for review; packaging does not certify quality |
| Candidate Knowledge | Proposed persistent representation or revision, with scope, evidence and uncertainties | Candidate preparation in workflow is not permission to write a KO into official storage |
| Human Review | Human inspection aided by available independent review records and exact candidate/context | Assistant checks cannot impersonate Human inspection or satisfy independent review by assumption |
| Decision | Explicit scoped Human outcome, with who/what/when/scope and considered references | Recommendation, silence and elapsed time are not decisions; a decision record is not execution permission |
| Knowledge Adoption | Evidence of the actual resulting KO state and provenance/lineage following the separately applicable authorized process | Decision recorded, change performed and state observed remain separate claims |

Independent review of the exact submitted candidate/work product supplies
findings before Human decision, under the existing v1.4/v0.8 requirements.
The abbreviated lifecycle does not skip that prerequisite. Human Review is
the Human consideration stage; it is not merely a Review Assistant's output.
A source or candidate change after review requires a successor and fresh
review, not a carried-forward recommendation against different bytes.

The KO lifecycle stays `candidate`, `reviewed`, `active`, `superseded`,
`archived`. Research, decision, adopted, rejected and revised are not new KO
statuses. An Agent can prepare a candidate proposal, but cannot make a
candidate active by setting a field or producing a favorable review. Any
status edit remains subject to its existing authorized workflow.

A lifecycle can stop early: no usable sources, incomplete binding, revision
requested, Human rejection, deferral or further research. None is permission
to improvise a write path. When a desired storage operation is unsupported
by the available authorized process, retain the contribution as pending and
report the limitation; do not broaden mutation capabilities.

## 5. Agent Handoff Model

Reuse the v0.8 principle: **Agents transfer work results, never permissions.**
A handoff supplies task context, evidence references, assumptions, unknowns,
dissent and exact work lineage. It does not provide execution authority,
permission transfer, ownership transfer or automatic invocation of a host.

- Consume submitted artifacts in the canonical logical workspace. Physical
  device paths may differ; transport neither authenticates nor authorizes.
- Record one exact primary work product using the existing handoff contract.
  `handoff_type` and work-product kind are separate concepts, not mechanically
  interchangeable. This design adds no type, kind or field.
- Use `revision_reference` for same-line succession and `input_references`
  for independent consumed products. A review is an input to revision, not
  the research product's predecessor.
- Preserve source mapping and dissent through every hop. Empty declarations
  must mean none declared, not data omitted for convenience.
- Check referenced bytes where available. On mismatch, report and refuse to
  build on the inconsistent binding; do not repair the digest and continue.
  If an input is unavailable, declare that limit rather than invent receipt.
- Handoff may point to historical decision records as context only. It must
  not carry approval content, Permit, signature, lease, mutation permission
  or an execution request. `decision-context` assembles information for a
  Human moment; it does not contain the Human decision or initiate execution.

Submission readiness, transport completion and recipient receipt are separate
observations. A handoff becoming visible does not prove it was inspected.
Follow sequential writer discipline for shared submitted artifacts; no new
synchronization protocol, copying workflow, coordinator or distributed lock
is introduced here.

## 6. Multi-Agent Workflow

A possible sequence is Research Agent → Analysis Agent → Review Agent →
Human Decision. Synthesis can be inserted when the assigned task requires
combining reviewed inputs. The sequence is illustrative; it does not spawn,
schedule, dispatch or automatically advance any Agent.

For example, Research submits R1 containing two attributed source claims.
Analysis submits A1 identifying their differing conditions and a proposed
interpretation, citing R1 as input. An independent Reviewer examines A1's
exact revision and source basis, recording limits and findings. The Human
considers that package and any alternatives. No Agent promotes A1 to knowledge.

Multiple research or analysis products remain individually attributable.
Agreement does not add evidence strength by arithmetic; repeated reliance on
the same source must stay traceable rather than appear as independent
corroboration. No voting, reputation score, model ranking, consensus threshold
or “most recent Agent wins” exists. Agents cannot collectively create authority.

A synthesis is a new product with its own assumptions and full input lineage.
Even unanimously reviewed inputs do not automatically validate its conclusions.
If the synthesis introduces new interpretation, label it inference; do not
invent a new observation or erase the inputs' uncertainty. The synthesis needs
its own review before Human consideration under the same collaboration rules.

## 7. Evidence and Provenance Integration

Agent output → evidence references → knowledge provenance describes
traceability, not automatic promotion. Only the source-material/observation
portion of an Agent contribution qualifies as evidence in the existing sense.
Agent reasoning is not evidence merely because it cites evidence. An
Agent-generated summary is not source truth.

| Layer | What must be retained | Prohibited upgrade |
| --- | --- | --- |
| Observation | What was directly observed, by what means, in which context and with what limits | An interpretation presented as a measurement or direct observation |
| Evidence | Attributed source statements, excerpts, recorded state and acquisition limitations | A citation or Agent assertion presented as verification of the source's truth |
| Inference | Reasoning, assumptions, alternative explanations and the inputs it uses | Reasoning laundered into evidence through another Agent's summary |
| Conclusion | A scoped stated understanding with supporting/conflicting references and unresolved limits | A proposed or adopted conclusion presented as proven truth |

A faithful source summary remains labeled and linked to its source. New
interpretation belongs under Inference. When originality or acquisition is
unverifiable, say so. “Not performed”, “unavailable” and “unknown” retain their
different meanings at review, synthesis and Human consideration.

Related-object suggestions are analytical statements until explicitly
considered and, if appropriate, recorded by the existing authorized process.
No Agent silently creates `supports`, `contradicts`, `derived_from`,
`depends_on`, `revises` or `supersedes` metadata. The projection continues to
read declared relations only; body links, textual similarity and an Agent's
assertion do not create graph edges. Evidence/artifact citations stay outside
KO node identity unless a separate KO is deliberately created through its
existing lifecycle; no automatic promotion to `kind: reference` occurs.

Any eventual adopted representation must preserve the contribution's origin,
claim-to-source mapping, lineage, uncertainty and dissent in the existing
applicable records. This design does not add provenance keys or require a
new persistent graph. Presentation may expose declared information but cannot
supply missing evidence or establish validity by displaying it.

## 8. Human Decision Boundary

Human authority enters at task scoping and, distinctly, at the explicit
knowledge decision after inspection of the exact contribution and review.
Task assignment authorizes only its stated assistance scope. It is not
preapproval of whatever knowledge the Agent later proposes.

| Human action | Meaning | What does not happen automatically |
| --- | --- | --- |
| Adopt | Choose a specific candidate/revision and scope for incorporation under the applicable process | KO activation, mutation execution or truth certification |
| Revise | Request a scoped successor or narrower claim | Silent editing of the submitted product or active KO |
| Reject | Decline the specific submission | Deletion, global invalidation of its claims or erasure of dissent |
| Request further research | Define additional inquiry and its limits | Open-ended Agent scheduling or expanded write authority |

Decision history records the Human, exact target, time, scope and considered
references, with unavailable values explicit. It is historical context, not
a Permit, signature, lease or reusable execution authorization. A conditional
decision stays conditional; an Agent cannot waive it or infer satisfaction
from confidence. A changed target, scope or revision needs fresh consideration.

Agents cannot promote or approve themselves, simulate a real Human decision,
or automatically modify active knowledge. A simulation is labeled as such
and cannot satisfy the real decision boundary. If no explicit decision is
available, record that absence and stop advancement; silence, timeout and
repeated favorable recommendations never become approval.

Record separately what was proposed, reviewed, decided, actually changed and
subsequently observed. A positive decision without an observed change remains
exactly that. Existing mutation controls remain applicable; optional future
v2.0+ infrastructure does not authorize bypasses now. If an execution outcome
from a separately authorized task is uncertain, preserve uncertainty and do
not retry automatically or assert that no write occurred. This design invokes
no execution path and adds no operational recovery or permission system.

## 9. Conflict and Revision Handling

Preserve alternatives, expose differences and retain lineage. Differing
scope, conditions or time horizons do not establish contradiction by
themselves. Agents may describe a possible disagreement with supporting
references; they must not silently decide its semantic relationship or truth.

| Situation | Required handling |
| --- | --- |
| Agents produce incompatible interpretations | Keep both attributed products, sources, assumptions and exact dissent; surface unresolved differences to review/Human consideration |
| Review requests changes | Author creates a successor, responds to findings and preserves the reviewed bytes; reviewer freshly reassesses the successor |
| Two successors reference one predecessor | Retain both branches; no merge, latest-wins or inherited decision |
| Reviewed input later changes | Keep the original binding; new input/output versions require fresh assessment rather than silently rebinding |
| Source is unavailable or a digest mismatches | Report the precise limitation; do not invent source content, fix references silently or claim successful verification |
| Human decisions appear incompatible | Preserve scope and history and request clarification; Agents do not rank Humans or choose by timestamp |

Revision is not ownership transfer. A new work-product revision does not
edit another contributor's product; a knowledge content revision follows the
existing new-object and predecessor/revises/supersedes conventions. Previous
knowledge and prior decisions remain inspectable. `revises` does not by itself
make its predecessor invalid, and `supersedes` does not prove the replacement.

No agent ranking, truth score, automatic winner selection or silent synthesis
of consensus is allowed. Even when the Human chooses one representation,
the disagreement remains historical evidence of the decision context, not
material to delete. A correction records what changed and why, not a rewritten
account of what the earlier contributor said.

## 10. Relationship With v1.4 Collaboration

v1.4 defines Human and contributor collaboration. v1.5 defines how Agent
assistance fits inside it; it does not replace the collaboration model.

| v1.4 contract | v1.5 specialization without expansion of authority |
| --- | --- |
| Attributed Work Products distinct from KOs | Agent identity/context, task scope and reasoning labels made explicit |
| Independent exact-target review | Review Assistant distinguished from genuine independent Review Agent |
| Human decision history | Agent task assignment separated from adoption decision; no fake approval |
| Preserved alternatives and lineage | Multi-Agent synthesis/revision retains all inputs and dissent |
| Canonical workspace, sequential writers | Agents exchange existing handoffs, not permissions or shared editing authority |
| Separate decision, change and observation | Agent reports retain evidence boundaries and uncertain outcomes |

The protocol remains authoritative. Future Skills may teach role behavior,
source collection, drafting and review; they cannot change authorization or
schema semantics. No Skill package or vendor adapter is created here.

v1.3.0/v1.3.1 read-only presentation and v1.3.5 visual rules continue to apply:
Agent work products and declared identities can be inspected without trust
badges, truth ranking, automatic activation or runtime dispatch. Future v1.6
product experience is a separate task; this document designs no screens or
plugin integrations.

## 11. Non-goals and Validation

Excluded: autonomous knowledge management, automatic Vault organization,
AI replacing Human judgment, Agent-owned knowledge bases, automatic truth
determination, Bridge implementation, synchronization systems, permission
infrastructure, Agent schedulers, model-calling services, automatic relation
extraction, new mutation types, schema changes and UI implementation.

This document asserts workflow obligations, not a new runtime enforcement
mechanism. An external Agent host's filesystem capabilities are a deployment
concern; naming a role or writing instructions does not enforce access control.
No claim of malicious-host resistance or cryptographic Agent identity is made.

| Design check | Result and evidence |
| --- | --- |
| Human final authority | PASS — §§1, 4, 8 distinguish assistance, scoped decision and actual change |
| Output remains a Work Product first | PASS — §3 separates contributions from adopted KOs and preserves exact submitted artifacts |
| Roles do not grant authority | PASS — §2 distinguishes capability, independence, declared identity and executor identity |
| Handoff transfers no permissions | PASS — §5 reuses existing protocol without new fields/types or execution initiation |
| Evidence/provenance preserved | PASS — §7 separates all four layers and prevents reasoning/source laundering |
| Unknowns and conflicts retained | PASS — §§3, 6, 7, 9 preserve limitations, alternatives, findings and lineage |
| No hidden semantic inference | PASS — §§2, 7 prohibit suggested relationships from silently becoming graph edges |
| v1.4 and KO lifecycle unchanged | PASS — §§4, 10 specialize collaboration without new statuses or automatic transitions |
| Documentation-only boundary | PASS — one new design document; no runtime, schema, Skill, UI or implementation created |

These are author design-consistency checks, not independent review, runtime
acceptance or evidence of implemented Agent workflows. No production Vault,
model execution experiment or knowledge mutation is involved.

DESIGN_VALIDATION=PASS
IMPLEMENTATION_STARTED=false
SCHEMA_CHANGED=false
RUNTIME_CHANGED=false
STOP_AFTER_DOCUMENT_COMPLETION=true
